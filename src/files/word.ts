import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import mammoth from 'mammoth';

export type FileKind = 'pdf' | 'docx' | 'unknown';

// Nom va MIME turi har doim ham kelmaydi (masalan Telegram'dan "bilan ochish"), shuning uchun fayl boshidagi baytlarga qaraymiz.
export function detectFileKind(file: File): FileKind {
  const handle = file.open();
  try {
    const head = handle.readBytesSync(4);
    if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) return 'pdf'; // %PDF
    if (head[0] === 0x50 && head[1] === 0x4b) return 'docx'; // PK: .docx aslida ZIP
    return 'unknown';
  } finally {
    handle.close();
  }
}

// Word sahifa joylashuvini to'liq takrorlamaydi: matn, sarlavha, ro'yxat, jadval va rasmlar saqlanadi,
// shrift, kolontitul va murakkab joylashuv soddalashadi. Android'da chekkalar faqat CSS @page orqali beriladi.
const WORD_CSS = `
  @page { size: A4; margin: 20mm 18mm; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; color: #000; margin: 0; }
  h1 { font-size: 20pt; } h2 { font-size: 16pt; } h3 { font-size: 14pt; }
  p { margin: 0 0 6pt; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; }
  td, th { border: 1px solid #999; padding: 4pt 6pt; vertical-align: top; }
  img { max-width: 100%; height: auto; }
`;

export async function wordToPdf(source: File) {
  const bytes = await source.bytes();
  const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
  if (!result.value.trim()) throw new Error("Hujjat bo'sh yoki .docx emas");

  const html = `<!doctype html><html><head><meta charset="utf-8" /><style>${WORD_CSS}</style></head>
    <body>${result.value}</body></html>`;
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  return new File(uri);
}

export function titleFromFileName(name: string | undefined, fallback: string) {
  const base = name?.replace(/\.(pdf|docx)$/i, '').trim();
  return base || fallback;
}
