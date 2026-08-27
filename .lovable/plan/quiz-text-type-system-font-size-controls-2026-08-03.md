# Quiz Text Type System + Font Size Controls

Goal: define a small set of named text types used everywhere in the quiz output (real questions, blank/info pages, and the optional blocks), and let you set the font size of each type in the Settings tab. One system drives both the public quiz and the builder live preview.

## Text types (categories)

| Type | Where it appears | Default |
|---|---|---|
| Headline | Question text, blank/info page title, warning & feedback headline | 24px (mobile-scaled) |
| Sub-headline | Question description / sub-text under any headline | 16px |
| Answer | Option/answer labels, multi-select choices, score-slider labels | 16px |
| Block heading | Titles of the optional blocks (Projection Bars, Phase Timeline, Feature Grid, Before/After, Card Slider titles) | 16px |
| Block body | Card titles, phase titles, before/after rows, bar values | 14px |
| Caption | Small helper text: "Select all that apply", badges, axis labels, percentages, skip link, video caption | 12px |
| Button | Next / CTA / skip button label | 16px |

## Settings tab

New "Text Sizes" group inside the existing Typography section:
- One row per text type with a slider (and numeric px readout), sensible min/max per type.
- Live preview updates instantly as you drag.
- "Reset to defaults" button for the whole group.
- Existing sub-text and answer font-weight controls stay as they are.

## Behavior

- Sizes are stored per quiz, so each quiz can have its own scale.
- Blank/info pages use exactly the same types as real questions — no separate settings.
- Existing quizzes with no saved sizes fall back to the current defaults, so nothing changes visually until you adjust a slider.
- The preview keeps its smaller "compact" rendering by scaling your chosen sizes down proportionally, so the phone frame still looks right.

## Technical notes

- Add `textSizes?: Partial<Record<QuizTextType, number>>` to `QuizSettings` in `src/types/quiz.ts` with a `DEFAULT_TEXT_SIZES` map and a helper that resolves a type to a px value (plus a compact scale factor).
- Emit the resolved values as CSS custom properties (`--quiz-fs-headline`, `--quiz-fs-subheadline`, ...) on the quiz root wrapper in `src/pages/QuizPublic.tsx` and on the preview frame in `src/components/builder/LivePreview.tsx`.
- Add utility classes in `src/index.css` under the existing `.quiz-typography` scope (`.qt-headline`, `.qt-sub`, `.qt-answer`, `.qt-block-heading`, `.qt-block-body`, `.qt-caption`, `.qt-button`) that read those variables.
- Replace the hardcoded Tailwind size classes with these utilities in: `QuizPublic.tsx`, `LivePreview.tsx`, `ProjectionBars.tsx`, `PhaseTimeline.tsx`, `FeatureGrid.tsx`, `CardSlider.tsx`, `ScoreSlider.tsx`, `WarningPage.tsx`, `FeedbackPage.tsx`. `compact` continues to control layout/spacing, while size comes from the variables via a compact multiplier.
- Add the slider UI to the Typography section of `src/components/builder/SettingsPanel.tsx`, wired through the existing `updateSettings` (auto-save unchanged).
