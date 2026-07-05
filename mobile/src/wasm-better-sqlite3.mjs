// Drop-in replacement for the subset of `better-sqlite3` that the FreeLLMAPI
// server actually uses, implemented on top of `node-sqlite3-wasm` (pure WASM,
// no native compilation — the reason it can run inside nodejs-mobile on
// Android without an NDK cross-compile toolchain).
//
// This file is aliased over `better-sqlite3` ONLY in the mobile esbuild bundle
// (see scripts/bundle-server.mjs). The desktop/server builds keep the real
// native better-sqlite3, so nothing here affects those targets.
//
// Surface reproduced (verified against the server sources):
//   new Database(path)             .prepare(sql) -> Statement
//   db.exec(sql)  db.pragma(str)   db.transaction(fn) -> callable
//   db.close()
//   stmt.get(...params)  stmt.all(...params)  stmt.run(...params)
//
// Deliberate compatibility choices, and why they are safe here:
//  * better-sqlite3 takes VARIADIC positional params and BARE named keys
//    ({slug}) against @slug/:slug/$slug placeholders; node-sqlite3-wasm takes a
//    single bind value and matches object keys to the FULL placeholder
//    (including the sigil). We parse placeholders out of the SQL once at
//    prepare() and remap bare -> full at bind time.
//  * better-sqlite3 finalizes a statement's native handle when the JS object is
//    GC'd. node-sqlite3-wasm does not, and the server prepares statements on
//    hot per-request paths, so we finalize the wasm handle via a
//    FinalizationRegistry to avoid leaking WASM heap.
//  * WAL is unavailable in the WASM build; `pragma('journal_mode = WAL')` is
//    executed best-effort and any failure is swallowed (SQLite falls back to a
//    rollback journal, which is fine for a single local process).

import pkg from 'node-sqlite3-wasm';
const { Database: WasmDatabase } = pkg;

// Finalize the underlying wasm statement once our wrapper is collected — this
// is what keeps the hot `db.prepare(...)` paths from leaking WASM memory.
const finalizer = new FinalizationRegistry((wasmStmt) => {
  try {
    if (wasmStmt && !wasmStmt.isFinalized) wasmStmt.finalize();
  } catch {
    /* already gone */
  }
});

function isNamedObject(v) {
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    !(v instanceof Uint8Array) &&
    !(typeof Buffer !== 'undefined' && Buffer.isBuffer(v))
  );
}

// better-sqlite3 accepts number | bigint | string | Buffer/Uint8Array | null.
// It rejects booleans/undefined, but callers already normalise those; we coerce
// them defensively so a stray value can't blow up a query.
function coerce(v) {
  if (v === undefined) return null;
  if (v === true) return 1;
  if (v === false) return 0;
  return v;
}

// Pull @name / :name / $name placeholders out of SQL, after stripping comments
// and quoted literals so a '@' inside a string can't be mistaken for one.
function parsePlaceholders(sql) {
  const cleaned = sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:''|[^'])*'/g, ' ')
    .replace(/"(?:""|[^"])*"/g, ' ');
  const map = new Map(); // bare -> full ("slug" -> "@slug")
  const re = /[@:$][a-zA-Z_][a-zA-Z0-9_]*/g;
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    const full = m[0];
    const bare = full.slice(1);
    if (!map.has(bare)) map.set(bare, full);
  }
  return map;
}

class Statement {
  constructor(wasmStmt, placeholders) {
    this._stmt = wasmStmt;
    this._ph = placeholders;
    finalizer.register(this, wasmStmt);
  }

  // Turn better-sqlite3-style variadic args into a single node-sqlite3-wasm
  // bind value: a named object (keys remapped to full placeholders) or a
  // positional array.
  _bindValues(args) {
    if (args.length === 1 && isNamedObject(args[0])) {
      const src = args[0];
      const out = {};
      for (const [bare, full] of this._ph) {
        if (Object.prototype.hasOwnProperty.call(src, bare)) {
          out[full] = coerce(src[bare]);
        }
      }
      return out;
    }
    return args.map(coerce);
  }

  run(...args) {
    return this._stmt.run(this._bindValues(args));
  }

  get(...args) {
    const row = this._stmt.get(this._bindValues(args));
    // better-sqlite3 returns undefined (not null) for "no row".
    return row === null ? undefined : row;
  }

  all(...args) {
    return this._stmt.all(this._bindValues(args));
  }
}

class Database {
  constructor(filename, options = {}) {
    this._db = new WasmDatabase(filename, {
      readOnly: options.readonly ?? false,
      fileMustExist: options.fileMustExist ?? false,
    });
    this._txDepth = 0;
    this._txSeq = 0;
  }

  prepare(sql) {
    return new Statement(this._db.prepare(sql), parsePlaceholders(sql));
  }

  exec(sql) {
    this._db.exec(sql);
    return this;
  }

  // Only setter-style pragmas are used by the server (journal_mode, foreign_keys,
  // wal_checkpoint); none read a value back. WAL isn't supported under WASM, so
  // failures are swallowed and SQLite keeps its default rollback journal.
  pragma(source) {
    try {
      this._db.exec(`PRAGMA ${source};`);
    } catch {
      /* unsupported pragma (e.g. WAL) — ignore */
    }
    return undefined;
  }

  // better-sqlite3's db.transaction(fn) returns a function that runs fn inside
  // BEGIN/COMMIT (or a SAVEPOINT when already inside a transaction) and returns
  // fn's result, rolling back on throw.
  transaction(fn) {
    const db = this;
    return function wrapped(...callArgs) {
      const nested = db._txDepth > 0;
      const savepoint = nested ? `_bs_sp_${db._txSeq++}` : null;
      db._txDepth++;
      try {
        db._db.exec(nested ? `SAVEPOINT ${savepoint}` : 'BEGIN');
        let result;
        try {
          result = fn.apply(this, callArgs);
        } catch (err) {
          if (nested) {
            db._db.exec(`ROLLBACK TO ${savepoint}`);
            db._db.exec(`RELEASE ${savepoint}`);
          } else {
            db._db.exec('ROLLBACK');
          }
          throw err;
        }
        db._db.exec(nested ? `RELEASE ${savepoint}` : 'COMMIT');
        return result;
      } finally {
        db._txDepth--;
      }
    };
  }

  close() {
    this._db.close();
  }

  get open() {
    return this._db.isOpen;
  }

  get inTransaction() {
    return this._txDepth > 0;
  }
}

export default Database;
export { Database, Statement };
