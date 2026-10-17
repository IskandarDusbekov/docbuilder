import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Album, Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Print from 'expo-print';
import type { SQLiteDatabase } from 'expo-sqlite';
import PdfThumbnail from 'react-native-pdf-thumbnail';

import { addPdfDocument } from './storage';

export type ScanFilter = 'original' | 'bw' | 'gray';

export type ScanPage = {
  key: string;
  uri: string;
  rotation: number;
};

// Bir xil CSS qatori ham ekrandagi ko'rinishga (RN `filter`), ham PDF'ga (expo-print HTML) beriladi.
export const FILTER_CSS: Record<ScanFilter, string> = {
  original: 'none',
  gray: 'grayscale(1)',
  bw: 'grayscale(1) contrast(1.8) brightness(1.1)',
};

// Skaner ekranidan saqlash ekraniga o'tadigan qoralama. Faqat xotirada turadi.
let draft: { pages: ScanPage[]; filter: ScanFilter } = { pages: [], filter: 'original' };

export const scanDraft = {
  get: () => draft,
  set: (pages: ScanPage[], filter: ScanFilter) => {
    draft = { pages, filter };
  },
  clear: () => {
    for (const p of draft.pages) {
      try {
        new File(p.uri).delete();
      } catch {
        // Kesh fayli allaqachon o'chgan bo'lishi mumkin.
      }
    }
    draft = { pages: [], filter: 'original' };
  },
};

// A4, PostScript nuqtalarida.
const A4 = { width: 595, height: 842 };
// Taxminan 200 dpi: matn aniq o'qiladi, fayl esa haddan tashqari kattalashmaydi.
const MAX_IMAGE_WIDTH = 1654;

async function pageToBase64(page: ScanPage) {
  const ctx = ImageManipulator.manipulate(page.uri);
  if (page.rotation) ctx.rotate(page.rotation);
  let image = await ctx.renderAsync();
  if (image.width > MAX_IMAGE_WIDTH) {
    image = await ImageManipulator.manipulate(image).resize({ width: MAX_IMAGE_WIDTH }).renderAsync();
  }
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  return saved.base64 ?? '';
}

// Har rasm alohida A4 sahifa, markazda va sahifani to'liq egallab (nisbat saqlanadi).
// O'lcham millimetrda: Android chop etishda CSS piksel PDF nuqtasiga teng emas, px'da rasm burchakka siqilib qoladi.
// Balandlik biroz kam: yaxlitlash tufayli bo'sh sahifa qo'shilib qolmasin.
function buildHtml(images: string[], filter: ScanFilter) {
  const pages = images
    .map((b64) => `<div class="page"><img src="data:image/jpeg;base64,${b64}" /></div>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8" /><style>
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; }
    .page { width: 210mm; height: 296.5mm; display: flex; align-items: center;
            justify-content: center; overflow: hidden; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    img { width: 100%; height: 100%; object-fit: contain; filter: ${FILTER_CSS[filter]}; }
  </style></head><body>${pages}</body></html>`;
}

async function printScanPdf(pages: ScanPage[], filter: ScanFilter) {
  // Ketma-ket: bir vaqtda ko'p katta rasm ochilsa, xotira yetmasligi mumkin.
  const images: string[] = [];
  for (const page of pages) images.push(await pageToBase64(page));

  const { uri } = await Print.printToFileAsync({
    html: buildHtml(images, filter),
    width: A4.width,
    height: A4.height,
    margins: { left: 0, right: 0, top: 0, bottom: 0 },
  });
  return new File(uri);
}

export async function createScanDocument(
  db: SQLiteDatabase,
  input: { title: string; folderId: string | null; pages: ScanPage[]; filter: ScanFilter }
) {
  return addPdfDocument(db, {
    source: await printScanPdf(input.pages, input.filter),
    transfer: 'move',
    title: input.title,
    folderId: input.folderId,
    pageCount: input.pages.length,
  });
}

const ALBUM = 'DocBuilder';
// Galereya uchun asl sifatga yaqin, lekin juda katta bo'lmagan o'lcham (~300 dpi A4).
const GALLERY_WIDTH = 2480;

// Har sahifa uchun burish va filtr qo'llangan JPEG.
async function renderScanImages(pages: ScanPage[], filter: ScanFilter): Promise<File[]> {
  if (filter === 'original') {
    const files: File[] = [];
    for (const page of pages) {
      const ctx = ImageManipulator.manipulate(page.uri);
      if (page.rotation) ctx.rotate(page.rotation);
      let image = await ctx.renderAsync();
      if (image.width > GALLERY_WIDTH) {
        image = await ImageManipulator.manipulate(image).resize({ width: GALLERY_WIDTH }).renderAsync();
      }
      files.push(new File((await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 })).uri));
    }
    return files;
  }
  // Filtr faqat CSS orqali beriladi (manipulatorda kulrang/kontrast yo'q), shuning uchun vaqtinchalik
  // PDF yasab, sahifalarini rasmga aylantiramiz.
  const pdf = await printScanPdf(pages, filter);
  try {
    const rendered = await PdfThumbnail.generateAllPages(pdf.uri, { quality: 90, maxWidth: GALLERY_WIDTH });
    return rendered.map((r) => new File(r.uri));
  } finally {
    pdf.delete();
  }
}

// Sahifalarni telefon galereyasidagi "DocBuilder" albomiga saqlaydi. Ilova kutubxonasiga qo'shilmaydi.
export async function saveScanToGallery(input: { title: string; pages: ScanPage[]; filter: ScanFilter }) {
  const permission = await requestPermissionsAsync(true);
  if (!permission.granted) throw new Error('Galereyaga saqlash uchun ruxsat berilmadi');

  const images = await renderScanImages(input.pages, input.filter);
  const dir = new Directory(Paths.cache, 'gallery');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });
  const safeName = input.title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Skan';

  let album = await Album.get(ALBUM);
  for (const [i, image] of images.entries()) {
    // Fayl nomi galereyada ko'rinadi.
    const named = new File(dir, images.length > 1 ? `${safeName} - ${i + 1}.jpg` : `${safeName}.jpg`);
    await image.move(named);
    const asset = await Asset.create(named.uri, album ?? undefined);
    if (!album) album = await Album.create(ALBUM, [asset], true);
  }
  dir.delete();
  return images.length;
}
