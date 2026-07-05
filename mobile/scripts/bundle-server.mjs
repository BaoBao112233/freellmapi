// Bundle mobile/src/server-main.ts (and, transitively, the whole server) into
// nodejs-project/server.mjs.
//
// Two key rewrites make the server run under nodejs-mobile with no native code:
//   * alias `better-sqlite3` -> src/wasm-better-sqlite3.mjs (the WASM shim)
//   * keep `node-sqlite3-wasm` EXTERNAL — it loads its .wasm from disk via
//     __dirname, so it must stay an on-disk package (staged into
//     nodejs-project/node_modules) rather than being inlined here.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// nodejs-mobile's Node 18 is built with small-icu, so Unicode property escapes
// (\p{ID_Start}/\p{ID_Continue}) throw "Invalid property name in character
// class" at load time. Express 5's path-to-regexp uses them in its route-name
// lexer. Route param names in this app are ASCII, so rewrite those escapes to
// ASCII ranges — behaviour is identical for ASCII identifiers.
const smallIcuRegexFix = {
  name: 'small-icu-regex-fix',
  setup(pluginBuild) {
    pluginBuild.onLoad({ filter: /path-to-regexp[\\/]dist[\\/]index\.js$/ }, (args) => {
      const contents = fs
        .readFileSync(args.path, 'utf8')
        .replaceAll('\\p{ID_Start}', 'a-zA-Z')
        .replaceAll('\\p{ID_Continue}', 'a-zA-Z0-9');
      return { contents, loader: 'js' };
    });
  },
};

await build({
  entryPoints: [path.resolve(root, 'src/server-main.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  // nodejs-mobile 0.4.x ships a Node 18 runtime.
  target: 'node18',
  outfile: path.resolve(root, 'nodejs-project/server.mjs'),
  alias: {
    'better-sqlite3': path.resolve(root, 'src/wasm-better-sqlite3.mjs'),
  },
  plugins: [smallIcuRegexFix],
  external: ['node-sqlite3-wasm'],
  // Some inlined CJS deps (express internals) reference `require` at runtime;
  // give the ESM output a working one (mirrors the desktop bundler).
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  logLevel: 'info',
});
