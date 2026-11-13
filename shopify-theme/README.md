# Shopiflow Shopify theme

The downloadable theme merchants upload to their own Shopify stores. Unrelated
to the quiz / advertorial / orders features in `src/` — it shares only the repo.

## Licensing, and why this is written from scratch

Shopify's own themes are **not** MIT, despite what most blog posts say. Dawn and
`Shopify/skeleton-theme` both carry an MIT-style grant with a field-of-use
restriction: the rights may only be exercised to build Shopify-interoperating
themes and, "if applicable, to distribute, offer for sale or otherwise make
available any such themes **via the Shopify Theme Store**", with all other uses
"strictly prohibited".

Shopiflow distributes a theme ZIP from its own webapp, which is not the Theme
Store. So this theme is written from scratch and contains no first-party
Shopify theme code. Dawn sits in `.reference/` (gitignored) as reading material
for Liquid patterns and schema shapes only.

**Do not copy files out of `.reference/` into `base/`.** If that restriction is
ever clarified in writing by Shopify, revisit this note first.

## Layout

    base/                 the theme itself — this is what ships
      layout/             theme.liquid (storefront) + password.liquid
      templates/          JSON templates; one per page type, plus customers/
      sections/           37 sections, incl. header-group + footer-group
      snippets/           shared partials (css-variables, icon, section-heading,
                          product-gallery, variant-picker, quantity-offers…)
      config/             settings_schema.json (the editor's fields)
                          settings_data.json (named style presets)
      locales/            en.default.json
      assets/             base.css, theme.js
    demo/                 demo-store catalogue + setup runbook (see demo/README.md)
    scripts/zip.mjs       builds + validates an uploadable ZIP
    dist/                 build output (gitignored)
    .reference/           upstream themes, read-only (gitignored)

## Local development

You never upload a ZIP to iterate. `npm run zip` is for distributing to
merchants; day-to-day work goes through the CLI.

Set up the demo store first — see **[demo/README.md](demo/README.md)**. A live
preview of an empty store tells you almost nothing; the demo catalogue is built
so that every theme path has something to render.

Run everything from `shopify-theme/`, after `npm install` once.

    npm run dev       live preview, hot-reloads on save
    npm run dev:sync  same, plus pulls theme-editor changes back to disk
    npm run console   Liquid REPL against real store data
    npm run check     Theme Check — must stay at zero offenses
    npm run info      which store and theme the CLI is pointed at
    npm run share     unpublished theme with a shareable preview link
    npm run pull      download remote theme files over your local ones
    npm run push      upload as an unpublished theme
    npm run zip       distribution build into dist/
    npm run demo:catalog  regenerate the demo catalogue CSV

### npm run dev

Uploads once as a **development theme** — hidden, temporary, tied to your CLI
session, and separate from the store's real themes — then watches your files
and pushes changes in real time. It prints a local preview URL plus a theme
editor URL for that dev theme.

The first run opens a browser to authenticate against your Partner account and
asks which store to use.

Useful flags, passed after `--`:

    npm run dev -- --open                      open the preview automatically
    npm run dev -- --live-reload full-page     full refresh instead of hot reload
    npm run dev -- --live-reload off           no auto-reload at all
    npm run dev -- --port 9293                 if the default port is taken
    npm run dev -- --store-password <pw>       password-protected dev store
    npm run dev -- --host 0.0.0.0              reach the preview from a phone

CSS and section edits hot-reload without losing page state. Editing
`config/settings_schema.json` or a `{% schema %}` block is the exception: that
changes the theme's shape, so expect a full reload and sometimes a restart.

### npm run dev:sync

Adds `--theme-editor-sync`, so settings you change in Shopify's theme editor
flow back into your local `config/settings_data.json` and `templates/*.json`.
That is the fast way to author presets: click it together in the real editor,
let it land on disk, commit.

It runs with `--reconciliation-strategy keep-local`, meaning local files win if
the two sides disagree at startup. Change it to `keep-remote` when the editor
is the version you want to keep.

### npm run console

A Liquid REPL against live store data — the quickest way to answer "what is
actually in this object?" without a render cycle:

    npm run console -- --url /products/your-product-handle

Then type Liquid at the prompt, for example
`{{ product.options_with_values[0].values[0].product_url }}` or
`{{ product.selected_or_first_available_variant.featured_media.id }}`. This is
how to verify the variant-picker assumptions without clicking through pages.

### Avoiding the store prompt every time

Create `shopify.theme.toml` next to `package.json`:

    [environments.dev]
    store = "your-dev-store"

Then pass the environment: `npm run dev -- -e dev`. Confirm it resolved with
`npm run info -- -e dev`. The file holds a store handle, not a credential, but
keep real store names out of commits if the repo is ever shared.

### What cannot be tested locally

Liquid renders on Shopify's servers. There is no faithful local renderer, so
every command above except `npm run check` needs a store connection — a free
Partner development store is the intended target. And `check` validates syntax
and schema, not behaviour.

### A note on `npm run zip`

The CLI ships `shopify theme package`, which also produces a ZIP. The custom
script exists because it additionally *validates* — required files present,
every JSON parses, no template referencing a missing section, under the 50 MB
cap — and refuses to write a ZIP that fails. Those are the same checks the
admin theme builder will run before allowing a publish, so the two stay in
step. Use `npm run zip`; reach for `theme package` only to cross-check.

## How this connects to the admin theme builder

The builder in the webapp will not generate Liquid. It edits a **preset** and
overwrites only the two things Shopify designed to be data:

- `config/settings_data.json` — global settings and named style variants
- `templates/*.json` — which sections appear, in what order, with what settings

Everything the builder's UI needs to render itself is already declared here:
`config/settings_schema.json` for global fields, and each section's
`{% schema %}` block for its own fields. Parse those and the editor builds
itself — no hand-maintained form per setting.

Two consequences worth keeping in mind while editing this theme:

1. **Setting IDs are a public contract.** Renaming one silently drops that
   value from every preset and every merchant's saved settings.
2. `settings_data.json` sets `"current"` to a preset *name*, so one theme can
   ship several named styles that merchants switch between in Shopify's editor.
   `Classic` and `Midnight` are the two seeded examples.

`scripts/zip.mjs` runs the same validation the builder will run before allowing
a publish. Keep the two in step.

## The product page

`templates/product.json` is a long-form sales page: a gallery beside a stack
of reorderable blocks, then fourteen full-width sections. Its layout was
modelled on a high-converting direct-response page. Only the structure was
modelled, written from scratch: none of that store's copy, images, code or
reviews are used. Every default is placeholder copy telling the merchant
what to write.

**Product column blocks** (`sections/main-product.liquid`, the larger ones
in `snippets/product-block-*.liquid`): star rating, title, pill, two-tone
headline, text, product description, price, benefit row, guarantee chips,
variant picker (pills, swatches or purchase cards), quantity selector, quantity
offer tiers, offer box with bonuses, buy button (optionally with the price in
it), payment icons, Shop Pay installments, delivery estimate, what's included,
avatar stack, stat rows, logo card, comparison, testimonial slider, callout,
trust grid, featured review, cost comparison table, collapsible rows, image
carousel, custom liquid, and app blocks. Section settings add breadcrumbs,
left-hand thumbnails and a top or bottom sticky bar.

**Page sections**: icon strip, media with text (photo or captioned-card
layout, with steps, bullets and a comparison pair), image steps, versus,
level explorer, testimonials (grid or carousel), video testimonials, stats
(numbers can count up), benefit cards (two styles, 2 to 5 across), comparison
table (with group headings), customer story, timeline, guarantee (scrolling
strip and rotating badge), FAQ (stacked or split), logo marquee, product offer
card, related products, newsletter, and an apps section for a review app's
widget.

**Variant metafields the page reads**, both optional, both defined under
Settings → Custom data → Variants:

- `custom.badge` (single line text): a badge on that variant's purchase card,
  e.g. "Best value".
- `custom.included` (multi-line text): that variant's own "What's included"
  list, replacing the block's.

Things that are easy to break:

- **One form, many controls.** The `<form>` holds only the variant id. Offer
  radios, the quantity input and both buy buttons join it with
  `form="ProductForm-<section.id>"`, which is why blocks can go in any order.
  A new control that should submit with the product needs that attribute.
- **Extra cart lines go through theme.js.** Free gifts on an offer tier and
  bonus products in the offer box are added by `<product-form-controller>`
  via `/cart/add.js`. With JavaScript off, only the main product is added;
  the shopper sees that in the cart before paying.
- **Mid-page buttons scroll to `#product-buy`** (the buy button block) when
  their link is blank. Remove the buy button block and they scroll nowhere.
- **The star rating reads `reviews.rating` metafields** written by review
  apps. It renders nothing until they exist; there is no manual rating field
  on purpose, so the page cannot show a made-up score.
- **The delivery estimate is computed in the shopper's browser**, because
  Shopify caches rendered pages. It skips weekends unless allowed but knows
  no public holidays, and its countdown runs to the real cutoff hour, only
  before it. It is not on the default template: its defaults would promise
  shipping times the merchant has not set.
- **Related products use Shopify's recommendations API** unless products are
  hand-picked. A new store with no order history gets no recommendations, and
  the section then renders nothing rather than an empty heading.
- **Count-up figures keep the real value in the HTML.** Only the visible
  digits animate; screen readers, search engines and no-JavaScript visitors
  get the true number. Figures like "3 in 4" are left as written.
- **Stats have a sources footnote** as a first-class setting. A figure without
  its source is the part of a page like this most likely to mislead, and the
  most likely to get an ad account flagged.
- **Accent colour** is part of every colour scheme (`--color-accent`). Two-tone
  headings, badges, ticks and icon tiles all use it. The **Vital** preset
  (Montserrat, green accent) is the reference look and is now the default;
  Classic and Midnight remain selectable.

`templates/product.simple.json` keeps the short layout (title, price, picker,
quantity, button, description) for catalogues where a sales page per product
is overkill. `templates/product.offer.json` is the quantity-offer example.
Assign either per product in the Shopify admin.

## Current state

Theme Check passes clean (85 files, 0 offenses) and `npm run zip` produces an
87-file, ~110 KB ZIP with the structure Shopify expects. The ZIP step also
refuses to build if any section offers an icon that snippets/icon.liquid does
not draw.

Working: home (hero / featured collection / rich text), product with a real
variant picker and media gallery, collection, collections list, cart, search,
blog, article, page, 404, password, and the seven classic customer-account
templates. Two colour presets, three colour schemes each, schema-driven
settings for type, layout, shapes and cards.

### How the variant picker works

Worth understanding before changing it, because it is not the usual approach.

Each option value renders as an `<a href>` pointing at that variant's own
`value.product_url`. With scripting off, a click is an ordinary navigation and
Shopify re-renders the page — correct price, availability, gallery image and
form, with no client-side state to drift. `theme.js` then intercepts those
clicks and swaps `#MainProduct-<section.id>` in place via the Section Rendering
API (`?section_id=`), so it feels instant while the server stays the source of
truth. Any failure falls through to a plain navigation.

Consequences:

- There are **no radio inputs**. The hidden `id` field is set server-side.
- `#MainProduct-<section.id>` and `data-section-id` are a contract between
  `sections/main-product.liquid` and `theme.js`. Rename one and the instant
  swap silently degrades to full page loads.
- Sold-out option values stay clickable on purpose. A shopper needs to reach a
  sold-out size and see that it is sold out; a disabled control reads as broken.
- Native Shopify swatches (`value.swatch.color` / `.image`) are used when the
  option has them; values without one fall back to a text pill.

### Quantity offers

"Buy 2 Get 3"-style bundle cards, as `quantity_break` blocks on the product
section (`snippets/quantity-offers.liquid`). Each tier is a radio named
`quantity`, so the chosen bundle posts with no JavaScript; theme.js only takes
over to add a free-gift line or apply a discount code.

- Tiers are **units received** + **units paid for** + optional percent off.
  Every price, strike-through and "Save x%" badge is computed from the
  variant's real price. Strike-through prices cannot be typed in.
- Totals round to the cent the way Shopify rounds a percentage discount;
  flooring would show a price one cent under what checkout charges.
- The theme displays offers; Shopify charges for them. Each tier needs a
  matching discount in the store. `templates/product.offer.json` is a
  ready-made example, deliberately not the default template. Setup and the
  discounts it needs are in [demo/README.md](demo/README.md).
- `data-offer-id` on the radios lets the variant swap keep the chosen tier
  selected. Rename it and colour changes silently reset the bundle.

### Not done yet

- **Not yet tested on a real store.** Everything here is unverified against
  live Shopify data; `npm run dev` against a dev store is the next step. Theme
  Check validates syntax and schema, not behaviour.
- **Quantity offers are untested against real discounts.** The card maths
  is verified; whether a given discount setup makes the cart match is not.
- **The long-form page has only been rendered offline** (liquidjs with the
  real section files, then clicked through in a browser). Desktop and 375px
  layouts, gallery, sticky bar, offer tiers and form submission logic were
  checked that way; real Shopify rendering is still unverified.
- No "Buy it now" dynamic checkout button on the product page.
- The offer box total is for one unit; use it or quantity offers, not both.
- Cart is a page only. The `cart_type: drawer` setting exists but no drawer is
  built, so the setting currently does nothing — wire it or drop it.
- 3D models render as a static preview image; `model-viewer` is not loaded.
- No collection filtering or sorting, no predictive search.
- Single locale (`en.default.json`). No schema locale file, deliberately: the
  builder reads the plain-English labels in `settings_schema.json` directly.
- No `theme.jpg` preview image, which the Shopify admin shows for the theme.
