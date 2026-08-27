-- =========================
-- ORDERS: hide PII from public
-- =========================
DROP POLICY IF EXISTS "Anyone can view published orders" ON public.orders;
REVOKE SELECT ON public.orders FROM anon;

CREATE OR REPLACE VIEW public.public_orders AS
SELECT id, order_number, status, order_date, products, subtotal, shipping, total,
       shipping_method, published, created_at, updated_at
FROM public.orders
WHERE published = true;

GRANT SELECT ON public.public_orders TO anon, authenticated;

-- =========================
-- ORDER TIMELINE EVENTS
-- =========================
DROP POLICY IF EXISTS "Anyone can view published order timeline events" ON public.order_timeline_events;
REVOKE SELECT ON public.order_timeline_events FROM anon;

CREATE OR REPLACE VIEW public.public_order_timeline_events AS
SELECT e.id, e.order_id, e.description, e.event_date, e.status_marker, e.sort_order
FROM public.order_timeline_events e
JOIN public.orders o ON o.id = e.order_id
WHERE o.published = true
  AND e.event_date <= now();

GRANT SELECT ON public.public_order_timeline_events TO anon, authenticated;

-- =========================
-- CUSTOM DOMAINS
-- =========================
DROP POLICY IF EXISTS "Public can read domain mappings" ON public.custom_domains;
REVOKE SELECT ON public.custom_domains FROM anon;

CREATE OR REPLACE VIEW public.domain_mappings AS
SELECT domain, path, content_type, content_id
FROM public.custom_domains;

GRANT SELECT ON public.domain_mappings TO anon, authenticated;

-- =========================
-- QUIZ RESPONSES: restrict updates
-- =========================
DROP POLICY IF EXISTS "Anyone can update their own session by session_id" ON public.quiz_responses;

CREATE POLICY "In-progress responses can be updated"
ON public.quiz_responses
FOR UPDATE
TO anon, authenticated
USING (completed_at IS NULL AND started_at > now() - interval '24 hours')
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.protect_quiz_response_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.id := OLD.id;
  NEW.quiz_id := OLD.quiz_id;
  NEW.session_id := OLD.session_id;
  NEW.started_at := OLD.started_at;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_quiz_response_identity ON public.quiz_responses;
CREATE TRIGGER protect_quiz_response_identity
BEFORE UPDATE ON public.quiz_responses
FOR EACH ROW EXECUTE FUNCTION public.protect_quiz_response_identity();

-- =========================
-- SECURITY DEFINER FUNCTION EXECUTION
-- =========================
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_trial_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_trial_status(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_access_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_access_code(text) TO service_role;

REVOKE ALL ON FUNCTION public.validate_and_claim_access_code(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_and_claim_access_code(text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

REVOKE ALL ON FUNCTION public.protect_quiz_response_identity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_quiz_response_identity() TO service_role;

-- =========================
-- STORAGE: prevent anonymous listing/enumeration
-- =========================
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for quiz assets" ON storage.objects;

CREATE POLICY "Owners can read their quiz assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'quiz-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can read product assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'product-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));