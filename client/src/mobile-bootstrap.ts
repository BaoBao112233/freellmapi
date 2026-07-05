// Android (Capacitor + nodejs-mobile) startup glue. On web and desktop this is
// a no-op — `bootstrapMobile()` returns immediately and nothing here runs.
//
// On the device the dashboard is loaded from bundled assets while the API lives
// in an on-device Node server started by nodejs-mobile. This module:
//   1. starts the nodejs-mobile runtime (which boots server.mjs),
//   2. polls the loopback handshake until the server answers,
//   3. records the server origin + local session token,
// so React renders straight into an authenticated dashboard.
import { setApiOrigin } from './lib/runtime'
import { setToken } from './lib/api'

// server-main.ts scans upward from 3001 if a port is busy; on a phone the app
// is effectively alone, so this small range is plenty to rediscover it.
const CANDIDATE_PORTS = Array.from({ length: 10 }, (_, i) => 3001 + i)
const BOOT_TIMEOUT_MS = 45_000

interface CapacitorGlobal {
  isNativePlatform?: () => boolean
}
interface NodejsGlobal {
  start?: (script: string, callback?: () => void, options?: Record<string, unknown>) => void
}

function isNative(): boolean {
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor
  return !!cap?.isNativePlatform?.()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// The nodejs-mobile plugin injects `window.nodejs` asynchronously after the
// WebView loads. Wait briefly for it before starting the runtime.
async function waitForNodejs(timeoutMs: number): Promise<NodejsGlobal | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const nodejs = (window as unknown as { nodejs?: NodejsGlobal }).nodejs
    if (nodejs?.start) return nodejs
    await delay(150)
  }
  return null
}

async function probeHandshake(): Promise<{ origin: string; token: string } | null> {
  for (const port of CANDIDATE_PORTS) {
    const origin = `http://localhost:${port}`
    try {
      const res = await fetch(`${origin}/api/mobile/handshake`, { cache: 'no-store' })
      if (res.ok) {
        const body = (await res.json()) as { token?: string }
        if (body?.token) return { origin, token: body.token }
      }
    } catch {
      /* server not up on this port yet */
    }
  }
  return null
}

export async function bootstrapMobile(): Promise<void> {
  if (!isNative()) return

  const nodejs = await waitForNodejs(8_000)
  if (nodejs?.start) {
    try {
      // Node persists its DB in the project dir; a fresh start each launch is
      // fine because migrations are idempotent.
      nodejs.start('main.js', () => {}, { redirectOutputToLogcat: true })
    } catch {
      /* if it's already running from this session, the handshake still succeeds */
    }
  }

  const deadline = Date.now() + BOOT_TIMEOUT_MS
  while (Date.now() < deadline) {
    const found = await probeHandshake()
    if (found) {
      setApiOrigin(found.origin)
      setToken(found.token)
      return
    }
    await delay(700)
  }
  // Timed out — fall through and let the dashboard render its own
  // "server unreachable" state rather than hanging on a blank screen forever.
}
