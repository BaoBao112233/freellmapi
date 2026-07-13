// Runtime API origin. On web and in the desktop app the dashboard is served
// from the same origin as the API, so this stays '' and every request is
// relative (unchanged behaviour). In the Android app the dashboard is loaded
// from bundled assets while the API runs on an on-device Node server at
// http://localhost:<port>, so the mobile bootstrap sets an absolute origin here
// and all API calls are prefixed with it.
const ORIGIN_KEY = 'drawin_api_origin';
// Pre-rename key. An app updated in place still has the origin under the old
// name, and re-reading it here saves the mobile shell a bootstrap round trip.
const LEGACY_ORIGIN_KEY = 'freellmapi_api_origin';

let apiOrigin = '';
try {
  apiOrigin = localStorage.getItem(ORIGIN_KEY) ?? localStorage.getItem(LEGACY_ORIGIN_KEY) ?? '';
} catch {
  /* localStorage unavailable — keep relative */
}

export function getApiOrigin(): string {
  return apiOrigin;
}

export function setApiOrigin(origin: string): void {
  apiOrigin = origin.replace(/\/$/, '');
  try {
    localStorage.setItem(ORIGIN_KEY, apiOrigin);
  } catch {
    /* ignore */
  }
}

// The absolute origin the server is reachable at, for building user-facing
// snippet/base URLs (e.g. the unified /v1 endpoint). Prefers the mobile origin
// when set, else the dev-server port in DEV, else the page origin.
export function resolveApiBaseUrl(): string {
  const origin = getApiOrigin();
  if (origin) return origin;
  return import.meta.env.DEV
    ? `http://${window.location.hostname}:${__SERVER_PORT__}`
    : window.location.origin;
}
