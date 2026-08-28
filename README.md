# Shopiflow Pro

A multi-tenant SaaS for dropshipping operators, built as four modules on a
shared auth and custom-domain layer.

| Module | Routes | Purpose |
|---|---|---|
| Quiz builder | `/builder`, `/quiz/:id` | Product-recommendation quizzes with scoring, results mapping, live preview, analytics |
| Advertorial builder | `/advertorial-builder`, `/advertorial/:id` | Block-based advertorial/landing pages with rich text and analytics |
| Info (LMS) | `/info/*` | Classrooms, lessons, document editor, student view |
| Orders & Products | `/orders/*`, `/winning-products/*` | Order tracking with public timelines; product research dashboards |

Customers can publish quizzes and advertorials on their own domains. A
non-recognised hostname routes through `SlugResolver` instead of the app
shell — see `isCustomDomain()` in `src/App.tsx`.

**Stack:** Vite 5 · React 18 · TypeScript · Tailwind · shadcn/ui ·
React Router 6 · TanStack Query · Supabase (Postgres + Auth + Storage +
Edge Functions).

---

## Environments

`shopiflow-dev` (`pxixzxajqzlqxlpuvvzc`) is the project of record. It backs
both local development and the deployed app.

The original database (`franprkgpunrzwblsrzq`) belonged to a Lovable-managed
Supabase organization, not to this account — it could not be migrated,
backed up, or administered with the CLI, so it was retired rather than
carried forward. Nothing in it was worth keeping.

> **Local development and the deployed site currently share one database.**
> Running the dev server writes real rows: a test quiz is a real quiz, and
> preview clicks land in `quiz_page_views` and `advertorial_events`.
>
> That is a deliberate trade while there are no customers. Before onboarding
> anyone, split it: create a second Supabase project, apply
> `supabase/migrations` and `supabase/seed-dev.sql` to it, and point local
> `.env` there — leaving this one for the deployment. Note the free plan
> allows two active projects per organisation, so one may need pausing.

## Local setup

Requires Node 20+ and npm.

```sh
npm install
```

Create `.env` from the template and fill in your **dev** project's values
(Supabase dashboard → Project Settings → API):

```sh
cp .env.example .env
```

Use the **anon / public** key, never `service_role` — Vite inlines these
into the browser bundle.

```sh
npm run dev
```

Runs on http://localhost:8080.

### Bootstrapping a fresh dev database

A new database has no users and no access codes, and signup is gated behind
a valid code — so you cannot register until one exists.

1. Apply schema and functions:

   ```sh
   npx supabase link --project-ref <your-dev-ref>
   npx supabase db push
   npx supabase functions deploy
   ```

2. In the Supabase SQL Editor, run **STEP 1** of `supabase/seed-dev.sql`.
   This creates the access code `DEV-LOCAL`.

3. Disable **Authentication → Sign In / Providers → Email → Confirm email**.
   Signup claims the access code using the session returned by `signUp()`;
   with confirmation on there is no session, and the claim fails with a
   misleading "invalid access code" error.

4. Register at http://localhost:8080 using access code `DEV-LOCAL`.

5. Run **STEP 2** of `supabase/seed-dev.sql` with your email to grant
   yourself the `admin` role, then sign out and back in.

Only `check-dns` needs a manual secret, and only for custom-domain work:

```sh
npx supabase secrets set PROXY_IP=<ip>
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port 8080 |
| `npm run build` | Production build |
| `npm run preview` | Serve the build locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest (single run) |
| `npm run test:watch` | Vitest in watch mode |

---

## Layout

```
src/
  components/   ui/ (shadcn) · builder/ · advertorial/ · orders/ ·
                winning-products/ · info/ · admin/ · shared/
  contexts/     Quiz, Advertorial, Lesson editor state
  hooks/        useAuth, useAdmin, useOrders, useLessons, …
  integrations/ Supabase client + generated types
  pages/        Route components
supabase/
  migrations/   Schema history — applied in filename order
  functions/    access-code · admin-users · check-dns · track-visit ·
                verify_domain
  seed-dev.sql  Dev bootstrap (access code + admin role)
```

## Deployment (Vercel)

The app is a static Vite SPA. Vercel auto-detects the framework; `vercel.json`
supplies the catch-all rewrite, without which every deep link
(`/builder/:quizId`, `/quiz/:id`, customer slugs) 404s on direct load.

Set these in **Vercel → Project → Settings → Environment Variables**, to the
same values as local `.env`. They are read at build time, so changing one
requires a redeploy:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://pxixzxajqzlqxlpuvvzc.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon key (never `service_role`) |
| `VITE_SUPABASE_PROJECT_ID` | `pxixzxajqzlqxlpuvvzc` |

Before pointing a domain at a deployment, make sure the database has every
migration this code expects (`npx supabase db push`), or the app will hit
tables and triggers that are not there.

### Custom domains

Customers point A records for `@` and `www` at the `PROXY_IP` edge-function
secret, and `check-dns` verifies the match against Cloudflare DNS. Changing
hosts means updating `PROXY_IP` **and** every customer re-pointing their DNS —
their sites stay down until they do. Plan that as a customer migration, not a
deploy step.

Any host serving the app must be listed in `isCustomDomain()` in `src/App.tsx`.
An unlisted host is treated as a customer domain and routed to `SlugResolver`.

## Project limits

Each builder is multi-project. `/builder` and `/advertorial-builder` list the
current user's projects; the editors live at `/builder/:quizId` and
`/advertorial-builder/:advertorialId`.

Non-admins may keep **2 projects per builder**; admins are unlimited. The cap
is enforced by a `BEFORE INSERT` trigger (`public.enforce_project_limit`) on
`quizzes` and `advertorials`, so it holds even for direct PostgREST calls —
the checks in `useProjects` only keep the UI in step.

The trigger blocks inserts only. A user who already holds more than the cap
keeps every project and simply cannot create another until they delete one.

## Gotchas

- **Access codes are capped at 12 characters.** Both `Auth.tsx` and
  `AccessCodeManager.tsx` set `maxLength={12}`, while the `access-code`
  edge function accepts up to 32. Longer codes are truncated by the input
  with no warning and fail validation.
- **`src/integrations/supabase/types.ts` is generated.** Regenerate with
  `npx supabase gen types typescript --linked > src/integrations/supabase/types.ts`
  rather than editing it.
- **Vite reads `.env` only at startup.** Restart the dev server after
  changing it.
