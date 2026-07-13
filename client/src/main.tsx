import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { bootstrapMobile } from './mobile-bootstrap'

const rootEl = document.getElementById('root')!

function render() {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// On web/desktop bootstrapMobile() resolves immediately and render() runs at
// once. On Android it starts the on-device server and resolves once the
// dashboard has a server origin + session token; show a minimal splash while
// that happens (first launch also runs DB migrations).
const isNative = !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
  .Capacitor?.isNativePlatform?.()

if (isNative) {
  rootEl.innerHTML =
    '<div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:system-ui,sans-serif;color:#888;background:#0b0b0c">' +
    '<div style="width:34px;height:34px;border:3px solid #333;border-top-color:#888;border-radius:50%;animation:fl-spin 0.9s linear infinite"></div>' +
    '<div>Starting Drawin AI…</div>' +
    '<style>@keyframes fl-spin{to{transform:rotate(360deg)}}</style></div>'
}

bootstrapMobile().finally(render)
