// nodejs-mobile entry — launched by the native runtime on app start. Runs the
// bundled Drawin AI server (server.mjs) against a SQLite file in the project's
// writable directory. The WebView discovers the port + session token by polling
// GET /api/mobile/handshake, so this file only needs to boot the server.
const path = require('path');

(async () => {
  try {
    // nodejs-mobile copies this project into an internal, writable directory and
    // runs it from there, so __dirname is a fine home for the DB file.
    // freeapi.db is the pre-rename filename: an app updated in place still has
    // its database under it, so keep using it instead of starting empty.
    const legacyDbPath = path.join(__dirname, 'freeapi.db');
    const dbPath = require('fs').existsSync(legacyDbPath)
      ? legacyDbPath
      : path.join(__dirname, 'drawin.db');
    const { startMobileServer } = await import('./server.mjs');
    // Bind 0.0.0.0 (not just loopback) so the on-device server is reachable from
    // other machines on the same LAN — the phone can act as an LLM API gateway.
    // `/v1/*` stays protected by the unified API key; the unauthenticated
    // /api/mobile/handshake is locked to loopback in startMobileServer so a LAN
    // peer can't lift the admin session token.
    const { port, token } = await startMobileServer({ dbPath, preferredPort: 3001, host: '0.0.0.0' });

    // If the nodejs-mobile bridge is present, announce readiness on its channel
    // too (belt-and-suspenders; the WebView primarily uses the HTTP handshake).
    try {
      const bridge = require('cordova-bridge');
      bridge.channel.send(JSON.stringify({ type: 'ready', port, token }));
    } catch {
      /* not running under nodejs-mobile (e.g. desktop smoke test) */
    }
    console.log(`[mobile] Drawin AI server ready on 0.0.0.0:${port} (LAN-reachable)`);
  } catch (err) {
    console.error('[mobile] failed to start server:', (err && err.stack) || err);
  }
})();
