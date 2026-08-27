
-- Fix orders: drop restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view published orders" ON public.orders;
CREATE POLICY "Anyone can view published orders" ON public.orders
FOR SELECT TO anon, authenticated USING (published = true);

-- Fix timeline: drop restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view published order timeline events" ON public.order_timeline_events;
CREATE POLICY "Anyone can view published order timeline events" ON public.order_timeline_events
FOR SELECT TO anon, authenticated USING (EXISTS (
  SELECT 1 FROM public.orders WHERE orders.id = order_timeline_events.order_id AND orders.published = true
));
