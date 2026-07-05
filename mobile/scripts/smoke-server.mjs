// Boot the bundled mobile server on desktop Node against a temp DB and exercise
// the real HTTP surface. This runs the exact same server.mjs the device will,
// so it validates the WASM DB shim end-to-end (migrations + auth + routes)
// without needing the emulator.
import { startMobileServer } from '../nodejs-project/server.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dbPath = path.join(os.tmpdir(), `freeapi-smoke-${process.pid}.db`);
fs.rmSync(dbPath, { force: true });

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { (cond ? pass++ : fail++); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };

const { server, port, token } = await startMobileServer({ dbPath, preferredPort: 3555 });
const base = `http://127.0.0.1:${port}`;

try {
  // migrations ran → DB file exists and has tables
  ok('server bound to a port', port > 0, `port=${port}`);
  ok('session token minted', typeof token === 'string' && token.length > 0);

  const ping = await fetch(`${base}/api/ping`).then(r => r.json());
  ok('/api/ping ok', ping.status === 'ok');

  // requireAuth: no token -> 401
  const noAuth = await fetch(`${base}/api/keys`);
  ok('/api/keys without token -> 401', noAuth.status === 401);

  // with the minted token -> 200 and JSON
  const withAuth = await fetch(`${base}/api/keys`, { headers: { Authorization: `Bearer ${token}` } });
  ok('/api/keys with token -> 200', withAuth.status === 200, `status=${withAuth.status}`);
  const keys = await withAuth.json().catch(() => null);
  ok('/api/keys returns JSON array', Array.isArray(keys), Array.isArray(keys) ? `len=${keys.length}` : '');

  // auth status endpoint (used by the client AuthGate) works
  const status = await fetch(`${base}/api/auth/status`).then(r => r.json());
  ok('/api/auth/status responds', typeof status === 'object' && status !== null, JSON.stringify(status));

  // models catalog should be seeded by migrations -> non-empty
  const models = await fetch(`${base}/api/models`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => null);
  ok('/api/models seeded', models && (Array.isArray(models) ? models.length > 0 : Object.keys(models).length > 0),
    models ? `count=${Array.isArray(models) ? models.length : Object.keys(models).length}` : 'null');

  // DB persisted to disk
  ok('DB file written', fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0);
} finally {
  server.close();
  // give timers a beat, then hard-exit (health/catalog schedulers keep the loop alive)
  setTimeout(() => {
    fs.rmSync(dbPath, { force: true });
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
  }, 200);
}
