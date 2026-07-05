// Download + extract the official nodejs-mobile v18 Android prebuilt into
// vendor/nodejs-mobile-v18/ (headers + libnode.so per ABI). This is what the
// on-device runtime actually is — the nodejs-mobile-cordova plugin bundles
// Node 12, which is too old for the server (undici 6, Object.hasOwn, etc.).
// Idempotent: skips the download if already present.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const VERSION = 'v18.20.4';
const dest = path.resolve(root, 'vendor/nodejs-mobile-v18');
const url = `https://github.com/nodejs-mobile/nodejs-mobile/releases/download/${VERSION}/nodejs-mobile-${VERSION}-android.zip`;

if (fs.existsSync(path.join(dest, 'include/node/node.h'))) {
  console.log('nodejs-mobile v18 already vendored — skipping download.');
  process.exit(0);
}

const zip = path.join(os.tmpdir(), `nodejs-mobile-${VERSION}-android.zip`);
console.log('Downloading', url);
let r = spawnSync('curl', ['-fsSL', '-o', zip, url], { stdio: 'inherit' });
if (r.status !== 0) {
  console.error('curl failed');
  process.exit(1);
}
fs.mkdirSync(dest, { recursive: true });
r = spawnSync('unzip', ['-q', '-o', zip, '-d', dest], { stdio: 'inherit' });
if (r.status !== 0) {
  console.error('unzip failed');
  process.exit(1);
}
fs.rmSync(zip, { force: true });
if (!fs.existsSync(path.join(dest, 'include/node/node.h'))) {
  console.error('Extraction did not produce include/node/node.h — check the archive layout.');
  process.exit(1);
}
console.log('Vendored nodejs-mobile', VERSION, '->', path.relative(root, dest));
