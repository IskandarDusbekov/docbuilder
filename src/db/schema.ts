import type { SQLiteDatabase } from 'expo-sqlite';

export const DB_NAME = 'docbuilder.db';

// Har element bitta versiya. Yangi o'zgarish faqat oxiriga qo'shiladi, eskilari hech qachon tahrirlanmaydi.
// Maydonlar keyingi backend modellari bilan bir xil: id'lar telefonda yaratilgan UUID, sanalar ISO matn.
const MIGRATIONS = [
  `
  CREATE TABLE folders (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE UNIQUE INDEX folders_name ON folders (name) WHERE deleted_at IS NULL;

  CREATE TABLE documents (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    folder_id TEXT REFERENCES folders (id),
    file_path TEXT NOT NULL,
    thumb_path TEXT,
    page_count INTEGER NOT NULL DEFAULT 0,
    file_size INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX documents_folder ON documents (folder_id);
  CREATE INDEX documents_created ON documents (created_at);
  `,
];

export async function migrate(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
