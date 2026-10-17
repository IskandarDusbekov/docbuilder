import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { degrees, LineCapStyle, PDFDocument, rgb } from 'pdf-lib';
import PdfThumbnail from 'react-native-pdf-thumbnail';

import type { Document } from '@/db';

import { addPdfBytes, appFile, replaceDocumentPdf } from './storage';

async function loadPdf(doc: Document) {
  const bytes = await appFile(doc.file_path).bytes();
  try {
    return await PDFDocument.load(bytes);
  } catch (e) {
    if (e instanceof Error && /encrypt/i.test(e.message)) throw new Error('Parol bilan himoyalangan PDF tahrirlanmaydi');
    throw e;
  }
}

// Tanlangan tartibda bir nechta PDF'dan bitta yangi hujjat.
export async function mergeDocuments(db: SQLiteDatabase, docs: Document[], title: string) {
  const out = await PDFDocument.create();
  for (const doc of docs) {
    const src = await loadPdf(doc);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return addPdfBytes(db, await out.save(), { title, pageCount: out.getPageCount() });
}

export type PageEdit = {
  // Asl hujjatdagi 0 dan boshlanadigan tartib raqami.
  index: number;
  // Qo'shimcha burish, 90 ga karrali.
  rotation: number;
};

async function buildFromPages(doc: Document, pages: PageEdit[]) {
  const src = await loadPdf(doc);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    pages.map((p) => p.index)
  );
  copied.forEach((page, i) => {
    const extra = pages[i].rotation;
    if (extra) page.setRotation(degrees((page.getRotation().angle + extra) % 360));
    out.addPage(page);
  });
  return out;
}

// Sahifalarni burish, o'chirish va tartibini o'zgartirish: hujjatning o'zi yangilanadi.
export async function rewriteDocument(db: SQLiteDatabase, doc: Document, pages: PageEdit[]) {
  if (pages.length === 0) throw new Error("Hujjatda kamida bitta sahifa qolishi kerak");
  const out = await buildFromPages(doc, pages);
  await replaceDocumentPdf(db, doc, await out.save(), out.getPageCount());
}

// Tanlangan sahifalardan alohida yangi hujjat.
export async function extractPages(db: SQLiteDatabase, doc: Document, pages: PageEdit[], title: string) {
  const out = await buildFromPages(doc, pages);
  return addPdfBytes(db, await out.save(), { title, folderId: doc.folder_id, pageCount: out.getPageCount() });
}

export async function getPageSizes(doc: Document) {
  const pdf = await loadPdf(doc);
  return pdf.getPages().map((p) => ({ ...p.getSize(), rotation: p.getRotation().angle }));
}

export type SignaturePlacement = {
  pageIndex: number;
  // Imzo chizilgan maydondagi SVG yo'l va o'sha maydonning kengligi.
  path: string;
  padWidth: number;
  strokeWidth: number;
  // Sahifaga nisbatan 0..1 ulushlarda: imzoning chap yuqori burchagi va kengligi.
  x: number;
  y: number;
  width: number;
};

export const SIGNATURE_COLOR = { r: 0.05, g: 0.1, b: 0.45 };

// Imzo vektor ko'rinishda qo'yiladi, shuning uchun kattalashtirganda xiralashmaydi. Natija yangi hujjat bo'ladi.
export async function signDocument(db: SQLiteDatabase, doc: Document, s: SignaturePlacement) {
  const pdf = await loadPdf(doc);
  const page = pdf.getPage(s.pageIndex);
  const { width: pw, height: ph } = page.getSize();
  const scale = (s.width * pw) / s.padWidth;
  page.drawSvgPath(s.path, {
    x: s.x * pw,
    // pdf-lib'da y pastdan yuqoriga o'sadi, SVG yo'l esa berilgan nuqtadan pastga chiziladi.
    y: ph - s.y * ph,
    scale,
    borderColor: rgb(SIGNATURE_COLOR.r, SIGNATURE_COLOR.g, SIGNATURE_COLOR.b),
    borderWidth: s.strokeWidth,
    borderLineCap: LineCapStyle.Round,
  });
  return addPdfBytes(db, await pdf.save(), {
    title: `${doc.title} (imzolangan)`,
    folderId: doc.folder_id,
    pageCount: pdf.getPageCount(),
  });
}

// Bitta sahifani yuqori sifatli JPEG qilib ulashadi.
export async function sharePageAsImage(doc: Document, pageIndex: number) {
  const result = await PdfThumbnail.generate(appFile(doc.file_path).uri, pageIndex, { quality: 90, maxWidth: 2000 });
  const dir = new Directory(Paths.cache, 'share');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });
  const safeName = doc.title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Hujjat';
  const image = new File(dir, `${safeName} - ${pageIndex + 1}.jpg`);
  await new File(result.uri).move(image);
  await Sharing.shareAsync(image.uri, { mimeType: 'image/jpeg', dialogTitle: doc.title });
}

// Tahrirlash va imzo ekranlarida ko'rsatish uchun sahifa rasmlari.
export function renderPages(doc: Document, maxWidth: number) {
  return PdfThumbnail.generateAllPages(appFile(doc.file_path).uri, { quality: 70, maxWidth });
}

export function renderPage(doc: Document, pageIndex: number, maxWidth: number) {
  return PdfThumbnail.generate(appFile(doc.file_path).uri, pageIndex, { quality: 85, maxWidth });
}
