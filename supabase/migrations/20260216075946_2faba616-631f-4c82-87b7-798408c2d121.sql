
ALTER TABLE public.custom_domains
ADD COLUMN verified boolean NOT NULL DEFAULT false;
