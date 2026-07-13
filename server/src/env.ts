import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readEnv } from './lib/env-compat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DRAWIN_ENV_PATH lets embedders (e.g. the desktop app, where __dirname sits
// inside a bundle) point at an explicit .env — or at nothing: dotenv silently
// no-ops on a missing file either way.
dotenv.config({
  path: readEnv('DRAWIN_ENV_PATH', 'FREEAPI_ENV_PATH') ?? path.resolve(__dirname, '../../.env'),
});
