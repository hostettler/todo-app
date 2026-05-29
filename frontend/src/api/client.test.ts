import { describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiError } from './client';

describe('apiFetch', () => {
  const token = async () => 'test-token';

  it('sets Authorization, Accept and Content-Type for JSON bodies', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const headers = new Headers(init.headers);
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      expect(headers.get('Accept')).toBe('application/json');
      expect(headers.get('Content-Type')).toBe('application/json');
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const out = await apiFetch<{ ok: boolean }>(
      '/tags',
      { method: 'POST', body: JSON.stringify({ name: 'x' }) },
      token,
    );

    expect(out).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('returns undefined for 204 No Content', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    const out = await apiFetch('/tags/1', { method: 'DELETE' }, token);
    expect(out).toBeUndefined();
  });

  it('throws ApiError with status and parsed body on non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ code: 'CONFLICT' }), { status: 409 })),
    );
    await expect(apiFetch('/tags', { method: 'POST', body: '{}' }, token)).rejects.toMatchObject({
      status: 409,
      body: { code: 'CONFLICT' },
    });
  });

  it('keeps non-JSON error body as raw text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('plain text error', { status: 500 })),
    );
    try {
      await apiFetch('/tags', { method: 'GET' }, token);
      throw new Error('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).body).toBe('plain text error');
      expect((e as ApiError).status).toBe(500);
    }
  });

  it('uses absolute URL when path starts with http', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe('http://other/api/tags');
      return new Response('null', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    await apiFetch('http://other/api/tags', { method: 'GET' }, token);
  });

  it('returns null for empty body on 2xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 200 })));
    const out = await apiFetch('/tags', { method: 'GET' }, token);
    expect(out).toBeNull();
  });
});
