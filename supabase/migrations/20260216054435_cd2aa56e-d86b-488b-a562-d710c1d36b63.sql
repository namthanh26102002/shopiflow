
-- Create winning_products table
CREATE TABLE public.winning_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  estimated_total_sales_60d integer NOT NULL DEFAULT 0,
  estimated_daily_sales integer NOT NULL DEFAULT 0,
  last_month_revenue numeric NOT NULL DEFAULT 0,
  website_traffic jsonb NOT NULL DEFAULT '[]'::jsonb,
  product_performance jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_state jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_aspirational_identity jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.winning_products ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD
CREATE POLICY "Admins can select all products"
ON public.winning_products FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert products"
ON public.winning_products FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
ON public.winning_products FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
ON public.winning_products FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can view published products
CREATE POLICY "Users can view published products"
ON public.winning_products FOR SELECT
TO authenticated
USING (published = true);

-- Trigger for updated_at
CREATE TRIGGER update_winning_products_updated_at
BEFORE UPDATE ON public.winning_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-assets', 'product-assets', true);

-- Storage policies
CREATE POLICY "Product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-assets');

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-assets' AND public.has_role(auth.uid(), 'admin'));
