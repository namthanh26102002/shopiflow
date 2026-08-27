
-- winning_products: allow anon SELECT on published
DROP POLICY IF EXISTS "Users can view published products" ON public.winning_products;
CREATE POLICY "Anyone can view published products" ON public.winning_products
  FOR SELECT USING (published = true);

-- classrooms: allow anon SELECT on published
DROP POLICY IF EXISTS "Authenticated users can view published classrooms" ON public.classrooms;
CREATE POLICY "Anyone can view published classrooms" ON public.classrooms
  FOR SELECT USING (published = true);

-- lessons: allow anon SELECT on published
DROP POLICY IF EXISTS "Authenticated users can view published lessons" ON public.lessons;
CREATE POLICY "Anyone can view published lessons" ON public.lessons
  FOR SELECT USING (published = true);
