
-- Create advertorials table
CREATE TABLE public.advertorials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Advertorial',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.advertorials ENABLE ROW LEVEL SECURITY;

-- Users can view their own advertorials
CREATE POLICY "Users can view their own advertorials"
ON public.advertorials FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own advertorials
CREATE POLICY "Users can create their own advertorials"
ON public.advertorials FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own advertorials
CREATE POLICY "Users can update their own advertorials"
ON public.advertorials FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own advertorials
CREATE POLICY "Users can delete their own advertorials"
ON public.advertorials FOR DELETE
USING (auth.uid() = user_id);

-- Public can view published advertorials
CREATE POLICY "Public can view published advertorials"
ON public.advertorials FOR SELECT
USING (published_url IS NOT NULL);

-- Add updated_at trigger
CREATE TRIGGER update_advertorials_updated_at
BEFORE UPDATE ON public.advertorials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
