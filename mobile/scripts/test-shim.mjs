// Quick behavioural check of the wasm better-sqlite3 shim against a temp DB.
import Database from '../src/wasm-better-sqlite3.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const file = path.join(os.tmpdir(), `shim-test-${process.pid}.db`);
fs.rmSync(file, { force: true });
const db = new Database(file);
let pass = 0, fail = 0;
const ok = (name, cond) => { (cond ? pass++ : fail++); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); };

db.pragma('journal_mode = WAL');   // unsupported under wasm — must not throw
db.pragma('foreign_keys = ON');
db.exec(`CREATE TABLE items (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, n INTEGER, blob BLOB)`);

// positional bind + run result shape
const ins = db.prepare('INSERT INTO items (slug, n) VALUES (?, ?)');
const r1 = ins.run('a', 10);
ok('run returns changes=1', r1.changes === 1);
ok('run returns lastInsertRowid', Number(r1.lastInsertRowid) === 1);

// named bind (@bare -> @slug) with extra spread keys ignored
const insNamed = db.prepare('INSERT INTO items (slug, n) VALUES (@slug, @n)');
insNamed.run({ slug: 'b', n: 20, extraIgnored: 999 });
ok('named bind inserted', db.prepare('SELECT n FROM items WHERE slug = ?').get('b').n === 20);

// get returns undefined (not null) for no row
ok('get no-row -> undefined', db.prepare('SELECT * FROM items WHERE slug = ?').get('nope') === undefined);

// all
ok('all returns 2 rows', db.prepare('SELECT * FROM items ORDER BY id').all().length === 2);

// blob round-trip
db.prepare('INSERT INTO items (slug, blob) VALUES (?, ?)').run('c', new Uint8Array([1, 2, 3]));
const blobRow = db.prepare('SELECT blob FROM items WHERE slug = ?').get('c');
ok('blob round-trip', blobRow.blob instanceof Uint8Array && blobRow.blob[2] === 3);

// undefined coerced to NULL
db.prepare('INSERT INTO items (slug, n) VALUES (?, ?)').run('d', undefined);
ok('undefined -> NULL', db.prepare('SELECT n FROM items WHERE slug=?').get('d').n === null);

// transaction commit returns fn result
const tx = db.transaction((base) => {
  db.prepare('INSERT INTO items (slug, n) VALUES (?, ?)').run('tx1', base + 1);
  db.prepare('INSERT INTO items (slug, n) VALUES (?, ?)').run('tx2', base + 2);
  return 'done';
});
ok('transaction returns value', tx(100) === 'done');
ok('transaction committed both', db.prepare('SELECT COUNT(*) c FROM items WHERE slug LIKE ?').get('tx%').c === 2);

// transaction rollback on throw
let threw = false;
try {
  db.transaction(() => {
    db.prepare('INSERT INTO items (slug, n) VALUES (?, ?)').run('rb', 1);
    throw new Error('boom');
  })();
} catch { threw = true; }
ok('transaction threw', threw);
ok('transaction rolled back', db.prepare('SELECT COUNT(*) c FROM items WHERE slug=?').get('rb').c === 0);

// nested transaction (savepoint): inner rolls back, outer commits
const nested = db.transaction(() => {
  db.prepare('INSERT INTO items (slug, n) VALUES (?, ?)').run('outer', 1);
  try {
    db.transaction(() => {
      db.prepare('INSERT INTO items (slug, n) VALUES (?, ?)').run('inner', 1);
      throw new Error('inner-boom');
    })();
  } catch { /* swallow, outer continues */ }
});
nested();
ok('nested: outer committed', db.prepare('SELECT COUNT(*) c FROM items WHERE slug=?').get('outer').c === 1);
ok('nested: inner rolled back', db.prepare('SELECT COUNT(*) c FROM items WHERE slug=?').get('inner').c === 0);

db.close();
fs.rmSync(file, { force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
