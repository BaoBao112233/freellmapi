// Reproduce, for Capacitor, what nodejs-mobile-cordova's cordova `after_prepare`
// hooks would have done — Capacitor doesn't run cordova prepare hooks, so the
// on-device Node project and its asset manifests must be staged by hand.
//
// Must run AFTER `cap sync` (which regenerates the android project + cordova
// plugin assets) and is safe to re-run.
//
// Produces, under android/app/src/main/assets/:
//   www/nodejs-project/...                     the bundled server + wasm sqlite
//   dir.list / file.list                       manifests NodeJS.java uses to
//                                              extract the project at runtime
//   nodejs-mobile-cordova-assets/builtin_modules/...  the cordova-bridge builtin
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
// Stage into the cordova-plugins LIBRARY module, not the app module:
// nodejs-mobile-cordova's build.gradle looks for `www/` relative to its OWN
// module dir at configure time, and library-module assets still merge into the
// final APK so NodeJS.java finds them at runtime.
const assetsRoot = path.resolve(root, 'android/capacitor-cordova-android-plugins/src/main/assets');
const nodeSrc = path.resolve(root, 'nodejs-project');

// Clean any earlier app-module staging so the same asset paths don't exist in
// two modules (which would be an asset-merge conflict).
const appAssets = path.resolve(root, 'android/app/src/main/assets');
for (const stale of ['www', 'dir.list', 'file.list', 'nodejs-mobile-cordova-assets']) {
  fs.rmSync(path.resolve(appAssets, stale), { recursive: true, force: true });
}
const nodeDestRel = 'www/nodejs-project';
const nodeDest = path.resolve(assetsRoot, nodeDestRel);

if (!fs.existsSync(path.resolve(root, 'android'))) {
  console.error('android/ not found — run `npx cap add android` first.');
  process.exit(1);
}
if (!fs.existsSync(path.join(nodeSrc, 'server.mjs'))) {
  console.error('nodejs-project/server.mjs missing — run bundle:server + stage:node first.');
  process.exit(1);
}

// 1. Copy the Node project into assets/www/nodejs-project (fresh each time).
fs.rmSync(nodeDest, { recursive: true, force: true });
fs.mkdirSync(path.dirname(nodeDest), { recursive: true });
fs.cpSync(nodeSrc, nodeDest, { recursive: true });

// 2. Generate dir.list / file.list with asset-relative paths (posix separators),
//    matching what NodeJS.java reads from the assets root.
const dirs = [];
const files = [];
function walk(absDir) {
  for (const name of fs.readdirSync(absDir)) {
    if (name.startsWith('.')) continue; // skip dotfiles (mirrors the cordova hook)
    const abs = path.join(absDir, name);
    const rel = path.relative(assetsRoot, abs).split(path.sep).join('/');
    if (fs.statSync(abs).isDirectory()) {
      dirs.push(rel);
      walk(abs);
    } else if (!name.endsWith('.gz') && !name.endsWith('~')) {
      files.push(rel);
    }
  }
}
walk(nodeDest);
fs.writeFileSync(path.join(assetsRoot, 'dir.list'), dirs.join('\n'));
fs.writeFileSync(path.join(assetsRoot, 'file.list'), files.join('\n'));

// 3. Stage the nodejs-mobile builtin assets (cordova-bridge) where the runtime
//    looks for them: assets/nodejs-mobile-cordova-assets/. Capacitor's cordova
//    integration flattens these into the wrong place, so place a correct copy in
//    the app's own assets (app assets win in the merge).
const builtinSrc = path.resolve(root, 'node_modules/nodejs-mobile-cordova/install/nodejs-mobile-cordova-assets');
const builtinDest = path.resolve(assetsRoot, 'nodejs-mobile-cordova-assets');
if (fs.existsSync(builtinSrc)) {
  fs.rmSync(builtinDest, { recursive: true, force: true });
  fs.cpSync(builtinSrc, builtinDest, { recursive: true });
}

console.log(`Staged Android assets: ${files.length} files, ${dirs.length} dirs under ${nodeDestRel}`);
