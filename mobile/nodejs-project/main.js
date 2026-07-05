// nodejs-mobile entry — launched by the native runtime on app start. Runs the
// bundled FreeLLMAPI server (server.mjs) against a SQLite file in the project's
// writable directory. The WebView discovers the port + session token by polling
// GET /api/mobile/handshake, so this file only needs to boot the server.
const path = require('path');

(async () => {
  try {
    // nodejs-mobile copies this project into an internal, writable directory and
    // runs it from there, so __dirname is a fine home for the DB file.
    const dbPath = path.join(__dirname, 'freeapi.db');
    const { startMobileServer } = await import('./server.mjs');
    const { port, token } = await startMobileServer({ dbPath, preferredPort: 3001 });

    // If the nodejs-mobile bridge is present, announce readiness on its channel
    // too (belt-and-suspenders; the WebView primarily uses the HTTP handshake).
    try {
      const bridge = require('cordova-bridge');
      bridge.channel.send(JSON.stringify({ type: 'ready', port, token }));
    } catch {
      /* not running under nodejs-mobile (e.g. desktop smoke test) */
    }
    console.log(`[mobile] FreeLLMAPI server ready on 127.0.0.1:${port}`);
  } catch (err) {
    console.error('[mobile] failed to start server:', (err && err.stack) || err);
  }
})();
