-- Domains become first-class, owned by the user rather than implied by a
-- mapping row. custom_domains stays the (domain, path) -> content mapping.
--
-- Verification state moves here: it is a property of the domain, not of each
-- mapping. Previously custom_domains.verified was duplicated across every
-- mapping on a domain and updated by matching on the domain string.

CREATE TABLE IF NOT EXISTS public.domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain text NOT NULL,

  -- Serving a custom domain needs both: DNS pointing at us, and the domain
  -- registered with the host (Vercel only serves domains added to the project).
  dns_ok boolean NOT NULL DEFAULT false,
  host_ok boolean NOT NULL DEFAULT false,

  last_error text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Derived so the two booleans stay the single source of truth.
  status text GENERATED ALWAYS AS (
    CASE
      WHEN dns_ok AND host_ok THEN 'active'
      WHEN last_error IS NOT NULL THEN 'error'
      ELSE 'pending'
    END
  ) STORED,

  -- Globally unique: two accounts cannot claim the same hostname.
  UNIQUE (domain)
);

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own domains v2" ON public.domains
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can add own domains v2" ON public.domains
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own domains v2" ON public.domains
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own domains v2" ON public.domains
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS domains_user_id_idx ON public.domains (user_id);


-- Link mappings to their domain. Removing a domain removes its mappings.
ALTER TABLE public.custom_domains
  ADD COLUMN IF NOT EXISTS domain_id uuid REFERENCES public.domains(id) ON DELETE CASCADE;

-- Backfill one domain row per distinct hostname, carrying the old verified flag.
INSERT INTO public.domains (user_id, domain, dns_ok)
SELECT user_id, domain, bool_or(verified)
FROM public.custom_domains
GROUP BY user_id, domain
ON CONFLICT (domain) DO NOTHING;

UPDATE public.custom_domains cd
SET domain_id = d.id
FROM public.domains d
WHERE d.domain = cd.domain
  AND cd.domain_id IS NULL;

CREATE INDEX IF NOT EXISTS custom_domains_domain_id_idx ON public.custom_domains (domain_id);

-- verified now lives on public.domains.
ALTER TABLE public.custom_domains DROP COLUMN IF EXISTS verified;
