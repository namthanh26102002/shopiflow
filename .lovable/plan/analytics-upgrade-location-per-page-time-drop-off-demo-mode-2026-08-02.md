# Analytics upgrade: location, per-page time, drop-off + demo mode

## What exists today (verified)
- Quiz tracking (`src/pages/QuizPublic.tsx`) writes one `quiz_responses` row per session (started/completed, `last_question_index`, total time) and one `quiz_response_answers` row per answered question.
- Quiz analytics (`src/components/builder/AnalyticsPanel.tsx`) shows starts, completions, completion rate, average total time, average questions, a drop-off bar chart and per-session detail.
- Advertorial tracking (`src/pages/AdvertorialPublic.tsx`) writes `advertorial_events` rows: `page_view`, `cta_click`, `page_exit` with `time_on_page_ms`.

Missing for your three requirements: no location at all, no per-question/per-page time, and drop-off only counts by question index (it ignores non-question pages and shows no funnel/percentages).

## 1. Location (region + country)
- New edge function `track-visit` that reads the caller IP from request headers, resolves country + region via a free IP-geo lookup, and writes it to the session row. No IP is ever stored — only country, region, and city-less coarse data.
- New columns: `country`, `region` on `quiz_responses`, and on `advertorial_events` (written on the `page_view` event).
- Called once per session, fire-and-forget so it never delays the quiz.
- Analytics gets a "Top locations" card: country/region rows with session counts and share, sorted desc.

## 2. Time spent on each page
- New column `time_on_question_ms` on `quiz_response_answers`, measured from when a page renders to when the visitor advances.
- Non-answer pages (feedback, warning, blank, result) currently record nothing. They get a lightweight `quiz_page_views` table (`response_id`, `quiz_id`, `page_index`, `page_type`, `page_label`, `time_on_page_ms`) so every page in the flow has a timing row.
- Analytics gets a "Time per page" chart: average seconds per page across sessions, with slowest pages highlighted.

## 3. Drop-off by page
- Drop-off is recomputed as a **funnel**: for each page in order, how many sessions reached it, how many continued, and the drop-off percentage — so you can read "38% quit on page 4" directly.
- Uses page index (all page types), not just question index, and labels each bar with the page name instead of `Q1`, `Q2`.
- Adds an "exit page" summary listing the pages with the highest abandonment.

## Suggested extra tracking (I will build the ones you keep)
Quiz:
- Traffic source: referrer + UTM parameters captured on session start, so you see which ad/campaign each session came from.
- Device + browser breakdown (mobile vs desktop) — big lever for quiz conversion.
- Answer distribution per question (already computed) surfaced as bar charts, plus "which answers correlate with completing".
- Result/product breakdown: which result page or recommended product each completed session landed on.
- Sessions over time chart (day-by-day starts vs completions).
- CTA clicks on the result page (currently untracked for quizzes).

Advertorial:
- Scroll depth milestones (25/50/75/100%) — the single best signal for where readers lose interest.
- Per-block visibility time (how long each section was on screen).
- Video engagement: play, 25/50/75/complete.
- Same location, traffic-source, and device breakdowns as the quiz.
- Read-through rate and CTA click position (which CTA on the page wins).

## 4. Demo analytics in Settings
- A "Analytics demo" section in the quiz builder Settings tab (and the advertorial Settings panel) with a button that opens a full-screen demo dashboard filled with realistic generated data: ~2,400 sessions, plausible funnel decay, location mix, per-page times, device split, campaign sources.
- It reuses the real analytics components with a mock data source, so what you see is exactly the final layout — clearly marked "Sample data" so it can't be confused with live numbers.

## Technical notes
- Migrations: add `country`/`region` to `quiz_responses` and `advertorial_events`; add `time_on_question_ms` to `quiz_response_answers`; create `quiz_page_views` with anon insert + owner-select policies and the required GRANTs.
- Analytics panels get refactored to take data via props so the same components render live and demo data.
- All new tracking calls stay fire-and-forget (no await in the render path) to preserve current load performance.
