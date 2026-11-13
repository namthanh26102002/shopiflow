-- Shopify theme projects: a merchant's edits to the Shopiflow base theme.
--
-- theme_data holds the editable JSON files (settings_data "current", JSON
-- templates and section groups) as one document; the Liquid code ships with
-- the app and never lives here. NULL means "the base theme, untouched": a new
-- project is created without bundling the theme into the projects page, and
-- the editor fills it in on first open.

CREATE TABLE public.shopify_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled theme',
  theme_data JSONB,
  -- Base theme version theme_data was written against, for future migrations.
  base_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX shopify_themes_user_id_updated_at_idx
  ON public.shopify_themes (user_id, updated_at DESC);

ALTER TABLE public.shopify_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shopify themes"
ON public.shopify_themes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own shopify themes"
ON public.shopify_themes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopify themes"
ON public.shopify_themes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopify themes"
ON public.shopify_themes FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_shopify_themes_updated_at
BEFORE UPDATE ON public.shopify_themes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Same cap as the other builders: 2 per non-admin user.
DROP TRIGGER IF EXISTS enforce_shopify_theme_limit ON public.shopify_themes;
CREATE TRIGGER enforce_shopify_theme_limit
  BEFORE INSERT ON public.shopify_themes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_limit();
