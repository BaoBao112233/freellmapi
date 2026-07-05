// Entry point for the FreeLLMAPI server as it runs INSIDE nodejs-mobile on the
// Android device. esbuild bundles this (and, through it, the whole server) into
// nodejs-project/server.mjs, aliasing `better-sqlite3` -> the wasm shim and
// keeping `node-sqlite3-wasm` external (it loads its own .wasm from disk).
//
// This module is deliberately free of any nodejs-mobile / cordova-bridge
// reference so it can also be exercised on desktop Node (see
// scripts/smoke-server.mjs) with the exact same code path. The bridge wiring
// lives in nodejs-project/main.js.
import '../../server/src/env.js';
import crypto from 'node:crypto';
import type { Server } from 'node:http';
import { createApp } from '../../server/src/app.js';
import { initDb, getDb, getSetting } from '../../server/src/db/index.js';
import { loadConfig } from '../../server/src/lib/config.js';
import { startHealthChecker } from '../../server/src/services/health.js';
import { startCatalogSync } from '../../server/src/services/catalog-sync.js';
import { applyProxyUrl, applyProxyEnabled, applyProxyBypass } from '../../server/src/lib/proxy.js';
import { applyDeclarativeConfigFromEnv } from '../../server/src/services/declarative-config.js';
import { ensurePollinationsVideoModels } from '../../server/src/services/media.js';
import { NodeScheduler } from '../../server/src/lib/scheduler.js';
import { userCount, createUser, createSession } from '../../server/src/services/auth.js';

export interface StartOptions {
  /** Absolute path to the SQLite file inside the app's writable dir. */
  dbPath: string;
  /** First port to try; scans upward if busy. */
  preferredPort?: number;
  host?: string;
}

export interface MobileServerHandle {
  server: Server;
  port: number;
  /** Session token for the hidden local user, handed to the WebView so the
   *  dashboard is authenticated without a login screen. */
  token: string;
}

export async function startMobileServer(opts: StartOptions): Promise<MobileServerHandle> {
  // Leave NODE_ENV unset (like the desktop app): migrations run because it's
  // `!== 'development'`, and the encryption key is auto-generated + persisted in
  // the on-device DB because it's `!== 'production'` (a phone can't supply an
  // ENCRYPTION_KEY env). Only force it away from 'development' if something set
  // that, so migrations still run.
  if (process.env.NODE_ENV === 'development') {
    delete process.env.NODE_ENV;
  }

  const host = opts.host ?? '127.0.0.1';
  const base = loadConfig();
  const config = {
    ...base,
    host,
    dbPath: opts.dbPath,
    clientDist: null,
    // The dashboard is served by the Capacitor WebView from app assets, not by
    // this server — it only needs to answer /api and /v1.
    serveStaticAssets: false,
    // The WebView runs at these origins (Capacitor's android scheme + loopback),
    // so CORS must accept them or every /api call from the dashboard is blocked.
    dashboardOrigins: [
      ...base.dashboardOrigins,
      'https://localhost',
      'http://localhost',
      'capacitor://localhost',
    ],
  };

  initDb(config.dbPath);
  ensurePollinationsVideoModels(); // keyless video defaults (no catalog source)
  applyDeclarativeConfigFromEnv();
  applyProxyUrl(getSetting('proxy_url') ?? '');
  applyProxyEnabled(getSetting('proxy_enabled') !== '0');
  applyProxyBypass(getSetting('proxy_bypass') ?? '');

  const token = ensureSessionToken();

  const app = createApp(config);
  // Unauthenticated loopback handshake: the WebView polls this on launch to
  // discover the port is live and to pick up the local session token, so the
  // dashboard is authenticated without a login screen and without depending on
  // the nodejs-mobile JS bridge for anything but starting the runtime.
  app.get('/api/mobile/handshake', (_req, res) => {
    res.json({ ok: true, token });
  });

  const { server, port } = await listenWithScan(app, host, opts.preferredPort ?? 3001);

  const scheduler = new NodeScheduler();
  startHealthChecker(scheduler);
  startCatalogSync(scheduler);

  return { server, port, token };
}

// Mirror the desktop app: the dashboard authenticates as a hidden local user
// whose random password is never shown; sessions are minted straight from the DB.
function ensureSessionToken(): string {
  if (userCount() === 0) {
    createUser('android@localhost', crypto.randomBytes(24).toString('hex'));
  }
  const first = getDb()
    .prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1')
    .get() as { id: number };
  return createSession(first.id);
}

async function listenWithScan(
  app: ReturnType<typeof createApp>,
  host: string,
  start: number,
  attempts = 50,
): Promise<{ server: Server; port: number }> {
  for (let port = start; port < start + attempts; port++) {
    const server = await tryListen(app, host, port);
    if (server) return { server, port };
  }
  throw new Error(`No free port found in ${start}-${start + attempts - 1}`);
}

function tryListen(
  app: ReturnType<typeof createApp>,
  host: string,
  port: number,
): Promise<Server | null> {
  return new Promise((resolve) => {
    const server = app.listen(port, host);
    server.once('listening', () => resolve(server));
    server.once('error', () => resolve(null));
  });
}
