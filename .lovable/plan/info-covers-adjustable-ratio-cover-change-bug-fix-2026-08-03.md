# Info covers: adjustable ratio + cover-change bug fix

## 1. Cover change bug (root cause confirmed)

Every classroom cover is stored at a fixed storage path — `.../classrooms/<id>/cover.png` — and the database saves that exact URL (verified in the database: all rows use `cover.png` / `cover.jpg` with no version marker).

When you re-upload a cover for an existing classroom:
- the file is overwritten in storage successfully,
- but the saved URL is byte-for-byte identical to the previous one,
- so the browser and CDN keep serving the cached old image.

A brand-new classroom works because its URL appears for the first time and nothing is cached. This is not about "published" state — publishing does not affect uploads.

**Fix:** make each upload produce a new, unique URL.
- Upload to `<user>/classrooms/<classroom-id>/cover-<timestamp>.<ext>` instead of a fixed name.
- Save that fresh URL on the classroom, so the grid updates immediately every time.
- Remove the previous cover file after a successful upload so storage doesn't accumulate old images.
- Keep the existing success/error toasts, and show the uploading state on the card being changed.

## 2. Adjustable cover ratio (admin, global)

Today covers use a fixed pixel height (`h-40`). At tablet width the columns get narrower while the height stays the same, so the visible crop changes and the covers look vertically squashed.

Replace the fixed height with a true aspect-ratio frame that scales with the column, and let the admin choose that ratio:

- New admin control in the Info header (visible only to admins): a compact ratio selector with **16:9, 3:2, 4:3, 1:1**, plus a "Custom" numeric width:height option.
- The chosen ratio is a single global setting applied to every classroom cover, so the grid stays uniform.
- Images always **fill and crop** (`object-cover`), never stretch — no distortion at any viewport.
- The empty-cover placeholder and the "New Classroom" card use the same ratio so rows stay aligned.
- Changing the ratio updates the grid live; the value persists and is used for logged-out viewers too.

## Technical notes

- Migration: add `cover_aspect_ratio text` to `public.classrooms` (default `'16/9'`). A global change writes the value to all classroom rows in one update via the existing admin UPDATE policy, and the grid reads the ratio from the first classroom (falling back to `16/9`). No new table or policies needed.
- `src/hooks/useClassrooms.tsx`: add `cover_aspect_ratio` to the `Classroom` interface and add a `setGlobalCoverRatio` mutation with optimistic update.
- `src/pages/Info.tsx`: cover wrapper becomes `style={{ aspectRatio: ratio }}` with `w-full h-full object-cover`; add the admin ratio selector to the header; rework `handleCoverUpload` for unique filenames plus old-file cleanup.
- `src/pages/InfoManage.tsx`: same unique-filename upload logic so both entry points behave identically.
