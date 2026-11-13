// Deno-side plumbing shared by the shopify-* edge functions: config, the
// service-role client, caller auth, and access tokens that refresh themselves.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parseReturnOrigins, refreshAccessToken, needsRefresh, ShopifyAuthError, type TokenSet } from './shopifyCore.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
};

export const config = () => ({
  clientId: required('SHOPIFY_CLIENT_ID'),
  clientSecret: required('SHOPIFY_CLIENT_SECRET'),
  supabaseUrl: required('SUPABASE_URL'),
  /** Where the OAuth callback lives; must match the Dev Dashboard redirect URL exactly. */
  redirectUri: `${required('SUPABASE_URL')}/functions/v1/shopify-oauth-callback`,
  /** Origins the callback may send the merchant back to. The first is the default. */
  returnOrigins: parseReturnOrigins(Deno.env.get('SHOPIFY_RETURN_ORIGINS')),
});

export const adminClient = (): SupabaseClient =>
  createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

export const callerId = async (req: Request, admin: SupabaseClient): Promise<string | null> => {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error || !data.user ? null : data.user.id;
};

export interface StoreRow {
  id: string;
  user_id: string;
  shop_domain: string;
  shop_name: string | null;
  scopes: string;
}

export const saveTokens = async (admin: SupabaseClient, storeId: string, tokens: TokenSet) => {
  const { error } = await admin.from('shopify_store_tokens').upsert({
    store_id: storeId,
    access_token: tokens.accessToken,
    access_token_expires_at: tokens.accessTokenExpiresAt,
    refresh_token: tokens.refreshToken,
    refresh_token_expires_at: tokens.refreshTokenExpiresAt,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
};

export class StoreDisconnectedError extends Error {}

/**
 * A usable access token for the store, refreshing it first if it is about to
 * expire. A refresh that Shopify refuses (expired after 90 idle days, or the
 * app was uninstalled) clears the tokens so the merchant reconnects.
 */
export const accessTokenFor = async (admin: SupabaseClient, store: StoreRow): Promise<string> => {
  const { data, error } = await admin
    .from('shopify_store_tokens')
    .select('access_token, access_token_expires_at, refresh_token')
    .eq('store_id', store.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new StoreDisconnectedError('Store is not connected');
  if (!needsRefresh(data.access_token_expires_at)) return data.access_token;
  if (!data.refresh_token) throw new StoreDisconnectedError('Store connection expired');

  const { clientId, clientSecret } = config();
  try {
    const tokens = await refreshAccessToken(store.shop_domain, data.refresh_token, clientId, clientSecret);
    await saveTokens(admin, store.id, tokens);
    return tokens.accessToken;
  } catch (err) {
    if (err instanceof ShopifyAuthError && (err.status === 400 || err.status === 401)) {
      await admin.from('shopify_store_tokens').delete().eq('store_id', store.id);
      throw new StoreDisconnectedError('Store connection expired');
    }
    throw err;
  }
};
