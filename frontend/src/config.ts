export interface AppConfig {
  auth0Domain: string;
  auth0ClientId: string;
  auth0Audience: string;
  apiBaseUrl: string;
}

let cached: AppConfig | undefined;

function fromEnv(): AppConfig {
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
  return {
    auth0Domain: import.meta.env.VITE_AUTH0_DOMAIN ?? '',
    auth0ClientId: import.meta.env.VITE_AUTH0_CLIENT_ID ?? '',
    auth0Audience: import.meta.env.VITE_AUTH0_AUDIENCE ?? '',
    apiBaseUrl: apiBase || '/api',
  };
}

function isNonEmpty(c: Partial<AppConfig> | undefined): c is AppConfig {
  return !!c && typeof c.auth0Domain === 'string' && typeof c.apiBaseUrl === 'string';
}

/**
 * Fetches runtime configuration from /config.json (populated by a Kubernetes
 * ConfigMap in deployed environments). Falls back to VITE_* env vars when the
 * file is missing or empty (local dev with `npm run dev`).
 */
export async function loadConfig(): Promise<AppConfig> {
  if (cached) return cached;
  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (res.ok) {
      const parsed = (await res.json()) as Partial<AppConfig>;
      const merged: AppConfig = { ...fromEnv(), ...parsed };
      if (isNonEmpty(merged) && merged.auth0Domain) {
        cached = merged;
        return cached;
      }
    }
  } catch {
    /* fall through to env-based config */
  }
  cached = fromEnv();
  return cached;
}

/**
 * Synchronous accessor for already-loaded config. Falls back to env vars when
 * called before {@link loadConfig} resolves (e.g. from a unit test that mounts
 * the API client in isolation).
 */
export function getConfig(): AppConfig {
  return cached ?? fromEnv();
}

/** Test-only helper; not exported through the package boundary. */
export function __resetConfigForTests(): void {
  cached = undefined;
}
