# Settings tab: full-width workspace with sectioned cards

## Problem
On the Settings tab the builder keeps the same 3-column layout as Questions: all controls are crammed into the 320px left column, while the center column shows only a placeholder ("Quiz settings — Customize title, branding, and welcome screen"). That middle space is wasted, and the panel is one long scroll with only thin divider lines between topics.

## What changes

Layout (only when the Settings tab is active; Questions tab untouched):

```text
+--------+------------------------------------------+-------------+
|  icon  |  section nav  |  settings cards grid     | Live        |
|  rail  |  (sticky)     |  (1-2 columns)           | Preview     |
|        |  ~200px       |  fills remaining space   | 380px fixed |
+--------+------------------------------------------+-------------+
```

- The placeholder center panel is removed; settings occupy the full width between the icon rail and the preview.
- Live preview keeps its fixed 380px width and current behaviour.
- A sticky section nav lists the sections; clicking scrolls to that section, and the section in view is highlighted.
- Settings render as separate bordered cards (rounded border, card background, header with title + short description), in a responsive grid: 1 column on narrow widths, 2 columns when there is room. Tall sections (Text Sizes) span the full width.

Sections, each its own card:
1. Store Branding — logo, store name, logo layout, logo size
2. Favicon
3. Colors — brand color, background, font color
4. Next Button Style
5. Typography — font weights and related options
6. Text Sizes — per-type sliders + Reset (full-width card)
7. Behaviour — auto-advance, skip button (text + destination URL)
8. Analytics demo — demo dashboard dialog

No settings are added or removed, and nothing about how values are saved changes.

## Technical notes
- `src/pages/Builder.tsx`: branch the main content area on `activeTab === 'settings'` — render a scrollable full-width settings region plus the existing 380px `LivePreview`, instead of the 320 / flex-1 / 380 triple.
- `src/components/builder/SettingsPanel.tsx`: wrap each existing section in a small local `SettingsSection` card component (`id`, title, description, children) using existing semantic tokens (`bg-card`, `border-border-subtle`, `text-muted-foreground`), replacing the current `border-t` divider pattern. Wrap sections in a CSS grid (`grid gap-4 xl:grid-cols-2`, with `xl:col-span-2` for Text Sizes).
- Section nav: small local component driven by the same section metadata array, using `scrollIntoView` plus an `IntersectionObserver` for the active state; hidden at narrow widths where it would crowd the cards.
- No design-token, schema, or backend changes.