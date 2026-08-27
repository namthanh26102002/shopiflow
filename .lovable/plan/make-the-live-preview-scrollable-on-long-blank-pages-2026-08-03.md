# Make the Live Preview scrollable on long blank pages

## What's happening
The preview phone frame is locked to a 9:16 box and clips anything taller than it:
- `src/index.css:178` — `.preview-frame` applies `overflow-hidden`
- `src/components/builder/LivePreview.tsx:302` — the frame uses `aspect-[9/16]` for every page type except `result`/`summary`

So when a blank page has projection bars, phase timeline, and feature grid enabled, the extra content is cut off with no way to scroll. The outer wrapper (`overflow-auto`, line 298) only scrolls if the frame itself grows, which the fixed aspect ratio prevents.

## The fix
Keep the phone look, but let content scroll inside the frame:
1. Keep the 9:16 frame size, and make its inner content column the scroll area instead of a clipped overflow.
2. Make the content wrapper (line 360) `overflow-y-auto` with `min-h-0` so flexbox lets it shrink and scroll rather than overflow.
3. Add a slim, subtle scrollbar style for that area to stay close to the current minimal aesthetic.
4. Keep branding header, progress bar, and the bottom Next button fixed outside the scroll area, so only the question content scrolls — matching how the published quiz behaves.

## Technical notes
- Only `src/components/builder/LivePreview.tsx` and a small scrollbar utility in `src/index.css` change; no data, types, or public-page logic is touched.
- `result`/`summary` pages already use `min-h-[640px]` and grow naturally; they keep working since the scroll container simply never overflows.
- Public quiz rendering (`src/pages/QuizPublic.tsx`) already scrolls with the browser page and needs no change.