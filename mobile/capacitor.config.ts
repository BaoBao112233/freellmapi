import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.freellmapi.app',
  appName: 'FreeLLMAPI',
  // The built dashboard is staged here by scripts/stage-client.mjs.
  webDir: 'www',
  // The dashboard talks to the on-device Node server over http://localhost:<port>.
  // Android blocks cleartext by default on API 28+, so allow it (loopback only —
  // nothing leaves the device).
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
