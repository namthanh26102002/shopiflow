// Everything the theme editor asks of a connected Shopify store.
//
// POST { action, ... } with the user's Supabase session:
//   start       { shop, returnUrl }                      → { url } to send the merchant to
//   install     { projectId, storeId, zipBase64, name }  → creates an unpublished theme
//   status      { projectId }                            → the linked theme, or linked: false
//   sync        { projectId, files, force?, baseChecksums? } → writes the project's JSON files
//   pull        { projectId }                            → the store's copy of those files
//   publish     { projectId }                            → makes the linked theme live
//   disconnect  { storeId }                              → forgets the store and its tokens
//
// Every action checks the caller owns the project and the store. Writes only
// ever touch themes this app created (the ids saved on the project).
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  ShopifyApiError,
  adminGraphql,
  authorizeUrl,
  changedInShopify,
  isSyncableThemeFile,
  normalizeShopDomain,
  numericId,
  randomState,
} from '../_shared/shopifyCore.ts';
import {
  StoreDisconnectedError,
  accessTokenFor,
  adminClient,
  callerId,
  config,
  corsHeaders,
  json,
  type StoreRow,
} from '../_shared/shopifyServer.ts';

const BUCKET = 'shopify-theme-uploads';
/** The JSON files a merchant edits, for checksum snapshots. */
const SYNCED_PATTERNS = ['config/settings_data.json', 'templates/*.json', 'sections/*.json'];
const MAX_ZIP_BYTES = 50 * 1024 * 1024;

class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly code?: string, readonly extra?: Record<string, unknown>) {
    super(message);
  }
}

interface ProjectRow {
  id: string;
  user_id: string;
  title: string;
  shopify_store_id: string | null;
  shopify_theme_id: string | null;
  shopify_file_checksums: Record<string, string> | null;
}

interface ThemeNode {
  id: string;
  name: string;
  role: string;
  processing: boolean;
  processingFailed: boolean;
}

const loadProject = async (admin: SupabaseClient, userId: string, projectId: unknown): Promise<ProjectRow> => {
  if (typeof projectId !== 'string') throw new HttpError(400, 'projectId required');
  const { data, error } = await admin
    .from('shopify_themes')
    .select('id, user_id, title, shopify_store_id, shopify_theme_id, shopify_file_checksums')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.user_id !== userId) throw new HttpError(404, 'Theme project not found');
  return data as ProjectRow;
};

const loadStore = async (admin: SupabaseClient, userId: string, storeId: unknown): Promise<StoreRow> => {
  if (typeof storeId !== 'string') throw new HttpError(400, 'storeId required');
  const { data, error } = await admin
    .from('shopify_stores')
    .select('id, user_id, shop_domain, shop_name, scopes')
    .eq('id', storeId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.user_id !== userId) {
    throw new HttpError(409, 'That store is not connected to your account', 'store_disconnected');
  }
  return data as StoreRow;
};

const clearLink = (admin: SupabaseClient, projectId: string) =>
  admin
    .from('shopify_themes')
    .update({ shopify_store_id: null, shopify_theme_id: null, shopify_synced_at: null, shopify_file_checksums: null })
    .eq('id', projectId);

const THEME_FIELDS = 'id name role processing processingFailed';

const fetchTheme = async (shop: string, token: string, themeId: string) => {
  const data = await adminGraphql<{ theme: ThemeNode | null }>(
    shop,
    token,
    `query($id: ID!) { theme(id: $id) { ${THEME_FIELDS} } }`,
    { id: themeId },
  );
  return data.theme;
};

