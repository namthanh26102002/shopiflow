# Advertorial Settings — Wide Workspace Layout

Apply the same settings workspace treatment used in the quiz builder to the advertorial builder. Today, page settings are squeezed into a 192px sidebar while the middle of the screen sits unused.

## What changes

When the Settings tab is active, the advertorial builder switches to a two-panel workspace:

```text
+---------+------------------------------------------+----------------+
| sidebar |  Sections nav |  Settings cards (grid)   |  Live preview  |
|  icons  |   (sticky)    |  2 columns when wide     |    420px       |
+---------+------------------------------------------+----------------+
```

- The blocks list and block editor panels are hidden in Settings (they aren't relevant there), freeing the full middle width.
- The live preview stays on the right at its current fixed 420px mobile frame.
- Settings are grouped into bordered cards, each with a title and short description.
- A sticky "Sections" nav on the left of the workspace lets you jump between cards and highlights the section you're currently viewing as you scroll.

## Section cards

1. Page Info — title, meta description, favicon
2. Branding — brand color
3. Typography — headline and body fonts
4. CTA Button Style — shape and size
5. Sticky Footer CTA — toggle plus text, URL, color (advertorials only, hidden for lessons)
6. Footer — disclaimer text
7. Analytics Demo — open the sample-data dashboard

## Technical notes

- `src/pages/AdvertorialBuilder.tsx`: add a branch for `activeTab === 'settings'` that renders a scrollable flexible settings area plus the fixed-width `LivePreview`, mirroring the existing branch in `src/pages/Builder.tsx`. The `components` tab keeps the current 4-panel layout.
- `src/components/advertorial/SettingsPanel.tsx`: restructure into local `SettingsSection` card and `SettingsSectionNav` components (same pattern as `src/components/builder/SettingsPanel.tsx`, using an IntersectionObserver for active-section highlighting). Drop the internal `ScrollArea` and panel header since the parent now scrolls. Fields grow to the wider column widths; textareas get more room.
- Sticky Footer CTA card is conditionally registered in the nav so lessons don't show a dead link.
- No changes to settings data, saving behaviour, or the public advertorial rendering.
