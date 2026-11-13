import { describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  changedInShopify,
  exchangeCode,
  hasRequiredScopes,
  isSyncableThemeFile,
  needsRefresh,
  normalizeShopDomain,
  parseReturnOrigins,
  refreshAccessToken,
  verifyOAuthHmac,
  verifyWebhookHmac,
  authorizeUrl,
  numericId,
} from './shopifyCore';

const SECRET = 'hush';

describe('normalizeShopDomain', () => {
  it.each([
    ['my-store', 'my-store.myshopify.com'],
    ['My-Store.myshopify.com', 'my-store.myshopify.com'],
    ['https://my-store.myshopify.com/admin/themes', 'my-store.myshopify.com'],
    ['https://admin.shopify.com/store/my-store/themes', 'my-store.myshopify.com'],
  ])('reads %s', (input, expected) => {
    expect(normalizeShopDomain(input)).toBe(expected);
  });

  it.each(['mystore.com', 'evil.com/x.myshopify.com', 'my_store', '', 'a.myshopify.com.evil.com'])('rejects %s', (input) => {
    expect(normalizeShopDomain(input)).toBeNull();
  });
});

describe('parseReturnOrigins', () => {
  it('reads a clean list', () => {
    expect(parseReturnOrigins('https://www.tryshopiflow.com,http://localhost:8080')).toEqual([
      'https://www.tryshopiflow.com',
      'http://localhost:8080',
    ]);
  });

  it('forgives quotes, spaces, slashes and paths', () => {
    expect(parseReturnOrigins('"https://www.tryshopiflow.com/" , \'http://localhost:8081/home\'')).toEqual([
      'https://www.tryshopiflow.com',
      'http://localhost:8081',
    ]);
  });

  it('falls back to the live app when unset or unusable', () => {
    expect(parseReturnOrigins(undefined)).toEqual(['https://www.tryshopiflow.com']);
    expect(parseReturnOrigins('www.tryshopiflow.com, javascript:alert(1)')).toEqual(['https://www.tryshopiflow.com']);
  });
});

describe('verifyOAuthHmac', () => {
  const sign = (params: Record<string, string>) => {
    const message = Object.entries(params).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('&');
    return createHmac('sha256', SECRET).update(message).digest('hex');
  };
  const base = { code: 'abc', shop: 'my-store.myshopify.com', state: 'n0nce', timestamp: '1700000000' };

  it('accepts a correctly signed callback', async () => {
    const params = new URLSearchParams({ ...base, hmac: sign(base) });
    expect(await verifyOAuthHmac(params, SECRET)).toBe(true);
  });

  it('rejects a tampered shop', async () => {
    const params = new URLSearchParams({ ...base, hmac: sign(base) });
    params.set('shop', 'other.myshopify.com');
    expect(await verifyOAuthHmac(params, SECRET)).toBe(false);
  });

  it('rejects a missing hmac or secret', async () => {
    expect(await verifyOAuthHmac(new URLSearchParams(base), SECRET)).toBe(false);
    expect(await verifyOAuthHmac(new URLSearchParams({ ...base, hmac: sign(base) }), '')).toBe(false);
  });
});

describe('verifyWebhookHmac', () => {
  it('checks the base64 digest of the raw body', async () => {
    const body = '{"id":1}';
    const header = createHmac('sha256', SECRET).update(body).digest('base64');
    expect(await verifyWebhookHmac(body, header, SECRET)).toBe(true);
    expect(await verifyWebhookHmac(`${body} `, header, SECRET)).toBe(false);
    expect(await verifyWebhookHmac(body, null, SECRET)).toBe(false);
  });
});

describe('tokens', () => {
  const okResponse = (body: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }));

  it('asks for an expiring offline token in the code exchange', async () => {
    const fetchImpl = okResponse({ access_token: 'a', scope: 'write_themes', expires_in: 3600, refresh_token: 'r', refresh_token_expires_in: 7776000 });
    const tokens = await exchangeCode('s.myshopify.com', 'code', 'id', 'secret', fetchImpl as unknown as typeof fetch);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://s.myshopify.com/admin/oauth/access_token');
    const sent = new URLSearchParams(init.body as URLSearchParams);
    expect(sent.get('expiring')).toBe('1');
    expect(sent.get('code')).toBe('code');
    expect(tokens.refreshToken).toBe('r');
    expect(new Date(tokens.accessTokenExpiresAt!).getTime()).toBeGreaterThan(Date.now() + 3500 * 1000);
  });

  it('refreshes with grant_type=refresh_token', async () => {
    const fetchImpl = okResponse({ access_token: 'b', expires_in: 3600, refresh_token: 'r2' });
    const tokens = await refreshAccessToken('s.myshopify.com', 'r1', 'id', 'secret', fetchImpl as unknown as typeof fetch);
    const sent = new URLSearchParams((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as URLSearchParams);
    expect(sent.get('grant_type')).toBe('refresh_token');
    expect(sent.get('refresh_token')).toBe('r1');
    expect(tokens.refreshToken).toBe('r2');
  });

  it('refreshes only when under five minutes are left', () => {
    const now = Date.now();
    expect(needsRefresh(new Date(now + 10 * 60_000).toISOString(), now)).toBe(false);
    expect(needsRefresh(new Date(now + 60_000).toISOString(), now)).toBe(true);
    expect(needsRefresh(null, now)).toBe(false);
  });

  it('treats a write scope as covering its read scope', () => {
    expect(hasRequiredScopes('write_themes,write_files,read_products')).toBe(true);
    expect(hasRequiredScopes('read_themes,write_files,read_products')).toBe(false);
  });
});

describe('theme files', () => {
  it('only lets merchant-editable JSON through a sync', () => {
    expect(isSyncableThemeFile('config/settings_data.json')).toBe(true);
    expect(isSyncableThemeFile('templates/product.offer.json')).toBe(true);
    expect(isSyncableThemeFile('sections/header-group.json')).toBe(true);
    expect(isSyncableThemeFile('layout/theme.liquid')).toBe(false);
    expect(isSyncableThemeFile('config/settings_schema.json')).toBe(false);
    expect(isSyncableThemeFile('templates/../layout/theme.json')).toBe(false);
    expect(isSyncableThemeFile('assets/theme.js')).toBe(false);
  });

  it('reports files edited in Shopify since our last write', () => {
    const ours = { 'templates/index.json': 'aaa', 'config/settings_data.json': 'bbb' };
    expect(changedInShopify(ours, { 'templates/index.json': 'aaa', 'config/settings_data.json': 'ccc', 'templates/new.json': 'x' })).toEqual([
      'config/settings_data.json',
    ]);
    // Never synced yet: nothing to conflict with.
    expect(changedInShopify(null, { 'templates/index.json': 'zzz' })).toEqual([]);
  });

  it('builds the authorize URL and reads numeric ids', () => {
    const url = new URL(authorizeUrl('s.myshopify.com', 'cid', 'https://x/cb', 'st'));
    expect(url.origin + url.pathname).toBe('https://s.myshopify.com/admin/oauth/authorize');
    expect(url.searchParams.get('scope')).toContain('write_themes');
    expect(url.searchParams.get('state')).toBe('st');
    expect(numericId('gid://shopify/OnlineStoreTheme/123')).toBe('123');
  });
});
