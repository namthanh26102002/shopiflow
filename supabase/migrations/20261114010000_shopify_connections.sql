-- Shopify store connections, for installing theme projects straight onto a
-- merchant's store. Depends on 20261114000000_shopify_themes.sql.
--
-- Shopify keeps ONE current access token per app per store: connecting a store
-- again retires the previous token. So a store row is unique per shop domain,
-- and belongs to whoever connected it last.

CREATE TABLE public.shopify_stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL UNIQUE,
  shop_name TEXT,
  scopes TEXT NOT NULL DEFAULT '',
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX shopify_stores_user_id_idx ON public.shopify_stores (user_id);

ALTER TABLE public.shopify_stores ENABLE ROW LEVEL SECURITY;

-- Users see and can forget their own stores. Inserts and updates happen only
-- in the OAuth callback, with the service role.
CREATE POLICY "Users can view their own shopify stores"
ON public.shopify_stores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopify stores"
ON public.shopify_stores FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_shopify_stores_updated_at
BEFORE UPDATE ON public.shopify_stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Access tokens. RLS on with no policies: only the service role (edge
-- functions) can read or write them; they never reach the browser.
CREATE TABLE public.shopify_store_tokens (
  store_id UUID NOT NULL PRIMARY KEY REFERENCES public.shopify_stores(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  access_token_expires_at TIMESTAMP WITH TIME ZONE,
  refresh_token TEXT,
  refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shopify_store_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shopify_store_tokens FROM anon, authenticated;

-- One-time OAuth state nonces (CSRF protection), service role only.
CREATE TABLE public.shopify_oauth_states (
  state TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  return_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shopify_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shopify_oauth_states FROM anon, authenticated;

-- Which Shopify theme a project was installed as.
ALTER TABLE public.shopify_themes
  ADD COLUMN shopify_store_id UUID REFERENCES public.shopify_stores(id) ON DELETE SET NULL,
  -- GraphQL id: gid://shopify/OnlineStoreTheme/123
  ADD COLUMN shopify_theme_id TEXT,
  ADD COLUMN shopify_synced_at TIMESTAMP WITH TIME ZONE,
  -- Shopify's checksumMd5 per file after our last write, to spot edits made
  -- in Shopify's own theme editor before we overwrite them.
  ADD COLUMN shopify_file_checksums JSONB;

-- Theme ZIPs handed to Shopify's themeCreate by signed URL. Private; only the
-- service role touches it.
INSERT INTO storage.buckets (id, name, public)
VALUES ('shopify-theme-uploads', 'shopify-theme-uploads', false)
ON CONFLICT (id) DO NOTHING;
