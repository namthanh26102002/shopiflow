-- Treat the host's own verification as authoritative for "Connected".
--
-- status was dns_ok AND host_ok, where dns_ok is our own A-record lookup
-- against PROXY_IP. That only describes an apex domain: a subdomain is pointed
-- with a CNAME, which resolves to the host's anycast addresses and will not
-- match PROXY_IP. Such a domain would serve correctly while the badge sat on
-- "pending" forever.
--
-- Vercel only reports a domain as verified once it has confirmed the DNS
-- itself, so host_ok already implies working DNS. dns_ok stays as a detail the
-- UI can explain progress with, but no longer gates the status.

ALTER TABLE public.domains DROP COLUMN IF EXISTS status;

ALTER TABLE public.domains
  ADD COLUMN status text GENERATED ALWAYS AS (
    CASE
      WHEN host_ok THEN 'active'
      WHEN last_error IS NOT NULL THEN 'error'
      ELSE 'pending'
    END
  ) STORED;