interface ThemeFilesPage {
  theme: {
    files: {
      nodes: Array<{ filename: string; checksumMd5: string | null }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  } | null;
}

/** checksumMd5 of every merchant-editable JSON file in the theme. */
const fetchChecksums = async (shop: string, token: string, themeId: string): Promise<Record<string, string | null>> => {
  const out: Record<string, string | null> = {};
  let after: string | null = null;
  for (let page = 0; page < 10; page++) {
    const data: ThemeFilesPage = await adminGraphql<ThemeFilesPage>(
      shop,
      token,
      `query($id: ID!, $filenames: [String!], $after: String) {
        theme(id: $id) {
          files(filenames: $filenames, first: 250, after: $after) {
            nodes { filename checksumMd5 }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`,
      { id: themeId, filenames: SYNCED_PATTERNS, after },
    );
    if (!data.theme) break;
    for (const node of data.theme.files.nodes) out[node.filename] = node.checksumMd5;
    if (!data.theme.files.pageInfo.hasNextPage) break;
    after = data.theme.files.pageInfo.endCursor;
  }
  return out;
};

const describeTheme = (theme: ThemeNode, store: StoreRow) => ({
  id: theme.id,
  numericId: numericId(theme.id),
  name: theme.name,
  role: theme.role,
  processing: theme.processing,
  processingFailed: theme.processingFailed,
  shop: store.shop_domain,
  shopName: store.shop_name,
  storeId: store.id,
});

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const isZip = (bytes: Uint8Array) => bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;

// ---- Actions ------------------------------------------------------------------

const start = async (admin: SupabaseClient, userId: string, body: Record<string, unknown>) => {
  const cfg = config();
  const shop = normalizeShopDomain(String(body.shop ?? ''));
  if (!shop) throw new HttpError(400, 'Enter your store address, like your-store.myshopify.com', 'invalid_shop');

  let returnUrl: URL;
  try {
    returnUrl = new URL(String(body.returnUrl ?? ''));
  } catch {
    throw new HttpError(400, 'returnUrl required');
  }
  // Only back to our own app: an open redirect here would hand merchants to anyone.
  if (!cfg.returnOrigins.includes(returnUrl.origin)) throw new HttpError(400, 'returnUrl not allowed');

  const state = randomState();
  const { error } = await admin
    .from('shopify_oauth_states')
    .insert({ state, user_id: userId, shop_domain: shop, return_url: returnUrl.toString() });
  if (error) throw error;
  // Housekeeping: abandoned attempts.
  await admin.from('shopify_oauth_states').delete().lt('created_at', new Date(Date.now() - 86_400_000).toISOString());

  return { url: authorizeUrl(shop, cfg.clientId, cfg.redirectUri, state), shop };
};

const install = async (admin: SupabaseClient, userId: string, body: Record<string, unknown>) => {
  const project = await loadProject(admin, userId, body.projectId);
  const store = await loadStore(admin, userId, body.storeId);
  if (typeof body.zipBase64 !== 'string') throw new HttpError(400, 'zipBase64 required');
  const bytes = base64ToBytes(body.zipBase64);
  if (!isZip(bytes)) throw new HttpError(400, 'Not a ZIP file');
  if (bytes.length > MAX_ZIP_BYTES) throw new HttpError(413, 'Theme is over 50 MB');

  const token = await accessTokenFor(admin, store);

  // Shopify downloads the ZIP from a short-lived signed URL. Older uploads for
  // this project are removed once Shopify has certainly fetched them.
  const folder = `${userId}/${project.id}`;
  const { data: old } = await admin.storage.from(BUCKET).list(folder);
  const stale = (old ?? [])
    .filter((file) => Date.now() - new Date(file.created_at ?? 0).getTime() > 3_600_000)
    .map((file) => `${folder}/${file.name}`);
  if (stale.length) await admin.storage.from(BUCKET).remove(stale);

  const path = `${folder}/${Date.now()}.zip`;
  const upload = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: 'application/zip' });
  if (upload.error) throw upload.error;
  const signed = await admin.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (signed.error || !signed.data) throw signed.error ?? new Error('Could not sign upload URL');

  const name = String(body.name || project.title || 'Shopiflow theme').slice(0, 50);
  const result = await adminGraphql<{
    themeCreate: { theme: ThemeNode | null; userErrors: Array<{ message: string; code?: string }> };
  }>(
    store.shop_domain,
    token,
    `mutation($source: URL!, $name: String) {
      themeCreate(source: $source, name: $name, role: UNPUBLISHED) {
        theme { ${THEME_FIELDS} }
        userErrors { field message code }
      }
    }`,
    { source: signed.data.signedUrl, name },
  );
  const errors = result.themeCreate.userErrors;
  if (errors.length || !result.themeCreate.theme) {
    const limited = errors.some((e) => e.code === 'THEME_CREATION_NOT_ALLOWED_FOR_THEME_LIMITED_PLAN');
    throw new HttpError(
      422,
      limited
        ? "This store's Shopify plan does not allow adding themes."
        : errors.map((e) => e.message).join('; ') || 'Shopify did not create the theme',
      limited ? 'plan_limited' : 'theme_create_failed',
    );
  }

  const theme = result.themeCreate.theme;
  const { error } = await admin
    .from('shopify_themes')
    .update({
      shopify_store_id: store.id,
      shopify_theme_id: theme.id,
      shopify_synced_at: new Date().toISOString(),
      // Captured by `status` once Shopify finishes unpacking the ZIP.
      shopify_file_checksums: null,
    })
    .eq('id', project.id);
  if (error) throw error;

  return { theme: describeTheme(theme, store) };
};

