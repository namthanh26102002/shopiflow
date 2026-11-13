// Shopify OAuth and Admin API helpers with no Deno-specific APIs, so the
// vitest suite can test them too (shopifyCore.test.ts).
//
// Protocol details follow shopify.dev "Authenticate a standalone or API-only
// app" and "Use expiring offline access tokens" (required for public apps
// created after April 1, 2026).

export const SHOPIFY_API_VERSION = '2026-10';

/** Permissions the app asks for. Keep in step with the Dev Dashboard config. */
export const SHOPIFY_SCOPES = ['read_themes', 'write_themes', 'write_files', 'read_products'];

const SHOP_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

/**
 * Normalises what a merchant types ("my-store", "https://my-store.myshopify.com/admin")
 * to "my-store.myshopify.com", or null when it is not a myshopify domain.
 * Custom domains (mystore.com) cannot be used: OAuth runs on the myshopify host.
 */
export const normalizeShopDomain = (input: string): string | null => {
  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '').split(/[/?#]/)[0];
  // admin.shopify.com/store/<handle> is what merchants see in their address bar.
  const adminMatch = input.trim().toLowerCase().match(/admin\.shopify\.com\/store\/([a-z0-9][a-z0-9-]*)/);
  if (adminMatch) value = `${adminMatch[1]}.myshopify.com`;
  if (/^[a-z0-9][a-z0-9-]*$/.test(value)) value = `${value}.myshopify.com`;
  return SHOP_PATTERN.test(value) ? value : null;
};

export const isShopDomain = (value: string) => SHOP_PATTERN.test(value);

export const DEFAULT_RETURN_ORIGIN = 'https://www.tryshopiflow.com';

/**
 * SHOPIFY_RETURN_ORIGINS as a list of origins. Forgiving about how the secret
 * was typed (quotes, spaces, trailing slashes, a path); anything that is not
 * an http(s) URL is dropped. Never empty: falls back to the live app.
 */
export const parseReturnOrigins = (raw: string | undefined | null): string[] => {
  const origins: string[] = [];
  for (const part of (raw ?? '').split(/[,\s]+/)) {
    const cleaned = part.trim().replace(/^['"]+|['"]+$/g, '');
    if (!cleaned) continue;
    try {
      const url = new URL(cleaned);
      if ((url.protocol === 'https:' || url.protocol === 'http:') && !origins.includes(url.origin)) origins.push(url.origin);
    } catch {
      // Not a URL: ignore it rather than break sign-in.
    }
  }
  return origins.length > 0 ? origins : [DEFAULT_RETURN_ORIGIN];
};

const encoder = new TextEncoder();

const hmacKey = (secret: string) =>
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);

const toHex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

const toBase64 = (bytes: ArrayBuffer) => {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
};

/** Constant-time string comparison. */
export const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/**
 * Verifies the hmac on Shopify's OAuth redirect: drop `hmac`, sort the rest,
 * join as key=value with &, HMAC-SHA256 with the client secret, hex.
 */
export const verifyOAuthHmac = async (params: URLSearchParams, secret: string): Promise<boolean> => {
  const hmac = params.get('hmac');
  if (!hmac || !secret) return false;
  const message = [...params.entries()]
    .filter(([key]) => key !== 'hmac')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const digest = toHex(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(message)));
  return safeEqual(digest, hmac.toLowerCase());
};

/** Verifies X-Shopify-Hmac-Sha256: base64 HMAC-SHA256 of the raw body. */
export const verifyWebhookHmac = async (rawBody: string, header: string | null, secret: string): Promise<boolean> => {
  if (!header || !secret) return false;
  const digest = toBase64(await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(rawBody)));
  return safeEqual(digest, header);
};

export const randomState = () => toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);

export const authorizeUrl = (shop: string, clientId: string, redirectUri: string, state: string) =>
  `https://${shop}/admin/oauth/authorize?${new URLSearchParams({
    client_id: clientId,
    scope: SHOPIFY_SCOPES.join(','),
    redirect_uri: redirectUri,
    state,
  })}`;

export interface TokenSet {
  accessToken: string;
  accessTokenExpiresAt: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  scope: string;
}

