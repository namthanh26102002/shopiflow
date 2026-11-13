// Client for the shopify-api edge function. Access tokens never come to the
// browser; every call goes through the function with the user's session.
import { supabase } from '@/integrations/supabase/client';

export interface LinkedTheme {
  id: string;
  numericId: string;
  name: string;
  /** MAIN is the live theme. */
  role: string;
  processing: boolean;
  processingFailed: boolean;
  shop: string;
  shopName: string | null;
  storeId: string;
}

export type ShopifyErrorCode =
  | 'invalid_shop'
  | 'store_disconnected'
  | 'access_denied'
  | 'conflict'
  | 'processing'
  | 'not_installed'
  | 'theme_deleted'
  | 'plan_limited'
  | 'theme_create_failed'
  | 'invalid_files';

export class ShopifyRequestError extends Error {
  constructor(
    message: string,
    readonly code?: ShopifyErrorCode,
    readonly files?: string[],
  ) {
    super(message);
  }
}

const call = async <T>(action: string, payload: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('shopify-api', { body: { action, ...payload } });
  if (error) {
    // FunctionsHttpError keeps the Response; the body says what went wrong.
    const response = (error as { context?: Response }).context;
    let body: { error?: string; code?: ShopifyErrorCode; files?: string[] } | null = null;
    if (response && typeof response.json === 'function') body = await response.json().catch(() => null);
    throw new ShopifyRequestError(body?.error ?? 'Could not reach Shopify. Try again.', body?.code, body?.files);
  }
  return data as T;
};

export const shopifyApi = {
  start: (shop: string, returnUrl: string) => call<{ url: string; shop: string }>('start', { shop, returnUrl }),
  install: (projectId: string, storeId: string, zipBase64: string, name: string) =>
    call<{ theme: LinkedTheme }>('install', { projectId, storeId, zipBase64, name }),
  status: (projectId: string) =>
    call<{ linked: boolean; theme?: LinkedTheme; reason?: 'store_disconnected' | 'theme_deleted' }>('status', { projectId }),
  sync: (
    projectId: string,
    files: Record<string, string>,
    options: { force?: boolean; baseChecksums?: Record<string, string | null> } = {},
  ) =>
    call<{ theme: LinkedTheme; written: number; checksums: Record<string, string | null> }>('sync', {
      projectId,
      files,
      force: options.force ?? false,
      baseChecksums: options.baseChecksums,
    }),
  pull: (projectId: string) =>
    call<{ theme: LinkedTheme; files: Record<string, { content: string; checksum: string | null }> | null }>('pull', {
      projectId,
    }),
  publish: (projectId: string) => call<{ theme: LinkedTheme }>('publish', { projectId }),
  disconnect: (storeId: string) => call<{ ok: true }>('disconnect', { storeId }),
};

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

/** Same rule as the edge function: the merchant-editable JSON files. */
export const isSyncableThemeFile = (filename: string) =>
  filename === 'config/settings_data.json' ||
  /^templates\/[a-z0-9_.-]+\.json$/i.test(filename) ||
  /^sections\/[a-z0-9_-]+\.json$/i.test(filename);

export const storePreviewUrl = (theme: Pick<LinkedTheme, 'shop' | 'numericId'>) =>
  `https://${theme.shop}/?preview_theme_id=${theme.numericId}`;

export const storeEditorUrl = (theme: Pick<LinkedTheme, 'shop' | 'numericId'>) =>
  `https://${theme.shop}/admin/themes/${theme.numericId}/editor`;
