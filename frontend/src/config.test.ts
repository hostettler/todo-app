import { afterEach, describe, expect, it, vi } from 'vitest';
import { __resetConfigForTests, getConfig, loadConfig } from './config';

afterEach(() => {
  __resetConfigForTests();
  vi.unstubAllGlobals();
});

describe('loadConfig', () => {
  it('returns parsed values when /config.json is populated', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            auth0Domain: 'tenant.auth0.com',
            auth0ClientId: 'client-123',
            auth0Audience: 'https://api.example.com',
            apiBaseUrl: '/api',
          }),
          { status: 200 },
        ),
      ),
    );

    const cfg = await loadConfig();
    expect(cfg.auth0Domain).toBe('tenant.auth0.com');
    expect(cfg.auth0ClientId).toBe('client-123');
    expect(getConfig().auth0Audience).toBe('https://api.example.com');
  });

  it('falls back to env defaults when /config.json is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const cfg = await loadConfig();
    expect(cfg.apiBaseUrl).toBe('/api');
  });

  it('falls back to env defaults when /config.json returns empty values', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ auth0Domain: '', auth0ClientId: '', auth0Audience: '', apiBaseUrl: '' }),
          { status: 200 },
        ),
      ),
    );
    const cfg = await loadConfig();
    expect(cfg.apiBaseUrl).toBe('/api');
  });

  it('falls back to env defaults when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    const cfg = await loadConfig();
    expect(cfg.apiBaseUrl).toBe('/api');
  });

  it('caches the result on subsequent calls', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          auth0Domain: 'first.example',
          auth0ClientId: 'a',
          auth0Audience: 'b',
          apiBaseUrl: '/api',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    await loadConfig();
    await loadConfig();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
