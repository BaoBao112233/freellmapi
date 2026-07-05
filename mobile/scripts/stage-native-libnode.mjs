// Build android/app/libs/cdvnodejsmobile/ with the exact layout the app-module
// CMake build expects. Two nodejs-mobile-cordova quirks force this under
// Capacitor (its cordova install hooks don't run):
//   * Capacitor 6 applies the plugin's build.gradle in the APP module, so its
//     `cmake.path "libs/cdvnodejsmobile/CMakeLists.txt"` resolves under app/,
//     but Capacitor copied the native sources into the plugins LIBRARY module.
//   * nodejs-mobile-cordova@0.4.3 bundles Node 12, which is far too old for the
//     server (undici 6 needs Node >=18, node-sqlite3-wasm uses Object.hasOwn).
//     So we DON'T use the plugin's libnode — we drop in the official
//     nodejs-mobile v18 prebuilt (vendored under vendor/). native-lib.cpp only
//     calls node::Start and the bridge is pure N-API, both ABI-stable across
//     Node versions, so the plugin's JNI glue links fine against v18.
// Idempotent.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const plugin = path.resolve(root, 'node_modules/nodejs-mobile-cordova');
const libnodeSrc = path.resolve(root, 'vendor/nodejs-mobile-v18');
const dest = path.resolve(root, 'android/app/libs/cdvnodejsmobile');
const ABIS = ['x86_64', 'arm64-v8a']; // must match the abiFilters in build.gradle

if (!fs.existsSync(plugin)) {
  console.error('nodejs-mobile-cordova not installed.');
  process.exit(1);
}
if (!fs.existsSync(path.join(libnodeSrc, 'include/node/node.h'))) {
  console.error('nodejs-mobile v18 prebuilt missing at vendor/nodejs-mobile-v18 — see README.');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });

// Native build inputs (JNI glue) come from the cordova plugin.
fs.copyFileSync(path.join(plugin, 'src/android/CMakeLists.txt'), path.join(dest, 'CMakeLists.txt'));
fs.copyFileSync(path.join(plugin, 'src/android/jni/native-lib.cpp'), path.join(dest, 'native-lib.cpp'));
fs.copyFileSync(path.join(plugin, 'src/common/cordova-bridge/cordova-bridge.cpp'), path.join(dest, 'cordova-bridge.cpp'));
fs.copyFileSync(path.join(plugin, 'src/common/cordova-bridge/cordova-bridge.h'), path.join(dest, 'cordova-bridge.h'));

// libnode headers + prebuilt .so come from the vendored Node 18 runtime.
fs.cpSync(path.join(libnodeSrc, 'include'), path.join(dest, 'libnode/include'), { recursive: true });
for (const abi of ABIS) {
  const so = path.join(libnodeSrc, 'bin', abi, 'libnode.so');
  if (!fs.existsSync(so)) {
    console.error('missing prebuilt libnode for', abi, '->', so);
    process.exit(1);
  }
  const outDir = path.join(dest, 'libnode/bin', abi);
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(so, path.join(outDir, 'libnode.so'));
  console.log(`copied Node 18 libnode.so for ${abi}`);
}

console.log('Staged native libnode (Node 18) ->', path.relative(root, dest));
