import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

mkdirSync(join(__dirname, '../../data'), { recursive: true });

const db = new Database(join(__dirname, '../../data/beebeebee.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Phase 4: add 'type' column to rooms, 'avatar_url' to users
const columns = db.prepare("PRAGMA table_info(rooms)").all().map(c => c.name);
if (!columns.includes('type')) {
  db.exec("ALTER TABLE rooms ADD COLUMN type TEXT NOT NULL DEFAULT 'invite'");
}
const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userCols.includes('avatar_url')) {
  db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL");
}

export default db;
