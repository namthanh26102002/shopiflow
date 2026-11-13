// Shopify webhooks: app/uninstalled, plus the three privacy webhooks every
// public app must answer (customers/data_request, customers/redact,
// shop/redact). Shopiflow stores no customer data from Shopify, so the
// customer ones only need a verified 200; the shop ones remove the store.
//
// Set this function's URL as the compliance webhooks URL in the Dev Dashboard:
// https://<project>.supabase.co/functions/v1/shopify-webhooks
import { isShopDomain, verifyWebhookHmac } from '../_shared/shopifyCore.ts';
import { adminClient, config } from '../_shared/shopifyServer.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const raw = await req.text();
  if (!(await verifyWebhookHmac(raw, req.headers.get('X-Shopify-Hmac-Sha256'), config().clientSecret))) {
    return new Response('Unauthorized', { status: 401 });
  }

  const topic = req.headers.get('X-Shopify-Topic') ?? '';
  const shop = req.headers.get('X-Shopify-Shop-Domain') ?? '';
  if (!isShopDomain(shop)) return new Response('ok');

  if (topic === 'app/uninstalled' || topic === 'shop/redact') {
    // Tokens cascade with the store row; linked projects are unlinked by the FK.
    const { error } = await adminClient().from('shopify_stores').delete().eq('shop_domain', shop);
    if (error) {
      console.error(`Failed to remove ${shop} after ${topic}:`, error);
      return new Response('Error', { status: 500 });
    }
  }
  // customers/data_request and customers/redact: nothing stored to report or erase.
  return new Response('ok');
});
