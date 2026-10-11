const fs = require('fs');
const path = require('path');

function readFile(name) {
  return fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
}

function openSqlite(file) {
  try {
    const Database = require('better-sqlite3');
    const raw = new Database(file);
    raw.pragma('journal_mode = WAL');
    return raw;
  } catch (e) {
    const { DatabaseSync } = require('node:sqlite');
    const raw = new DatabaseSync(file);
    raw.exec('PRAGMA journal_mode = WAL');
    return raw;
  }
}

function createSqlite(file) {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }
  const raw = openSqlite(file);

  return {
    dialect: 'sqlite',
    init: async () => raw.exec(readFile('schema.sql')),
    reset: async () =>
      raw.exec("DELETE FROM internships; DELETE FROM sqlite_sequence WHERE name='internships';"),
    all: async (sql, params = []) => raw.prepare(sql).all(...params),
    get: async (sql, params = []) => raw.prepare(sql).get(...params),
    close: async () => raw.close(),
  };
}

function createPostgres(url) {
  const { Pool, types } = require('pg');
  types.setTypeParser(1082, (v) => v);
  types.setTypeParser(1184, (v) => new Date(v).toISOString());

  const pool = new Pool({ connectionString: url, max: 3 });

  function toPg(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  return {
    dialect: 'postgres',
    init: async () => {
      await pool.query(readFile('schema.pg.sql'));
    },
    reset: async () => {
      await pool.query('TRUNCATE internships RESTART IDENTITY');
    },
    all: async (sql, params = []) => (await pool.query(toPg(sql), params)).rows,
    get: async (sql, params = []) => (await pool.query(toPg(sql), params)).rows[0],
    close: () => pool.end(),
  };
}

function createDb({ sqlitePath, url = process.env.DATABASE_URL } = {}) {
  const db =
    sqlitePath || !url
      ? createSqlite(sqlitePath || process.env.DB_PATH || './data/internships.db')
      : createPostgres(url);

  let ready;
  db.ready = () =>
    (ready ||= db.init().catch((e) => {
      ready = undefined;
      throw e;
    }));

  return db;
}

module.exports = { createDb };
