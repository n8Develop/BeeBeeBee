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

export default db;
