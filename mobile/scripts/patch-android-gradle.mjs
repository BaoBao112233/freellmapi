// Re-apply the native-build tweaks Capacitor regenerates away whenever the
// android project is (re)added: pin the NDK version and restrict ABIs so
// nodejs-mobile only compiles/ships x86_64 (emulator) + arm64-v8a (phones).
// Idempotent — running twice is a no-op.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const NDK_VERSION = '27.2.12479018';
const ABI_BLOCK = `        ndk {
            abiFilters "x86_64", "arm64-v8a"
        }`;

function patch(file, anchorAfterCompileSdk) {
  const abs = path.resolve(root, file);
  if (!fs.existsSync(abs)) {
    console.error('missing', file);
    process.exit(1);
  }
  let src = fs.readFileSync(abs, 'utf8');

  // 1. ndkVersion right after the first `compileSdk = ...` line.
  if (!src.includes('ndkVersion')) {
    src = src.replace(anchorAfterCompileSdk, (m) => `${m}\n    ndkVersion "${NDK_VERSION}"`);
  }
  // 2. abiFilters inside the first defaultConfig { ... }.
  if (!src.includes('abiFilters')) {
    src = src.replace(/defaultConfig\s*\{/, (m) => `${m}\n${ABI_BLOCK}`);
  }
  fs.writeFileSync(abs, src);
  console.log('patched', file);
}

// compileSdk assignment differs across Capacitor versions (`compileSdk = x` vs
// `compileSdk x`), so match both forms.
patch('android/app/build.gradle', /compileSdk\s*=?\s*rootProject\.ext\.compileSdkVersion/);
patch(
  'android/capacitor-cordova-android-plugins/build.gradle',
  /compileSdk\s*=?\s*[^\n]*compileSdkVersion[^\n]*/,
);

// Capacitor applies nodejs-mobile's native build.gradle in BOTH the app module
// (via app/capacitor.build.gradle) and this library module, which would build
// libnode/native-lib twice and collide when packaging. Keep the app-module
// build (where scripts/stage-native-libnode.mjs stages the native tree) and
// neutralise the duplicate here. cdvPluginPostBuildExtras stays defined (as [])
// by cordova.variables.gradle, so the following for-loop is a safe no-op.
function neutralisePluginNativeApply() {
  const file = 'android/capacitor-cordova-android-plugins/build.gradle';
  const abs = path.resolve(root, file);
  let src = fs.readFileSync(abs, 'utf8');
  const line = 'apply from: "../../node_modules/nodejs-mobile-cordova/src/android/build.gradle"';
  if (src.includes(line)) {
    src = src.replace(line, `// [freellmapi] disabled — native build runs in the app module\n// ${line}`);
    fs.writeFileSync(abs, src);
    console.log('neutralised duplicate native apply in', file);
  }
}
neutralisePluginNativeApply();
