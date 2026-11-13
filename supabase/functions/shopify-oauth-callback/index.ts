// Shopify redirects the merchant here after they approve the app
// (https://<project>.supabase.co/functions/v1/shopify-oauth-callback, the
// redirect URL in the Dev Dashboard). Verifies the request, swaps the code for
// tokens, saves the store, and sends the merchant back to the theme editor.
import {
  SHOPIFY_API_VERSION,
  adminGraphql,
  exchangeCode,
  hasRequiredScopes,
  isShopDomain,
  verifyOAuthHmac,
} from '../_shared/shopifyCore.ts';
import { adminClient, config, saveTokens } from '../_shared/shopifyServer.ts';

const STATE_MAX_AGE_MS = 15 * 60 * 1000;

const redirect = (url: string) => new Response(null, { status: 302, headers: { Location: url } });

/** Back to the app with ?shopify=<status>, keeping any query the page had. */
const backTo = (returnUrl: string, status: string) => {
  const url = new URL(returnUrl);
  url.searchParams.set('shopify', status);
  return redirect(url.toString());
};

Deno.serve(async (req) => {
  const cfg = config();
  const fallback = `${cfg.returnOrigins[0]}/theme-builder`;
  const params = new URL(req.url).searchParams;
  const shop = params.get('shop') ?? '';
  const code = params.get('code');
  const state = params.get('state');

  if (!(await verifyOAuthHmac(params, cfg.clientSecret)) || !isShopDomain(shop) || !code || !state) {
    return backTo(fallback, 'invalid');
  }

  const admin = adminClient();

  // One-time state: take it and delete it in the same step.
  const { data: saved } = await admin.from('shopify_oauth_states').delete().eq('state', state).select().maybeSingle();
  if (!saved || saved.shop_domain !== shop || Date.now() - new Date(saved.created_at).getTime() > STATE_MAX_AGE_MS) {
    return backTo(fallback, 'expired');
  }
  const returnUrl = saved.return_url as string;

  try {
    const tokens = await exchangeCode(shop, code, cfg.clientId, cfg.clientSecret);
    if (!hasRequiredScopes(tokens.scope)) return backTo(returnUrl, 'missing-scopes');

    const info = await adminGraphql<{ shop: { name: string } }>(shop, tokens.accessToken, '{ shop { name } }').catch(
      () => null,
    );

    // Unique per shop: reconnecting (by anyone with admin access to the
    // store) takes it over, because Shopify has just retired the old token.
    const { data: store, error } = await admin
      .from('shopify_stores')
      .upsert(
        {
          user_id: saved.user_id,
          shop_domain: shop,
          shop_name: info?.shop.name ?? null,
          scopes: tokens.scope,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'shop_domain' },
      )
      .select('id')
      .single();
    if (error) throw error;
    await saveTokens(admin, store.id, tokens);

    // Hear about uninstalls so a dead connection does not linger. Best effort:
    // the compliance webhooks are configured in the Dev Dashboard instead.
    await adminGraphql(
      shop,
      tokens.accessToken,
      `mutation($callbackUrl: URL!) {
        webhookSubscriptionCreate(topic: APP_UNINSTALLED, webhookSubscription: { callbackUrl: $callbackUrl, format: JSON }) {
          userErrors { message }
        }
      }`,
      { callbackUrl: `${cfg.supabaseUrl}/functions/v1/shopify-webhooks` },
    ).catch((err) => console.warn(`webhook registration failed for ${shop} (${SHOPIFY_API_VERSION}):`, err));

    return backTo(returnUrl, 'connected');
  } catch (err) {
    console.error('Shopify OAuth callback failed:', err);
    return backTo(returnUrl, 'failed');
  }
});
