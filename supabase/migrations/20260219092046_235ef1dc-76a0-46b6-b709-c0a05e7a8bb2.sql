
-- Create advertorial_events table for tracking page views, CTA clicks, and page exits
CREATE TABLE public.advertorial_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  advertorial_id uuid NOT NULL,
  session_id text NOT NULL,
  event_type text NOT NULL,
  block_id text,
  target_url text,
  time_on_page_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.advertorial_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous visitors)
CREATE POLICY "Anyone can insert advertorial events"
ON public.advertorial_events
FOR INSERT
WITH CHECK (true);

-- Only advertorial owner can read events
CREATE POLICY "Advertorial owners can view events"
ON public.advertorial_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.advertorials
    WHERE advertorials.id = advertorial_events.advertorial_id
      AND advertorials.user_id = auth.uid()
  )
);
