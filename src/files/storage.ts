import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import PdfThumbnail from 'react-native-pdf-thumbnail';

import { insertDocument, markDocumentDeleted, uniqueTitle, updateDocumentFile, type Document } from '@/db';

import { kickOcr } from './ocr';
import { appFile, DOCS_DIR, ensureDir, THUMBS_DIR } from './paths';

export { appFile } from './paths';

const THUMB_WIDTH = 480;
// Sahifalarni sanash uchun faylni xotiraga o'qiymiz; juda katta fayllarda buni qilmaymiz.
const MAX_SCAN_BYTES = 30 * 1024 * 1024;

// Taxminiy sanash: PDF ichidagi "/Type /Page" belgilarini sanaydi. Siqilgan obyektli PDF'larda 0 chiqishi mumkin,
// unda to'g'ri son hujjat birinchi marta ochilganda ko'ruvchidan olinadi.
async function countPdfPages(file: File) {
  if (file.size > MAX_SCAN_BYTES) return 0;
  const text = await file.text();
  const pages = text.match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;
  if (pages > 0) return pages;
  const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  return counts.length ? Math.max(...counts) : 0;
}

async function createThumb(pdf: File, name: string) {
  try {
    const result = await PdfThumbnail.generate(pdf.uri, 0, { quality: 70, maxWidth: THUMB_WIDTH });
    await new File(result.uri).move(new File(ensureDir(THUMBS_DIR), `${name}.jpg`));
    return `${THUMBS_DIR}/${name}.jpg`;
  } catch {
    // Kichik rasm bo'lmasa, kartochkada ikonka chiqadi.
    return null;
  }
}

type NewDocument = {
  // Vaqtinchalik PDF: import'da tanlangan fayl nusxa olinadi, skanerdan yaratilgani ko'chiriladi.
  source: File;
  transfer: 'copy' | 'move';
  title: string;
  folderId?: string | null;
  // Berilmasa, fayldan taxminan sanaladi.
  pageCount?: number;
};

export async function addPdfDocument(db: SQLiteDatabase, input: NewDocument) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const pdf = new File(ensureDir(DOCS_DIR), `${id}.pdf`);

  await (input.transfer === 'move' ? input.source.move(pdf) : input.source.copy(pdf));
  const thumbPath = await createThumb(pdf, id);

  try {
    await insertDocument(db, {
      id,
      // Bir xil nomli hujjatlar ro'yxatda adashtirmasligi uchun oxiriga (2), (3) qo'shiladi.
      title: await uniqueTitle(db, input.title),
      folder_id: input.folderId ?? null,
      file_path: `${DOCS_DIR}/${id}.pdf`,
      thumb_path: thumbPath,
      page_count: input.pageCount ?? (await countPdfPages(pdf)),
      file_size: pdf.size,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
  } catch (e) {
    pdf.delete();
    if (thumbPath) appFile(thumbPath).delete();
    throw e;
  }
  kickOcr();
  return id;
}

// Hujjat PDF'ini tahrirlangan nusxa bilan almashtiradi (id va nomi o'zgarmaydi).
export async function replaceDocumentPdf(db: SQLiteDatabase, doc: Document, bytes: Uint8Array, pageCount: number) {
  // Yangi nusxa yangi nom bilan yoziladi: eski faylni ochiq turgan ko'ruvchi yoki rasm keshi
  // almashtirilgan faylga tushib qolmaydi. Eskisi baza yangilangandan keyin o'chiriladi.
  const version = `${doc.id}-${Date.now()}`;
  const filePath = `${DOCS_DIR}/${version}.pdf`;
  const pdf = new File(ensureDir(DOCS_DIR), `${version}.pdf`);
  pdf.write(bytes);

  const thumbPath = await createThumb(pdf, version);
  await updateDocumentFile(db, doc.id, { filePath, thumbPath, pageCount, fileSize: pdf.size });

  for (const old of [doc.file_path, doc.thumb_path]) {
    if (!old) continue;
    const file = appFile(old);
    if (file.exists) file.delete();
  }
  kickOcr();
}

// Yangi PDF baytlaridan alohida hujjat yaratadi (birlashtirish, ajratish, imzo).
export async function addPdfBytes(
  db: SQLiteDatabase,
  bytes: Uint8Array,
  input: { title: string; folderId?: string | null; pageCount: number }
) {
  const tmp = new File(Paths.cache, `${randomUUID()}.pdf`);
  tmp.write(bytes);
  return addPdfDocument(db, { source: tmp, transfer: 'move', ...input });
}

export async function deleteDocument(db: SQLiteDatabase, doc: Document) {
  await markDocumentDeleted(db, doc.id);
  for (const rel of [doc.file_path, doc.thumb_path]) {
    if (!rel) continue;
    const file = appFile(rel);
    if (file.exists) file.delete();
  }
}

// Ichki fayl nomi UUID; Telegram va boshqa ilovalarda hujjat nomi bilan ko'rinishi uchun nusxa olib ulashamiz.
export async function shareDocument(doc: Document) {
  const safeName = doc.title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Hujjat';
  const dir = new Directory(Paths.cache, 'share');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });
  const copy = new File(dir, `${safeName}.pdf`);
  await appFile(doc.file_path).copy(copy);
  await Sharing.shareAsync(copy.uri, { mimeType: 'application/pdf', dialogTitle: doc.title, UTI: 'com.adobe.pdf' });
}
