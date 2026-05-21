import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'artoria.db');

let db = null;

export async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    const buf = readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'reference',
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新的对话',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  try { db.run('CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)'); } catch {}
  try { db.run('CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC)'); } catch {}

  saveDb();
}

// sql.js runs in memory — persist to disk after every write
function saveDb() {
  if (db) {
    const data = db.export();
    writeFileSync(DB_PATH, Buffer.from(data));
  }
}

// Wrap to auto-save after writes
function stmt(sql) {
  return {
    run(...params) {
      db.run(sql, params);
      saveDb();
      return {
        lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0][0]
      };
    },
    get(...params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        stmt.free();
        const row = {};
        cols.forEach((c, i) => row[c] = vals[i]);
        return row;
      }
      stmt.free();
      return null;
    },
    all(...params) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const cols = stmt.getColumnNames();
      const rows = [];
      while (stmt.step()) {
        const vals = stmt.get();
        const row = {};
        cols.forEach((c, i) => row[c] = vals[i]);
        rows.push(row);
      }
      stmt.free();
      return rows;
    }
  };
}

export { saveDb, stmt };

export async function closeDb() {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}