const status = async (admin: SupabaseClient, userId: string, body: Record<string, unknown>) => {
  const project = await loadProject(admin, userId, body.projectId);
  if (!project.shopify_store_id || !project.shopify_theme_id) return { linked: false };

  let store: StoreRow;
  try {
    store = await loadStore(admin, userId, project.shopify_store_id);
  } catch {
    await clearLink(admin, project.id);
    return { linked: false, reason: 'store_disconnected' };
  }
  const token = await accessTokenFor(admin, store);
  const theme = await fetchTheme(store.shop_domain, token, project.shopify_theme_id);
  if (!theme) {
    // Deleted in Shopify's admin.
    await clearLink(admin, project.id);
    return { linked: false, reason: 'theme_deleted' };
  }

  if (!theme.processing && !theme.processingFailed && !project.shopify_file_checksums) {
    const checksums = await fetchChecksums(store.shop_domain, token, theme.id);
    await admin.from('shopify_themes').update({ shopify_file_checksums: checksums }).eq('id', project.id);
  }

  return { linked: true, theme: describeTheme(theme, store) };
};

const waitForJob = async (shop: string, token: string, jobId: string | undefined) => {
  if (!jobId) return;
  for (let i = 0; i < 10; i++) {
    const data = await adminGraphql<{ job: { done: boolean } | null }>(shop, token, 'query($id: ID!) { job(id: $id) { done } }', { id: jobId });
    if (!data.job || data.job.done) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

const sync = async (admin: SupabaseClient, userId: string, body: Record<string, unknown>) => {
  const project = await loadProject(admin, userId, body.projectId);
  if (!project.shopify_store_id || !project.shopify_theme_id) {
    throw new HttpError(409, 'This theme is not installed on a store yet', 'not_installed');
  }
  const files = body.files as Record<string, unknown> | undefined;
  if (!files || typeof files !== 'object') throw new HttpError(400, 'files required');
  const entries = Object.entries(files);
  const rejected = entries.filter(([name, value]) => !isSyncableThemeFile(name) || typeof value !== 'string');
  if (rejected.length || entries.length === 0) {
    throw new HttpError(400, `Only theme JSON settings can be synced (${rejected.map(([n]) => n).join(', ')})`);
  }

  const store = await loadStore(admin, userId, project.shopify_store_id);
  const token = await accessTokenFor(admin, store);
  const theme = await fetchTheme(store.shop_domain, token, project.shopify_theme_id);
  if (!theme) {
    await clearLink(admin, project.id);
    throw new HttpError(409, 'The theme was deleted from the store', 'theme_deleted');
  }
  if (theme.processing) throw new HttpError(409, 'Shopify is still setting up the theme. Try again in a minute.', 'processing');

  const current = await fetchChecksums(store.shop_domain, token, theme.id);
  // Live sync sends the checksums it last saw: anything different means
  // Shopify changed the file since, and the editor must merge first.
  const baseChecksums = body.baseChecksums as Record<string, string | null> | undefined;
  const conflicts = (
    baseChecksums && typeof baseChecksums === 'object'
      ? Object.keys(files).filter((name) => (current[name] ?? null) !== (baseChecksums[name] ?? null))
      : changedInShopify(project.shopify_file_checksums, current)
  ).filter((name) => name in files);
  if (conflicts.length && body.force !== true) {
    throw new HttpError(409, 'These files were changed in Shopify since your last update', 'conflict', { files: conflicts });
  }

  const result = await adminGraphql<{
    themeFilesUpsert: {
      job: { id: string; done: boolean } | null;
      userErrors: Array<{ filename?: string; message: string }>;
    };
  }>(
    store.shop_domain,
    token,
    `mutation($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
      themeFilesUpsert(themeId: $themeId, files: $files) {
        upsertedThemeFiles { filename }
        job { id done }
        userErrors { filename code message }
      }
    }`,
    {
      themeId: theme.id,
      files: entries.map(([filename, value]) => ({ filename, body: { type: 'TEXT', value } })),
    },
  );
  const errors = result.themeFilesUpsert.userErrors;
  if (errors.length) {
    throw new HttpError(422, errors.map((e) => (e.filename ? `${e.filename}: ${e.message}` : e.message)).join('; '), 'invalid_files');
  }
  if (result.themeFilesUpsert.job && !result.themeFilesUpsert.job.done) {
    await waitForJob(store.shop_domain, token, result.themeFilesUpsert.job.id);
  }

  const checksums = await fetchChecksums(store.shop_domain, token, theme.id);
  await admin
    .from('shopify_themes')
    .update({ shopify_file_checksums: checksums, shopify_synced_at: new Date().toISOString() })
    .eq('id', project.id);

  return { theme: describeTheme(theme, store), written: entries.length, checksums };
};

const publish = async (admin: SupabaseClient, userId: string, body: Record<string, unknown>) => {
  const project = await loadProject(admin, userId, body.projectId);
  if (!project.shopify_store_id || !project.shopify_theme_id) {
    throw new HttpError(409, 'This theme is not installed on a store yet', 'not_installed');
  }
  const store = await loadStore(admin, userId, project.shopify_store_id);
  const token = await accessTokenFor(admin, store);
  const result = await adminGraphql<{
    themePublish: { theme: ThemeNode | null; userErrors: Array<{ message: string }> };
  }>(
    store.shop_domain,
    token,
    `mutation($id: ID!) { themePublish(id: $id) { theme { ${THEME_FIELDS} } userErrors { field message code } } }`,
    { id: project.shopify_theme_id },
  );
  if (result.themePublish.userErrors.length || !result.themePublish.theme) {
    throw new HttpError(422, result.themePublish.userErrors.map((e) => e.message).join('; ') || 'Shopify did not publish the theme');
  }
  return { theme: describeTheme(result.themePublish.theme, store) };
};

const disconnect = async (admin: SupabaseClient, userId: string, body: Record<string, unknown>) => {
  const store = await loadStore(admin, userId, body.storeId);
  // Tokens cascade; projects linked to the store are unlinked by the FK.
  const { error } = await admin.from('shopify_stores').delete().eq('id', store.id);
  if (error) throw error;
  return { ok: true };
};

interface ThemeFilesWithBodies {
  theme: {
    files: {
      nodes: Array<{
        filename: string;
        checksumMd5: string | null;
        body: { content?: string; contentBase64?: string } | null;
      }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  } | null;
}

/** The store's current copy of every merchant-editable JSON file, for live sync. */
const pull = async (admin: SupabaseClient, userId: string, body: Record<string, unknown>) => {
  const project = await loadProject(admin, userId, body.projectId);
  if (!project.shopify_store_id || !project.shopify_theme_id) {
    throw new HttpError(409, 'This theme is not installed on a store yet', 'not_installed');
  }
  const store = await loadStore(admin, userId, project.shopify_store_id);
  const token = await accessTokenFor(admin, store);
  const theme = await fetchTheme(store.shop_domain, token, project.shopify_theme_id);
  if (!theme) {
    await clearLink(admin, project.id);
    throw new HttpError(409, 'The theme was deleted from the store', 'theme_deleted');
  }
  if (theme.processing) return { theme: describeTheme(theme, store), files: null };

  const files: Record<string, { content: string; checksum: string | null }> = {};
  let after: string | null = null;
  for (let page = 0; page < 10; page++) {
    const data: ThemeFilesWithBodies = await adminGraphql<ThemeFilesWithBodies>(
      store.shop_domain,
      token,
      `query($id: ID!, $filenames: [String!], $after: String) {
        theme(id: $id) {
          files(filenames: $filenames, first: 50, after: $after) {
            nodes {
              filename
              checksumMd5
              body {
                ... on OnlineStoreThemeFileBodyText { content }
                ... on OnlineStoreThemeFileBodyBase64 { contentBase64 }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }`,
      { id: theme.id, filenames: SYNCED_PATTERNS, after },
    );
    if (!data.theme) break;
    for (const node of data.theme.files.nodes) {
      if (!isSyncableThemeFile(node.filename)) continue;
      const content =
        node.body?.content ??
        (node.body?.contentBase64 ? new TextDecoder().decode(base64ToBytes(node.body.contentBase64)) : null);
      if (content !== null) files[node.filename] = { content, checksum: node.checksumMd5 };
    }
    if (!data.theme.files.pageInfo.hasNextPage) break;
    after = data.theme.files.pageInfo.endCursor;
  }

  return { theme: describeTheme(theme, store), files };
};

const ACTIONS = { start, install, status, sync, pull, publish, disconnect } as const;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const admin = adminClient();
    const userId = await callerId(req, admin);
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const action = body?.action as keyof typeof ACTIONS | undefined;
    if (!body || !action || !(action in ACTIONS)) return json({ error: 'Unknown action' }, 400);

    return json(await ACTIONS[action](admin, userId, body));
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message, code: err.code, ...err.extra }, err.status);
    if (err instanceof StoreDisconnectedError) {
      return json({ error: 'Your store connection expired. Connect the store again.', code: 'store_disconnected' }, 409);
    }
    if (err instanceof ShopifyApiError && err.status === 403) {
      return json(
        {
          error: "Shopify hasn't given Shopiflow permission to change themes on this store yet.",
          code: 'access_denied',
          details: err.message,
        },
        403,
      );
    }
    console.error('shopify-api failed:', err);
    return json({ error: err instanceof Error ? err.message : 'Something went wrong' }, 500);
  }
});
