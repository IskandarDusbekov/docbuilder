import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { extractTextFromImage, isSupported } from 'expo-text-extractor';
import PdfThumbnail from 'react-native-pdf-thumbnail';

import { nextDocumentForOcr, setOcrText } from '@/db';

import { appFile } from './paths';

// Juda uzun hujjatlarda telefonni uzoq band qilmaslik uchun faqat boshidagi sahifalar tanib olinadi.
const MAX_OCR_PAGES = 30;
// Matn tanish uchun yetarli aniqlik; kattaroq rasm sekinlashtiradi, sifatni deyarli oshirmaydi.
const OCR_WIDTH = 1600;

let db: SQLiteDatabase | null = null;
let running = false;
let again = false;

// Ilova ochilganda bir marta chaqiriladi; keyin har yangi hujjatda kickOcr() navbatni davom ettiradi.
export function startOcr(database: SQLiteDatabase) {
  db = database;
  kickOcr();
}

export function kickOcr() {
  if (!db || !isSupported) return;
  if (running) {
    again = true;
    return;
  }
  void runQueue(db);
}

async function runQueue(database: SQLiteDatabase) {
  running = true;
  try {
    do {
      again = false;
      for (let doc = await nextDocumentForOcr(database); doc; doc = await nextDocumentForOcr(database)) {
        const text = await recognize(doc.file_path);
        // null: matn tanish ishlamadi (masalan, model hali yuklanmagan) — keyingi ochilishda qayta urinamiz.
        if (text === null) return;
        await setOcrText(database, doc.id, text);
      }
    } while (again);
  } finally {
    running = false;
  }
}

async function recognize(filePath: string): Promise<string | null> {
  const pdf = appFile(filePath);
  if (!pdf.exists) return '';
  const parts: string[] = [];
  for (let page = 0; page < MAX_OCR_PAGES; page++) {
    let image: string;
    try {
      image = (await PdfThumbnail.generate(pdf.uri, page, { quality: 90, maxWidth: OCR_WIDTH })).uri;
    } catch {
      // Sahifalar tugadi yoki PDF o'qilmaydi.
      break;
    }
    try {
      parts.push((await extractTextFromImage(image)).join('\n'));
    } catch {
      return null;
    } finally {
      new File(image).delete();
    }
  }
  return parts.join('\n').trim();
}
