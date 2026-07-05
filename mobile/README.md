# FreeLLMAPI — Android app

A **fully standalone** Android build of FreeLLMAPI: the complete Node server (the
LLM router + provider proxy) and the React dashboard both run **on the device**.
No PC, no remote server — open the app and the local OpenAI-compatible endpoint
is live at `http://localhost:3001`.

## How it works

```
┌─ Android APK (co.freellmapi.app) ─────────────────────────┐
│                                                            │
│  Capacitor WebView  ──HTTP──▶  nodejs-mobile (Node 18)     │
│  (React dashboard)             └─ server.mjs (Express 5)   │
│    localhost                      └─ node-sqlite3-wasm     │
│                                      (freeapi.db in files) │
│                                                            │
│  On launch: WebView starts the Node runtime, polls         │
│  GET /api/mobile/handshake for the local session token,    │
│  then renders the already-authenticated dashboard.         │
└────────────────────────────────────────────────────────────┘
```

Key design decisions:

- **Runtime: nodejs-mobile v18.20.4.** The `nodejs-mobile-cordova` plugin ships
  Node 12, which is too old for the server (undici 6 needs Node ≥18,
  node-sqlite3-wasm uses `Object.hasOwn`). We drop in the official nodejs-mobile
  v18 prebuilt `libnode.so`; the plugin's JNI glue only uses `node::Start` +
  N-API, both ABI-stable, so it links against v18 unchanged.
- **Database: `node-sqlite3-wasm` instead of `better-sqlite3`.** Pure WASM, no
  native cross-compilation. `src/wasm-better-sqlite3.mjs` is a thin shim that
  reproduces the subset of the `better-sqlite3` API the server uses (variadic
  binds, named params, `transaction()`, `pragma()`), aliased over
  `better-sqlite3` **only in the mobile bundle** — desktop/server builds are
  untouched.
- **small-icu workaround.** nodejs-mobile's Node is built with small-icu, so
  Unicode property escapes (`\p{ID_Start}`) throw. The bundler rewrites Express
  5's path-to-regexp lexer to ASCII ranges (route params here are ASCII).
- **Auth.** The server mints a session for a hidden local user (like the desktop
  app) and hands it to the WebView via the loopback handshake, so there's no
  login screen.

The client changes (`client/src/lib/runtime.ts`, `mobile-bootstrap.ts`, and the
API-origin plumbing) are inert on web/desktop — they only activate when
`window.Capacitor.isNativePlatform()` is true.

## Prerequisites

- **JDK 17** (Capacitor 6 compiles against Java 17). `java-21` here is a JRE only.
- Android SDK with `platforms;android-34`, `build-tools;34.0.0`,
  `ndk;27.2.12479018`, `cmake;3.22.1`.
- Node ≥ 20 (for the Capacitor 6 CLI and the build scripts).

## First-time setup

```bash
cd mobile
npm install
npm run fetch:vendor      # download nodejs-mobile v18 prebuilt (~57MB)
npm run build:all         # bundle server + stage node project + stage web
npm run cap:add           # create android/ and apply the gradle patches
```

## Build & run

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$HOME/android-sdk

npm run sync              # rebuild everything + cap sync + re-apply android patches
npm run apk:debug         # -> android/app/build/outputs/apk/debug/app-debug.apk

# install + launch on a running emulator/device
adb install -r -g android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n co.freellmapi.app/.MainActivity
```

Run `npm run sync` after any change to the client, the server, or the mobile
glue — it re-bundles, re-stages the assets/native libs, and re-applies the
gradle patches that Capacitor regenerates away.

## Tests

```bash
npm run test:shim         # behavioural tests for the wasm better-sqlite3 shim
npm run test:server       # boots the bundled server on the wasm DB and hits the HTTP API
```

## Regenerated vs. source

`android/`, `www/`, `vendor/`, `nodejs-project/server.mjs`, and the staged
`node_modules` are all generated (gitignored). The source of truth is
`src/`, `scripts/`, `nodejs-project/{main.js,package.json}`, and
`capacitor.config.ts`.