interface TokenResponse {
  access_token: string;
  scope?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

const toTokenSet = (body: TokenResponse, now: number): TokenSet => ({
  accessToken: body.access_token,
  accessTokenExpiresAt: body.expires_in ? new Date(now + body.expires_in * 1000).toISOString() : null,
  refreshToken: body.refresh_token ?? null,
  refreshTokenExpiresAt: body.refresh_token_expires_in
    ? new Date(now + body.refresh_token_expires_in * 1000).toISOString()
    : null,
  scope: body.scope ?? '',
});

export class ShopifyAuthError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const postToken = async (shop: string, params: Record<string, string>, fetchImpl: typeof fetch): Promise<TokenSet> => {
  const response = await fetchImpl(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(params),
  });
  if (!response.ok) {
    throw new ShopifyAuthError(`Shopify token request failed (${response.status})`, response.status);
  }
  const body = (await response.json()) as TokenResponse;
  if (!body.access_token) throw new ShopifyAuthError('Shopify returned no access token', 502);
  return toTokenSet(body, Date.now());
};

/** Code exchange for an expiring offline token (expiring=1). */
export const exchangeCode = (shop: string, code: string, clientId: string, clientSecret: string, fetchImpl: typeof fetch = fetch) =>
  postToken(shop, { client_id: clientId, client_secret: clientSecret, code, expiring: '1' }, fetchImpl);

/** Trades the refresh token for a new access + refresh token pair. */
export const refreshAccessToken = (shop: string, refreshToken: string, clientId: string, clientSecret: string, fetchImpl: typeof fetch = fetch) =>
  postToken(
    shop,
    { client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken },
    fetchImpl,
  );

/** True when an expiring token has under five minutes left (null = never expires). */
export const needsRefresh = (expiresAt: string | null, now = Date.now()) =>
  expiresAt !== null && new Date(expiresAt).getTime() - now < 5 * 60 * 1000;

/** Granted scopes cover what we asked for (a write scope implies its read). */
export const hasRequiredScopes = (granted: string) => {
  const set = new Set(granted.split(',').map((s) => s.trim()).filter(Boolean));
  return SHOPIFY_SCOPES.every((scope) => set.has(scope) || (scope.startsWith('read_') && set.has(`write_${scope.slice(5)}`)));
};

export class ShopifyApiError extends Error {
  constructor(message: string, readonly status: number, readonly details?: unknown) {
    super(message);
  }
}

export const adminGraphql = async <T>(
  shop: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {},
  fetchImpl: typeof fetch = fetch,
): Promise<T> => {
  const response = await fetchImpl(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
    body: JSON.stringify({ query, variables }),
  });
  const text = await response.text();
  let body: { data?: T; errors?: Array<{ message: string; extensions?: { code?: string } }> } = {};
  try {
    body = JSON.parse(text);
  } catch {
    throw new ShopifyApiError(`Shopify returned ${response.status}: ${text.slice(0, 200)}`, response.status);
  }
  if (!response.ok || body.errors?.length) {
    const message = body.errors?.map((e) => e.message).join('; ') || `Shopify returned ${response.status}`;
    const denied = body.errors?.some((e) => e.extensions?.code === 'ACCESS_DENIED') || response.status === 403;
    throw new ShopifyApiError(message, denied ? 403 : response.status >= 400 ? response.status : 502, body.errors);
  }
  return body.data as T;
};

/** "gid://shopify/OnlineStoreTheme/123" → "123". */
export const numericId = (gid: string) => gid.split('/').pop() ?? gid;

/** Only these files may be written by a sync: the JSON a merchant edits. */
export const isSyncableThemeFile = (filename: string) =>
  filename === 'config/settings_data.json' ||
  /^templates\/[a-z0-9_.-]+\.json$/i.test(filename) ||
  /^sections\/[a-z0-9_-]+\.json$/i.test(filename);

/**
 * Files whose content in Shopify no longer matches what we last wrote, i.e.
 * someone edited them in Shopify's theme editor since our last sync.
 */
export const changedInShopify = (
  lastWritten: Record<string, string> | null | undefined,
  current: Record<string, string | null>,
): string[] =>
  Object.entries(current)
    .filter(([filename, checksum]) => {
      const ours = lastWritten?.[filename];
      return ours !== undefined && checksum !== null && checksum !== ours;
    })
    .map(([filename]) => filename)
    .sort();
