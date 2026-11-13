# Demo store

A persistent sample storefront running this theme, with a catalogue built to
exercise every path the theme has. Once it is set up, `npm run dev` gives you
live reload against real products — edit a section here, see it on a real store
in a second or two, no ZIP, no re-upload.

Steps 1 to 4 need your Shopify login, so they are yours to run. Everything they
depend on is already in this folder.

## 1. Create a development store

Partner Dashboard → **Stores** → **Add store** → **Development store**.

Choose **"Start with test data"** if offered. It seeds snowboard products,
orders and customers, which is useful for exercising customer-account and order
templates that the product CSV cannot cover. Our catalogue imports alongside it
without clashing — every handle below is prefixed differently.

Development stores are free, unlimited, and never charged.

## 2. Import the catalogue

Shopify admin → **Products** → **Import** → upload
`shopiflow-demo-products.csv` → **Upload and continue** → **Import products**.

Leave "Publish new products to all sales channels" checked, or the products
exist but the storefront shows nothing.

Images are fetched from Shopify's own Burst CDN during import, so it takes a
minute and needs no action from you. 16 products, 72 variants.

## 3. Create the collections

CSV import cannot create collections, so make these by hand. Each one is an
**automated** collection with a single condition — *Product tag is equal to* —
which means they stay correct as the catalogue changes.

**Products → Collections → Create collection → Automated:**

| Title | Handle | Condition: product tag equals |
|---|---|---|
| Featured | `featured` | `featured` |
| Tops | `tops` | `tops` |
| Outerwear | `outerwear` | `outerwear` |
| Shoes | `shoes` | `shoes` |
| Accessories | `accessories` | `accessories` |

The handle matters for `featured`: the homepage's Featured collection section
is pre-set to it in `templates/index.json`. The others are only for navigation.

Then add them to navigation: **Content → Menus → Main menu**, and add a link
per collection. The header and footer read `main-menu` and `footer`, which
exist on every new store.

## 4. Connect the theme

Two different things, both useful:

**For editing — live reload:**

    cd shopify-theme
    npm run dev

Prints a local preview URL that hot-reloads as you save, plus a theme editor
URL. Nothing is published; it runs as a hidden development theme.

**For a permanent sample site you can revisit or share:**

    npm run push          # uploads as an unpublished theme
    # then in admin: Online Store → Themes → ... → Publish

Now the dev store's own URL *is* the sample storefront, running this theme,
whether or not the CLI is running. `npm run share` instead gives a shareable
preview link without publishing.

Dev stores are password-protected by default (**Online Store → Preferences**),
so keep the password handy or disable it for convenience.

## What each demo product is for

The catalogue is coverage, not decoration. If you change the product template,
these are the things to click:

| Product | Exercises |
|---|---|
| Everyday Cotton Tee | Color × Size (12 variants), scattered sold-out combinations |
| Classic Leather Jacket | Two options, on sale, **entire Tan colour sold out** |
| Striped Silk Blouse | Two options, on sale, one sold-out combination |
| Brushed Plaid Shirt | Single option group, one size gone |
| Canvas Weekend Tote | No options at all (`has_only_default_variant`) |
| League High Tops | **Every** variant sold out — add to cart must be disabled |
| Evening Tuxedo Jacket | Numeric sizes, non-adjacent gaps |
| Quilted Winter Coat | First option value unavailable |
| The rest | Filling grids, vendor display, collection pagination |

Three products carry a compare-at price, so sale badges and struck-through
prices appear in grids and on product pages.

The multi-colour products pin a photo per colour, which is what makes the
gallery swap images when you change colour. That is the single most valuable
thing to verify by hand, because nothing offline can test it.

## Colour swatches

The product template defaults to `variant_picker_style: swatches`, but Shopify
only has a swatch to draw if the option's values are linked to colours. If you
see text pills where you expect circles, that is the documented fallback, not a
bug.

To enable them: **Settings → Products → Variants** (or the option editor on a
product) and give the `Color` option values their colours. The option is named
`Color` in the CSV precisely so Shopify recognises it.

## Regenerating the catalogue

The CSV is generated, not hand-maintained:

    npm run demo:catalog

Edit the `products` array in `build-catalog.mjs` and re-run. Re-importing the
same file updates the existing products, because Shopify matches on handle —
it does not create duplicates.

Stock photos come from Burst, so a colour name and its photo do not always
agree. That is cosmetic and deliberate: the images exist to prove layout and
switching work, not to look like a real brand.

## The long-form product page

Every product uses `templates/product.json`, the long-form sales page, by
default. Open any product on the storefront to see it with placeholder copy.
Edit it in the theme editor (**Online Store → Themes → Customize →
Products**); the copy is written as instructions for what goes where.

Two things only you can supply:

- **Images** for the media sections and testimonials.
- **A reviews app** (Judge.me, Loox, Okendo…). Its star-rating metafields make
  the rating under the gallery appear, and its review widget goes in the
  **Apps** section at the bottom of the page.

To use the short layout on a product instead, set its **Theme template** to
`simple`.

## Quantity offers ("Buy 2 Get 3" bundles)

