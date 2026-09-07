-- Remove the Trending Products feature.
--
-- The app code was deleted first; this drops what it owned. Nothing else
-- references either object: the product-assets bucket existed only for this
-- feature's image uploads.

DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read product assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

DELETE FROM storage.objects WHERE bucket_id = 'product-assets';
DELETE FROM storage.buckets WHERE id = 'product-assets';

DROP TABLE IF EXISTS public.winning_products CASCADE;
