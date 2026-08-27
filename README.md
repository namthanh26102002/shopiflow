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

There are two Supabase projects. **They are not interchangeable.**

| | Project ref | Used by |
|---|---|---|
| Production | `franprkgpunrzwblsrzq` | The deployed Lovable app. Real customer data. |
| Development | `pxixzxajqzlqxlpuvvzc` | Local work. Disposable. |

Local development runs against **dev**. Production is served by a separate
Lovable deployment that this repository does not push to.

> **Before any `supabase db push`, `functions deploy`, or `link`, check
> which project is linked:** `cat supabase/.temp/project-ref`. A `db push`
> against production alters the live database immediately.

`supabase link` records the active project in `supabase/.temp/project-ref`,
which is gitignored — it does **not** rewrite `project_id` in
`supabase/config.toml`. After a fresh clone there is no `.temp`, so
`config.toml` is the only ref on disk; it names the dev project
deliberately, so an unlinked `db push` cannot reach production.

Production credentials, if ever needed, are in `.env.production.local`
(gitignored). They do not belong in `.env`.

---

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
