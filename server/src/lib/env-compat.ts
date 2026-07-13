// Configuration was prefixed FREEAPI_/FREELLMAPI_ before the project was
// renamed to Drawin AI. Every env read goes through here so a DRAWIN_ name wins
// when set, while an existing .env written against the old names keeps working.
//
// Deliberately reads process.env on every call rather than snapshotting: the
// desktop and mobile shells mutate process.env after this module is imported.

/** First non-empty value among `name` and its legacy aliases, else undefined. */
export function readEnv(name: string, ...legacyNames: string[]): string | undefined {
  for (const candidate of [name, ...legacyNames]) {
    const value = process.env[candidate];
    if (value !== undefined && value.trim() !== '') return value;
  }
  return undefined;
}

/** Same, trimmed, with undefined collapsed to ''. Convenient at call sites that
 *  only care whether a value is present. */
export function readEnvTrimmed(name: string, ...legacyNames: string[]): string {
  return readEnv(name, ...legacyNames)?.trim() ?? '';
}
