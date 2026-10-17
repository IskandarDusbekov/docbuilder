import { Directory, File, Paths } from 'expo-file-system';

// Fayllar ilovaning shaxsiy papkasida: documents/ ichida PDF'lar, thumbs/ ichida kichik rasmlar.
// Bazada nisbiy yo'l saqlanadi, shunda zaxiradan tiklanganda ham yo'llar buzilmaydi.
export const DOCS_DIR = 'documents';
export const THUMBS_DIR = 'thumbs';

export function appFile(relPath: string) {
  return new File(Paths.document, relPath);
}

export function ensureDir(name: string) {
  const dir = new Directory(Paths.document, name);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}
