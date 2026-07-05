// Copy the freshly built dashboard (client/dist) into the Capacitor webDir
// (mobile/www). The client build already contains the mobile bootstrap that
// starts nodejs-mobile and points the dashboard at the on-device server.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.resolve(root, '../client/dist');
const dest = path.resolve(root, 'www');

if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error('client/dist not built — run `npm run build -w client` first.');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log('Staged dashboard ->', path.relative(root, dest));
