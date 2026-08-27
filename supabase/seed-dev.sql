-- =====================================================================
-- DEV SEED — run this ONLY against your dev Supabase project.
-- Never run it against production (franprkgpunrzwblsrzq).
--
-- Run it in two parts: STEP 1 before you sign up, STEP 2 after.
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 1 — run BEFORE creating your account.
-- Signup requires a valid access code; a fresh DB has none, so without
-- this you cannot register at all.
--
-- trial_days = NULL means permanent access (no trial expiry in dev).
-- Code must match /^[A-Z0-9-]{4,32}$/ per the access-code edge function,
-- AND be <= 12 chars: both the signup field (src/pages/Auth.tsx) and the
-- admin code creator use maxLength={12}. Longer codes are silently
-- truncated by the input and will fail validation.
-- ---------------------------------------------------------------------
INSERT INTO public.access_codes (code, created_by, is_active, trial_days)
VALUES ('DEV-LOCAL', '00000000-0000-0000-0000-000000000000', true, NULL)
ON CONFLICT (code) DO NOTHING;


-- ---------------------------------------------------------------------
-- STEP 2 — run AFTER you have signed up in the app.
-- Grants your account the admin role (needed for /admin/users,
-- /info/manage, /orders/manage, /winning-products/manage).
--
-- Replace the email below with the one you registered with.
-- ---------------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'REPLACE_WITH_YOUR_EMAIL'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify it worked (should return one row with role = admin):
-- SELECT u.email, r.role FROM auth.users u
--   JOIN public.user_roles r ON r.user_id = u.id;
