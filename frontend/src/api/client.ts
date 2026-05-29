import { useAuth0 } from '@auth0/auth0-react';
import { getConfig } from '../config';

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
  }
}

export type GetAccessToken = (options?: { audience?: string }) => Promise<string>;

/**
 * Issues a JSON request against the Quarkus API with a fresh Auth0 access
 * token.  All errors are normalised to {@link ApiError} so callers (and
 * React Query) can distinguish HTTP problems from network failures.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit,
  getAccessToken: GetAccessToken,
): Promise<T> {
  const { apiBaseUrl, auth0Audience } = getConfig();
  const token = await getAccessToken({ audience: auth0Audience });
  const url = path.startsWith('http') ? path : `${apiBaseUrl}${path}`;
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');
  const response = await fetch(url, { ...init, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? safeJson(text) : null;
  if (!response.ok) {
    throw new ApiError(response.status, body, `HTTP ${response.status} ${response.statusText}`);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function useApi() {
  const { getAccessTokenSilently } = useAuth0();
  const tokenFn: GetAccessToken = (opts) =>
    getAccessTokenSilently({
      authorizationParams: { audience: opts?.audience ?? getConfig().auth0Audience },
    });
  return {
    get: <T,>(path: string) => apiFetch<T>(path, { method: 'GET' }, tokenFn),
    post: <T,>(path: string, body: unknown) =>
      apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }, tokenFn),
    put: <T,>(path: string, body: unknown) =>
      apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }, tokenFn),
    patch: <T,>(path: string, body: unknown) =>
      apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, tokenFn),
    delete: <T,>(path: string) => apiFetch<T>(path, { method: 'DELETE' }, tokenFn),
  };
}
