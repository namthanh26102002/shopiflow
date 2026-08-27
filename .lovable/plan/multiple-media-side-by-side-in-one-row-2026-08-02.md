# Multiple media side by side in one row

Today every image or video sits in its own block, stacked vertically. This adds the ability to place 2-4 media items next to each other in a single row, with each item still resizable and reorderable.

## How it will work

**Creating a row**
- Select a media item, then use new grouping buttons in the media overlay:
  - `Group with above` — merges this item into a row with the media block directly above it.
  - `Group with below` — merges the media block below into this item's row.
- Buttons only appear when the neighbouring block is a media block, so the action is never ambiguous.
- Max 4 items per row (beyond that items get too small to be useful).

**Working inside a row**
- The existing Up/Down arrows keep moving the whole row when the item is alone, and Left/Right arrows appear when the item is inside a row, to reorder within it.
- An `Ungroup` button pulls the selected item back out into its own full-width block.
- Resize handles keep working: dragging a corner changes that item's share of the row (a flex ratio) instead of a fixed pixel width, so the row always fills the content width and stays responsive.
- Each item keeps its own aspect ratio — no stretching.

**Reading the lesson (public view)**
- Rows render the same as in the editor on desktop.
- On narrow screens rows automatically wrap to stacked full-width media so nothing becomes unreadably small.

## Technical notes

- Row markup: a `<div class="media-row">` wrapper containing one `<div class="media-cell">` per media element, styled with flexbox. Cells carry an inline `flex` value for their width share.
- Class-based markup is required because the sanitizer (`src/lib/sanitize.ts`) allows `div`, `class`, and `style` but strips `data-*` attributes. No sanitizer change is needed.
- Editor changes in `src/components/info/LessonDocumentEditor.tsx`:
  - `getBlock` stays as-is (a row is one top-level block); add `getCell` to resolve the `.media-cell` an item lives in.
  - New helpers: `groupWith('up' | 'down')`, `ungroup()`, `moveWithinRow('left' | 'right')` — DOM operations followed by the existing `scheduleSave()` debounce, reusing the current FLIP animation for smooth transitions.
  - Overlay gains the group/ungroup and horizontal arrow buttons, shown conditionally based on the selected item's context.
  - `startResize` branches: inside a row it adjusts the cell's `flex-grow` (and its neighbour's, so the row total stays constant); outside a row it keeps the current pixel-width behaviour.
  - Cleanup: removing or ungrouping the last item in a row removes the empty `.media-row` wrapper; a row left with one item collapses back to a plain block.
- Row styling (flex, gap, `flex-wrap` on small screens, `img/video { width: 100%; height: auto }`) added to the editor's existing `<style>` block, plus equivalent rules for the public lesson view in `src/pages/InfoLessonView.tsx` so saved content renders identically.