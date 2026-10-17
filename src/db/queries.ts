import type { SQLiteDatabase } from 'expo-sqlite';

export type Document = {
  id: string;
  title: string;
  folder_id: string | null;
  // Ilova papkasiga nisbatan yo'l (masalan "documents/<id>.pdf"), to'liq yo'l files/ da hisoblanadi.
  file_path: string;
  thumb_path: string | null;
  page_count: number;
  file_size: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Folder = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export function listDocuments(db: SQLiteDatabase, opts: { search?: string; folderId?: string | null } = {}) {
  const where = ['deleted_at IS NULL'];
  const params: string[] = [];
  const search = opts.search?.trim();
  if (search) {
    where.push("title LIKE ? ESCAPE '\\'");
    params.push(`%${search.replace(/[\\%_]/g, (c) => '\\' + c)}%`);
  }
  if (opts.folderId) {
    where.push('folder_id = ?');
    params.push(opts.folderId);
  }
  return db.getAllAsync<Document>(
    `SELECT * FROM documents WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
    params
  );
}

export function getDocument(db: SQLiteDatabase, id: string) {
  return db.getFirstAsync<Document>('SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL', id);
}

export async function insertDocument(db: SQLiteDatabase, doc: Document) {
  await db.runAsync(
    `INSERT INTO documents
      (id, title, folder_id, file_path, thumb_path, page_count, file_size, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    doc.id,
    doc.title,
    doc.folder_id,
    doc.file_path,
    doc.thumb_path,
    doc.page_count,
    doc.file_size,
    doc.created_at,
    doc.updated_at,
    doc.deleted_at
  );
}

export async function setPageCount(db: SQLiteDatabase, id: string, pageCount: number) {
  await db.runAsync(
    'UPDATE documents SET page_count = ?, updated_at = ? WHERE id = ?',
    pageCount,
    new Date().toISOString(),
    id
  );
}

export async function totalFileSize(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(file_size) AS total FROM documents WHERE deleted_at IS NULL'
  );
  return row?.total ?? 0;
}

export function listFolders(db: SQLiteDatabase) {
  return db.getAllAsync<Folder>('SELECT * FROM folders WHERE deleted_at IS NULL ORDER BY name COLLATE NOCASE');
}
