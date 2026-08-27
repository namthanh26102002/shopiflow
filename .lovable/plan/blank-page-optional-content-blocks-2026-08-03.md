# Blank Page: Optional Content Blocks

Add three new optional, toggleable content blocks to the Blank page type in the quiz builder — matching the reference screenshots. Each is off by default, toggled on with a switch (same pattern as the existing Card Slider), fully editable, and rendered in both the live preview and the public quiz.

## 1. Projection Bars ("Your Control Level Over Time")
A card with a title, an optional "Projected" pill, low/med/high axis labels, and 2–4 vertical bars.

Editable per block:
- Title text, optional badge text (e.g. "Projected") with show/hide
- Axis labels (Low / Med / High) — editable text
- Footnote line (e.g. "Based on 2.3M+ user results") with show/hide
- Gradient start/end colors used by the bars

Editable per bar:
- Label (e.g. "Month 1"), value text (e.g. "35%"), fill height (0–100%)
- Optional per-bar value color override (so the last one can be green)
- Add / remove / reorder bars

## 2. Phase Timeline ("Your 90-Day Transformation")
A vertical timeline card with a heading and a list of phases.

Editable per block: heading text, optional icon, dot color, gradient colors for progress bars.
Editable per phase: range label (e.g. "Weeks 1–3"), title, description, percent badge text, progress fill (0–100%), badge color. Add / remove / reorder phases.

## 3. Feature Grid + Before/After ("What You'll Master" / "Your Transformation")
Two sub-sections that can each be toggled independently:

**Feature grid** — heading plus 2–6 cards in a 2-column grid. Each card: icon (picked from the existing icon picker), icon color, title, description.

**Before / After comparison** — heading, "BEFORE" and "AFTER" column labels with their own colors, and a list of paired rows. Each row: before text (red X) and after text (green check). Add / remove rows.

## Styling
All three blocks follow the quiz's existing theme settings (primary color, font color, background) with per-block color overrides where listed above. Cards use rounded corners, subtle borders, and the dark-card look from the references while still respecting light backgrounds. Mobile-first: bars and grids stack/shrink gracefully at 393px width.

## Technical notes
- `src/types/quiz.ts`: add `ProjectionBarsConfig`, `PhaseTimelineConfig`, `FeatureGridConfig` (with optional `beforeAfter`) interfaces and three optional fields on `Question` (`projectionBarsConfig`, `phaseTimelineConfig`, `featureGridConfig`), plus default factories used when a toggle is switched on. Absent field = block off, so existing quizzes are unaffected.
- New presentational components under `src/components/builder/`: `ProjectionBars.tsx`, `PhaseTimeline.tsx`, `FeatureGrid.tsx` — each takes its config plus theme colors and a `compact` flag for the preview panel.
- `src/components/builder/QuestionEditor.tsx`: three new collapsible sections in the `type === 'blank'` area, each gated by a `Switch`, reusing the existing `IconPicker`, color inputs, and add/remove row patterns from the Card Slider editor.
- `src/pages/QuizPublic.tsx` and `src/components/builder/LivePreview.tsx`: render the three blocks (when present) in the blank-page section, in a fixed order — image, card slider, projection bars, phase timeline, feature grid + before/after.
- Persistence needs no migration: blank-page config lives inside the existing `questions` JSON column.
