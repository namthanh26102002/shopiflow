ALTER TABLE public.winning_products
  ADD COLUMN niche text DEFAULT '',
  ADD COLUMN creative_videos jsonb DEFAULT '[]'::jsonb;