The theme ships an alternate product template, `product.offer`, with three
bundle tiers already configured. It is **not** the default template, on
purpose: offer cards advertise prices, and Shopify only charges those prices if
a matching discount exists. A theme cannot change what checkout charges.

### Show it on a product

Open **Everyday Cotton Tee** in the admin → right-hand **Theme template**
dropdown → `offer` → Save. Its page now shows the tiers. Every other product
keeps the plain quantity stepper.

The tiers, and the discount each one needs to be honest:

| Tier | Cart quantity | Card shows (at $32) | Discount to create |
|---|---|---|---|
| Buy 1 | 1 | $32.00 | none |
| Buy 2 Get 3 | 3 | $64.00, ~~$96.00~~ | Buy X get Y: buy 2, get 1 free |
| Buy 3 Get 5 | 5 | $96.00, ~~$160.00~~, + free tote | Buy X get Y: buy 3, get 2 free |
| (gift) | +1 tote | ~~$140.00~~ | Buy X get Y: buy 5 tees, get 1 tote free |
| (shipping) | — | "+ Free shipping" | Free shipping, minimum quantity 3 |

### Create the discounts

**Discounts → Create discount**, all *Automatic* so shoppers never type a code:

1. **Buy X get Y** — customer buys minimum quantity **2** of Everyday Cotton
   Tee; customer gets **1** of Everyday Cotton Tee at **Free**.
2. **Buy X get Y** — buys minimum **3**, gets **2** at **Free**. Same product.
3. **Buy X get Y** — buys minimum **5** Everyday Cotton Tee; gets **1** Canvas
   Weekend Tote at **Free**.
4. **Free shipping** — minimum quantity of items **3**.

Set **maximum uses per order to 1** on 1 and 2, or a shopper who edits the
quantity in the cart can stack free units beyond what any card promised.

On 3 and 4, tick **Combinations → product discounts**, so the gift and the free
shipping apply alongside the bundle saving rather than competing with it.

### Verify — this is the step that matters

I could not test discount behaviour without your store. For each tier: select
it, add to cart, and check the **cart total matches the card**. If it does not,
the discount setup is wrong, not the theme — but shoppers will not care whose
fault it is, so never leave a mismatched tier live.

Things most likely to need adjusting: whether Shopify picks the larger of
discounts 1 and 2 at quantity 5 (it should apply the best saving), and whether
the gift discount combines as configured.

### How the cart behaves

- **Plain tier** (no gift, no code): an ordinary form post with the tier's
  quantity. Works with JavaScript off.
- **Tier with a gift**: theme.js adds both lines in one request. With
  JavaScript off, only the bundle is added; the gift is missing from the cart,
  which the shopper sees before paying.
- **Tier with a discount code**: theme.js adds the items, then redirects
  through `/discount/<code>` so the code shows applied on the cart page.
  Prefer automatic discounts; they need no JavaScript at all.
- Changing colour or size keeps the chosen tier selected, and every price on
  the cards re-renders at the new variant's price.

### Bundle gifts that unlock with a tier

The "Free gifts with your bundle" row: add **Bundle gift** blocks (up to 4) to
**Product information**. They render under the tiers, wherever the tier blocks
sit. Section settings add the row's heading, a product image on each tier
(it follows the selected variant), and an optional sale countdown.

Per gift:

- **Unlocks from offer #** — counted from the top. `2` means the gift comes with
  the second tier and every tier below it; on tier 1 it shows greyed out with
  "Unlocks with <tier title>", and is not added to the cart.
- **Gift product** — added as its own cart line when unlocked. With **Let
  shoppers choose the gift's variant** on, a gift with several in-stock
  variants gets a dropdown (the "Panda" picker); the image and struck price
  follow the choice. A gift with nothing in stock is hidden rather than
  promised.
- No product — a display-only perk such as *Express shipping*: pick an icon or
  image and it locks and unlocks like the others.

Each gift still needs a discount, exactly like the tier gift above: **Buy X get
Y**, customer buys minimum quantity **2** of the bundle product, gets the gift
product at **Free**, maximum uses per order **1**, combinations → product
discounts. For a variant picker, add the whole gift product (not one variant)
under "customer gets", or only the default variant comes out free. A shipping
perk needs a **Free shipping** discount with minimum quantity 2.

If a shopper drops back to one unit in the cart, the gift line stays but its
discount no longer applies, so the cart shows it at full price. That is honest,
but worth knowing when checking support tickets.

**Sale countdown** — set *Sale countdown text* (with `[time]`) and *Sale ends*
(`YYYY-MM-DD HH:MM`, store time). It counts to that moment and disappears
after it. There is no restarting per-visitor timer: in the EU that is a listed
unfair commercial practice, and it is a false claim everywhere else.

### Reproducing the two mockup layouts

Both are the same block with different settings, in the theme editor under
**Product information → Quantity offer**:

- *Version 1*: no banner, unit price off, extra line "+FREE Shipping 🚚".
- *Version 2*: banner text set, unit price on with unit name "Pair", extra line
  "+ Free Shipping".

Strike-through prices are always computed as the real price of the units
received. The mockup's "Buy 3 Get 5 — ~~$199.94~~" cannot be reproduced: five
units at $29.99 are $149.95, and the theme will not show a reference price
higher than the real one.
