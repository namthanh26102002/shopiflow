
-- Change sales fields from numeric to text to support flexible formatting
ALTER TABLE public.winning_products 
  ALTER COLUMN estimated_total_sales_60d TYPE text USING estimated_total_sales_60d::text,
  ALTER COLUMN estimated_daily_sales TYPE text USING estimated_daily_sales::text;

-- Set defaults to empty string
ALTER TABLE public.winning_products
  ALTER COLUMN estimated_total_sales_60d SET DEFAULT '',
  ALTER COLUMN estimated_daily_sales SET DEFAULT '';
