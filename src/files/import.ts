import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import { formatDate } from './format';
import { addPdfDocument } from './storage';
import { detectFileKind, titleFromFileName, wordToPdf } from './word';

// Tashqi fayl (tanlangan yoki "bilan ochish" orqali kelgan) avval keshga ko'chiriladi:
// content:// ruxsati vaqtinchalik, ilova yopilgach yo'qolishi mumkin.
function copyToIncoming(uri: string) {
  const dir = new Directory(Paths.cache, 'incoming');
  if (!dir.exists) dir.create({ intermediates: true });
  const copy = new File(dir, `${Date.now()}`);
  new File(uri).copySync(copy);
  return copy;
}

// PDF bo'lsa shundayligicha, Word (.docx) bo'lsa PDF'ga o'girib kutubxonaga qo'shadi.
export async function importFile(db: SQLiteDatabase, uri: string, name?: string) {
  const source = copyToIncoming(uri);
  const title = titleFromFileName(name, `Hujjat ${formatDate(new Date().toISOString())}`);
  try {
    const kind = detectFileKind(source);
    if (kind === 'pdf') return await addPdfDocument(db, { source, transfer: 'move', title });
    if (kind === 'docx') {
      const pdf = await wordToPdf(source);
      return await addPdfDocument(db, { source: pdf, transfer: 'move', title });
    }
    throw new Error('Faqat PDF va Word (.docx) fayllar ochiladi');
  } finally {
    if (source.exists) source.delete();
  }
}
