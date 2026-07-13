import { describe, it, expect, afterEach } from 'vitest';
import { readEnv, readEnvTrimmed } from '../../lib/env-compat.js';
import { sanitizeProviderErrorMessage } from '../../lib/error-redaction.js';
import { classifyClaudeFamily } from '../../services/anthropic-map.js';

const TOUCHED = ['DRAWIN_X', 'FREEAPI_X', 'LEGACY_X'];

afterEach(() => {
  for (const k of TOUCHED) delete process.env[k];
});

describe('env-compat', () => {
  it('prefers the DRAWIN_ name over the legacy one', () => {
    process.env.DRAWIN_X = 'new';
    process.env.FREEAPI_X = 'old';
    expect(readEnv('DRAWIN_X', 'FREEAPI_X')).toBe('new');
  });

  it('falls back to the legacy name so a pre-rename .env keeps working', () => {
    process.env.FREEAPI_X = 'old';
    expect(readEnv('DRAWIN_X', 'FREEAPI_X')).toBe('old');
  });

  it('treats an empty value as unset and keeps looking', () => {
    process.env.DRAWIN_X = '   ';
    process.env.FREEAPI_X = 'old';
    expect(readEnv('DRAWIN_X', 'FREEAPI_X')).toBe('old');
  });

  it('returns undefined / empty string when nothing is set', () => {
    expect(readEnv('DRAWIN_X', 'FREEAPI_X')).toBeUndefined();
    expect(readEnvTrimmed('DRAWIN_X', 'FREEAPI_X')).toBe('');
  });

  it('walks several legacy names in order', () => {
    process.env.LEGACY_X = 'third';
    expect(readEnv('DRAWIN_X', 'FREEAPI_X', 'LEGACY_X')).toBe('third');
  });
});

describe('rename compatibility', () => {
  it('redacts both the drawin- and the pre-rename freellmapi- key prefix', () => {
    const redactedNew = sanitizeProviderErrorMessage('bad key drawin-0123456789abcdef here');
    const redactedOld = sanitizeProviderErrorMessage('bad key freellmapi-0123456789abcdef here');
    expect(redactedNew).not.toContain('0123456789abcdef');
    expect(redactedOld).not.toContain('0123456789abcdef');
    expect(redactedNew).toContain('[redacted-key]');
    expect(redactedOld).toContain('[redacted-key]');
  });

  it('accepts both spellings of the auto-routing model sentinel', () => {
    expect(classifyClaudeFamily('drawin-auto')).toBe('default');
    expect(classifyClaudeFamily('freellmapi-auto')).toBe('default');
  });
});
