import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Album, Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Print from 'expo-print';
import type { SQLiteDatabase } from 'expo-sqlite';
import { PDFDocument } from 'pdf-lib';
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

// Bitta rasm uchun bitta A4 sahifa. Rasm qotirilgan (position: fixed) maydonda turadi, shuning uchun
// hujjat oqimida hech narsa yo'q va u keyingi sahifaga o'tib keta olmaydi. Atrofidagi chegara sahifalarni
// aniq ajratadi va rasm chetlari kesilmaydi. O'lcham mm'da: Android chop etishda CSS px PDF nuqtasiga teng emas.
function buildPageHtml(b64: string, filter: ScanFilter) {
  return `<!doctype html><html><head><meta charset="utf-8" /><style>
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; }
    .page { position: fixed; top: 6mm; right: 6mm; bottom: 6mm; left: 6mm;
            display: flex; align-items: center; justify-content: center; }
    img { max-width: 100%; max-height: 100%; width: 100%; height: 100%; object-fit: contain;
          filter: ${FILTER_CSS[filter]}; }
  </style></head><body><div class="page"><img src="data:image/jpeg;base64,${b64}" /></div></body></html>`;
}

// Har sahifa alohida chop etiladi va faqat birinchi sahifasi olinadi, keyin hammasi bitta PDF'ga yig'iladi.
// Bitta HTML'da hamma sahifani chop etganda rasmlar bir-birining sahifasiga o'tib ketardi.
async function printScanPdf(pages: ScanPage[], filter: ScanFilter) {
  const out = await PDFDocument.create();
  // Ketma-ket: bir vaqtda ko'p katta rasm ochilsa, xotira yetmasligi mumkin.
  for (const page of pages) {
    const { uri } = await Print.printToFileAsync({
      html: buildPageHtml(await pageToBase64(page), filter),
      width: A4.width,
      height: A4.height,
    });
    const single = new File(uri);
    const src = await PDFDocument.load(await single.bytes());
    const [copied] = await out.copyPages(src, [0]);
    out.addPage(copied);
    single.delete();
  }
  const file = new File(Paths.cache, `${Date.now()}-scan.pdf`);
  await file.write(await out.save());
  return file;
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
