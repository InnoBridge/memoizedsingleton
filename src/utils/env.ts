import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Cached key/value pairs from .env
let cachedDotEnv: Record<string, string> | null | undefined;

/**
 * Parse the .env file at `dotEnvPath` and populate the in-memory cache.
 *
 * If the file is missing or unreadable the cache is set to `null` to avoid
 * repeated IO attempts.
 */
function parseDotEnv(dotEnvPath: string): void {
  if (cachedDotEnv !== undefined) return;

  try {
    if (!existsSync(dotEnvPath)) {
      cachedDotEnv = null;
      return;
    }

    const raw = readFileSync(dotEnvPath, 'utf8');
    const parsed: Record<string, string> = {};
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue; // skip empty
      if (line.startsWith('#') || line.startsWith(';')) continue; // comment

      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) continue;

      const key = line.slice(0, eqIndex).trim();
      let val = line.slice(eqIndex + 1).trim();

      // remove surrounding quotes if present
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1);
      }

      parsed[key] = val;
    }

    cachedDotEnv = parsed;
    return;
  } catch (err) {
    cachedDotEnv = null;
    return;
  }
}

/*
 * Read an env var by name. Lookup order:
 * 1) process.env
 * 2) cached .env (lazily parsed from process.cwd()/.env)
 *
 * Throws if the variable is not found.
 */
const readEnv = (key: string, filePath?: string): string => {
  if (!key) throw new Error('Environment variable key must be provided');

  // Fast path: process.env
  const value = process.env[key];
  if (value !== undefined) return value;

  // Try to get a cached parsed .env first (single-slot cache)
  if (cachedDotEnv !== undefined && cachedDotEnv !== null && cachedDotEnv[key] !== undefined) {
    return cachedDotEnv[key];
  }

  // Resolve .env path once and parse it to populate the cache
  const dotEnvPath = resolve(process.cwd(), filePath || '.env');
  parseDotEnv(dotEnvPath);

  // Re-check the cache after parsing
  if (cachedDotEnv !== undefined && cachedDotEnv !== null && Object.prototype.hasOwnProperty.call(cachedDotEnv, key)) {
    return cachedDotEnv[key];
  }

  // If file wasn't present or couldn't be read, cachedDotEnv will be null
  if (cachedDotEnv === null) {
    throw new Error(`Environment variable ${key} not set and .env not found at ${dotEnvPath}`);
  }

  // Value not present even after parsing
  throw new Error(`Environment variable ${key} not found in process.env or ${dotEnvPath}`);
}

/**
 * Reset the in-memory parsed .env cache so subsequent calls will re-read the
 * .env file. Useful for tests which need to exercise re-parsing behavior.
 */
function clearDotEnvCache(): void {
  cachedDotEnv = undefined;
}

export { 
    readEnv, 
    clearDotEnvCache 
};
