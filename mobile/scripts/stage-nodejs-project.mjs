// Stage the on-device Node project: vendor node-sqlite3-wasm (kept external by
// the bundler because it loads its own .wasm from disk) into
// nodejs-project/node_modules so nodejs-mobile ships it in the APK assets.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.resolve(root, 'node_modules/node-sqlite3-wasm');
const destModules = path.resolve(root, 'nodejs-project/node_modules');
const dest = path.resolve(destModules, 'node-sqlite3-wasm');

if (!fs.existsSync(src)) {
  console.error('node-sqlite3-wasm not installed in mobile/node_modules — run npm install first.');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(destModules, { recursive: true });
// node-sqlite3-wasm is a leaf package (no nested node_modules); copy it whole so
// the dist/.wasm binary ships alongside its loader.
fs.cpSync(src, dest, { recursive: true });

const wasm = path.resolve(dest, 'dist/node-sqlite3-wasm.wasm');
if (!fs.existsSync(wasm)) {
  console.error('Staged package is missing the .wasm binary:', wasm);
  process.exit(1);
}
console.log('Staged node-sqlite3-wasm ->', path.relative(root, dest));
