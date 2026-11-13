// Generates the demo store catalogue as a Shopify product-import CSV.
//
// The catalogue is defined here rather than hand-written as CSV because the
// point of it is coverage: every product below exists to exercise a specific
// path through the theme (multi-option picker, sold-out option values, sale
// badges, variant-to-image switching, the single-variant shortcut, a fully
// sold-out product). Editing a JS object keeps that intent legible; editing
// 100 rows of CSV does not.
//
// Header row is the official 46-column Shopify format, taken verbatim from
// shopifypartners/product-csvs. Column names are case-sensitive and the order
// is not meaningful to Shopify, but keeping it identical makes diffing against
// an export easy.
//
// Images are Burst URLs (Shopify's own free photo CDN), so the importer can
// always fetch them and they will not rot. They are stock photos, so a colour
// name and its photo do not always agree — irrelevant for exercising layout.
//
// Usage: node demo/build-catalog.mjs

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const COLUMNS = [
  'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
  'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value',
  'Option3 Name', 'Option3 Value',
  'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker',
  'Variant Inventory Qty', 'Variant Inventory Policy',
  'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price',
  'Variant Requires Shipping', 'Variant Taxable', 'Variant Barcode',
  'Image Src', 'Image Position', 'Image Alt Text', 'Gift Card',
  'SEO Title', 'SEO Description',
  'Google Shopping / Google Product Category', 'Google Shopping / Gender',
  'Google Shopping / Age Group', 'Google Shopping / MPN',
  'Google Shopping / AdWords Grouping', 'Google Shopping / AdWords Labels',
  'Google Shopping / Condition', 'Google Shopping / Custom Product',
  'Google Shopping / Custom Label 0', 'Google Shopping / Custom Label 1',
  'Google Shopping / Custom Label 2', 'Google Shopping / Custom Label 3',
  'Google Shopping / Custom Label 4',
  'Variant Image', 'Variant Weight Unit', 'Variant Tax Code',
];

const burst = (slug) => `https://burst.shopifycdn.com/photos/${slug}.jpg`;

// Option values named "Color" so Shopify's own swatch handling recognises the
// option; see demo/README.md on enabling swatches for these values.
const products = [
  {
    handle: 'everyday-cotton-tee',
    title: 'Everyday Cotton Tee',
    body: '<p>A midweight organic cotton tee that keeps its shape. Cut straight through the body with a ribbed neckband.</p><ul><li>240gsm organic cotton</li><li>Pre-shrunk</li><li>Machine wash cold</li></ul>',
    vendor: 'Shopiflow Basics',
    type: 'Tops',
    tags: ['tops', 'tees', 'featured'],
    price: 32,
    grams: 180,
    // Three colours x four sizes: the main workout for the variant picker.
    options: [
      { name: 'Color', values: ['Black', 'White', 'Red'] },
      { name: 'Size', values: ['S', 'M', 'L', 'XL'] },
    ],
    images: [
      { src: burst('womens-red-t-shirt_925x'), alt: 'Red cotton tee', forValue: 'Red' },
      { src: burst('white-cotton-shirt_925x'), alt: 'White cotton tee', forValue: 'White' },
      { src: burst('smiling-woman-poses_925x'), alt: 'Black cotton tee', forValue: 'Black' },
    ],
    // Scattered gaps, so some option values are reachable but unavailable.
    soldOut: ['Red / XL', 'Black / S'],
  },
  {
    handle: 'classic-leather-jacket',
    title: 'Classic Leather Jacket',
    body: '<p>Full-grain leather with an antique brass zip. Unlined through the sleeve so it moves from the first wear.</p>',
    vendor: 'Northgate Supply',
    type: 'Outerwear',
    tags: ['outerwear', 'jackets', 'featured'],
    price: 420,
    compareAt: 520,
    grams: 1600,
    options: [
      { name: 'Color', values: ['Black', 'Tan'] },
      { name: 'Size', values: ['S', 'M', 'L'] },
    ],
    images: [
      { src: burst('leather-jacket-and-tea_925x'), alt: 'Black leather jacket', forValue: 'Black' },
      { src: burst('urban-fashion_925x'), alt: 'Tan leather jacket', forValue: 'Tan' },
    ],
    // A whole colour gone: the Tan swatch should read as unavailable outright.
    soldOut: ['Tan / S', 'Tan / M', 'Tan / L'],
  },
  {
    handle: 'brushed-plaid-shirt',
    title: 'Brushed Plaid Shirt',
    body: '<p>Brushed cotton flannel in a red overcheck. Boxy fit with a single chest pocket.</p>',
    vendor: 'Northgate Supply',
    type: 'Shirts',
    tags: ['tops', 'shirts', 'featured'],
    price: 78,
    grams: 420,
    // Single option: the picker should render one group, not a grid.
    options: [{ name: 'Size', values: ['S', 'M', 'L', 'XL'] }],
    images: [{ src: burst('red-plaid-shirt_925x'), alt: 'Red plaid shirt' }],
    soldOut: ['XL'],
  },
  {
    handle: 'striped-silk-blouse',
    title: 'Striped Silk Blouse',
    body: '<p>Sandwashed silk with a relaxed collar and covered buttons. Cut long enough to tuck.</p>',
    vendor: 'Atelier Verde',
    type: 'Tops',
    tags: ['tops', 'featured'],
    price: 165,
    compareAt: 210,
    grams: 220,
    options: [
      { name: 'Color', values: ['Ivory', 'Navy'] },
      { name: 'Size', values: ['XS', 'S', 'M', 'L'] },
    ],
    images: [
      { src: burst('striped-blouse-fashion_925x'), alt: 'Ivory striped silk blouse', forValue: 'Ivory' },
      { src: burst('young-hip-woman-at-carnival_925x'), alt: 'Navy silk blouse', forValue: 'Navy' },
    ],
    soldOut: ['Ivory / XS'],
  },
  {
    handle: 'canvas-weekend-tote',
    title: 'Canvas Weekend Tote',
    body: '<p>Heavyweight waxed canvas with leather handles and a single interior pocket. Unstructured, so it packs flat.</p>',
    vendor: 'Northgate Supply',
    type: 'Bags',
    tags: ['accessories', 'bags', 'featured'],
    price: 140,
    grams: 900,
    // No options at all: exercises product.has_only_default_variant.
    options: [],
    images: [{ src: burst('black-bag-over-the-shoulder_925x'), alt: 'Black canvas tote bag' }],
  },
  {
    handle: 'league-high-tops',
    title: 'League High Tops',
    body: '<p>Vulcanised rubber sole with a canvas upper and a padded collar.</p>',
    vendor: 'Shopiflow Basics',
    type: 'Shoes',
    tags: ['shoes'],
    price: 95,
    grams: 800,
    options: [{ name: 'Size', values: ['7', '8', '9', '10', '11'] }],
    images: [{ src: burst('putting-on-your-shoes_925x'), alt: 'Canvas high top shoes' }],
    // Every variant gone: add to cart must render disabled and say Sold out.
    soldOut: ['7', '8', '9', '10', '11'],
  },
  {
    handle: 'merino-wool-jumper',
    title: 'Merino Wool Jumper',
    body: '<p>Fine-gauge merino with a saddle shoulder. Warm without the bulk.</p>',
    vendor: 'Atelier Verde',
    type: 'Knitwear',
    tags: ['tops', 'knitwear'],
    price: 185,
    grams: 480,
    options: [{ name: 'Size', values: ['S', 'M', 'L'] }],
    images: [{ src: burst('autumn-photographer-taking-picture_925x'), alt: 'Yellow wool jumper' }],
  },
  {
    handle: 'field-jacket-navy',
    title: 'Navy Field Jacket',
    body: '<p>Cotton ripstop with four patch pockets and a drawcord waist.</p>',
    vendor: 'Northgate Supply',
    type: 'Outerwear',
    tags: ['outerwear', 'jackets'],
    price: 240,
    grams: 1100,
    options: [{ name: 'Size', values: ['S', 'M', 'L', 'XL'] }],
    images: [{ src: burst('mens-fall-fashion-jacket_925x'), alt: 'Navy field jacket' }],
  },
  {
    handle: 'zip-through-track-jacket',
    title: 'Zip-Through Track Jacket',
    body: '<p>Recycled polyester with a two-way zip and ribbed cuffs.</p>',
    vendor: 'Shopiflow Basics',
    type: 'Outerwear',
    tags: ['outerwear', 'jackets'],
    price: 110,
    compareAt: 135,
    grams: 520,
    options: [{ name: 'Size', values: ['S', 'M', 'L'] }],
    images: [{ src: burst('menswear-blue-zip-up-jacket_925x'), alt: 'Blue zip up jacket' }],
  },
  {
    handle: 'quilted-winter-coat',
    title: 'Quilted Winter Coat',
    body: '<p>Recycled down fill with a storm placket and a high collar.</p>',
    vendor: 'Atelier Verde',
    type: 'Outerwear',
    tags: ['outerwear'],
    price: 380,
    grams: 1800,
    options: [{ name: 'Size', values: ['XS', 'S', 'M', 'L'] }],
    images: [{ src: burst('smiling-woman-on-snowy-afternoon_925x'), alt: 'Quilted winter coat' }],
    soldOut: ['XS'],
  },
  {
    handle: 'longsleeve-cotton-top',
    title: 'Longsleeve Cotton Top',
    body: '<p>Slim ribbed cotton with a crew neck. Layers under everything.</p>',
    vendor: 'Shopiflow Basics',
    type: 'Tops',
    tags: ['tops', 'tees'],
    price: 45,
    grams: 200,
    options: [{ name: 'Size', values: ['XS', 'S', 'M', 'L'] }],
    images: [{ src: burst('woman-outside-brownstone_925x'), alt: 'Longsleeve cotton top' }],
  },
  {
    handle: 'varsity-crew-sweat',
    title: 'Varsity Crew Sweat',
    body: '<p>Loopback cotton with set-in sleeves and a felt chest patch.</p>',
    vendor: 'Shopiflow Basics',
    type: 'Knitwear',
    tags: ['tops', 'knitwear'],
    price: 88,
    grams: 560,
    options: [{ name: 'Size', values: ['S', 'M', 'L', 'XL'] }],
    images: [{ src: burst('casual-fashion-woman_925x'), alt: 'Varsity crew sweatshirt' }],
  },
  {
    handle: 'floral-print-top',
    title: 'Floral Print Top',
    body: '<p>Lightweight viscose with a shirred shoulder.</p>',
    vendor: 'Atelier Verde',
    type: 'Tops',
    tags: ['tops'],
    price: 72,
    grams: 180,
    options: [{ name: 'Size', values: ['XS', 'S', 'M'] }],
    images: [{ src: burst('city-woman-fashion_925x@2x'), alt: 'Floral print top' }],
  },
  {
    handle: 'selvedge-denim-shirt',
    title: 'Selvedge Denim Shirt',
    body: '<p>Indigo selvedge denim, 9oz, with chambray-lined cuffs.</p>',
    vendor: 'Northgate Supply',
    type: 'Shirts',
    tags: ['tops', 'shirts'],
    price: 135,
    grams: 480,
    options: [{ name: 'Size', values: ['S', 'M', 'L'] }],
    images: [{ src: burst('young-female-models-denim_925x'), alt: 'Denim shirt' }],
  },
  {
    handle: 'evening-tuxedo-jacket',
    title: 'Evening Tuxedo Jacket',
    body: '<p>Midnight blue wool-mohair with a grosgrain shawl lapel.</p>',
    vendor: 'Atelier Verde',
    type: 'Outerwear',
    tags: ['outerwear', 'formal'],
    price: 620,
    grams: 1400,
    options: [{ name: 'Size', values: ['38', '40', '42', '44'] }],
    images: [{ src: burst('man-adjusts-blue-tuxedo-bowtie_925x'), alt: 'Blue tuxedo jacket' }],
    soldOut: ['38', '44'],
  },
  {
    handle: 'ocean-oxford-shirt',
    title: 'Ocean Oxford Shirt',
    body: '<p>Washed oxford cotton with a button-down collar.</p>',
    vendor: 'Shopiflow Basics',
    type: 'Shirts',
    tags: ['tops', 'shirts'],
    price: 85,
    grams: 380,
    options: [{ name: 'Size', values: ['S', 'M', 'L', 'XL'] }],
    images: [{ src: burst('young-man-in-bright-fashion_925x'), alt: 'Blue oxford shirt' }],
  },
];

/** Cartesian product of the option value lists, in Shopify's row order. */
const buildVariants = (product) => {
  if (product.options.length === 0) {
    return [{ values: ['Default Title'], key: null }];
  }

  let combos = [[]];
  for (const option of product.options) {
    combos = combos.flatMap((combo) => option.values.map((value) => [...combo, value]));
  }

  return combos.map((values) => ({ values, key: values.join(' / ') }));
};

const csvEscape = (value) => {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const rows = [];
let skuCounter = 1000;

for (const product of products) {
  const variants = buildVariants(product);
  const soldOut = new Set(product.soldOut ?? []);
  const rowCount = Math.max(variants.length, product.images.length);

  for (let i = 0; i < rowCount; i += 1) {
    const variant = variants[i];
    const image = product.images[i];
    const row = {};

    // Product-level fields belong on the first row only; repeating them is
    // valid but makes the file noisy and the diffs useless.
    if (i === 0) {
      row['Handle'] = product.handle;
      row['Title'] = product.title;
      row['Body (HTML)'] = product.body;
      row['Vendor'] = product.vendor;
      row['Type'] = product.type;
      row['Tags'] = product.tags.join(', ');
      row['Published'] = 'TRUE';
      row['Gift Card'] = 'FALSE';
      row['SEO Title'] = product.title;
      row['SEO Description'] = product.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    } else {
      row['Handle'] = product.handle;
    }

    if (variant) {
      product.options.forEach((option, index) => {
        row[`Option${index + 1} Name`] = option.name;
        row[`Option${index + 1} Value`] = variant.values[index];
      });

      if (product.options.length === 0) {
        row['Option1 Name'] = 'Title';
        row['Option1 Value'] = 'Default Title';
      }

      const isSoldOut = variant.key !== null && soldOut.has(variant.key);

      row['Variant SKU'] = `SF-${skuCounter += 1}`;
      row['Variant Grams'] = product.grams;
      row['Variant Inventory Tracker'] = 'shopify';
      row['Variant Inventory Qty'] = isSoldOut ? 0 : 25;
      // "deny" is what makes a zero-quantity variant actually unavailable,
      // which is the state the theme's sold-out handling reacts to.
      row['Variant Inventory Policy'] = 'deny';
      row['Variant Fulfillment Service'] = 'manual';
      row['Variant Price'] = product.price;
      row['Variant Compare At Price'] = product.compareAt ?? '';
      row['Variant Requires Shipping'] = 'TRUE';
      row['Variant Taxable'] = 'TRUE';
      row['Variant Weight Unit'] = 'g';

      // Pin the variant to the photo for its colour so changing colour
      // changes the gallery image. Only meaningful when a colour option
      // exists; size alone does not get its own photo.
      const colorIndex = product.options.findIndex((option) => option.name === 'Color');
      if (colorIndex !== -1) {
        const colorValue = variant.values[colorIndex];
        const match = product.images.find((candidate) => candidate.forValue === colorValue);
        if (match) row['Variant Image'] = match.src;
      }
    }

    if (image) {
      row['Image Src'] = image.src;
      row['Image Position'] = i + 1;
      row['Image Alt Text'] = image.alt;
    }

    rows.push(row);
  }
}

const csv = [
  COLUMNS.join(','),
  ...rows.map((row) => COLUMNS.map((column) => csvEscape(row[column])).join(',')),
].join('\n');

const outPath = join(HERE, 'shopiflow-demo-products.csv');
writeFileSync(outPath, csv + '\n', 'utf8');

const variantTotal = products.reduce((sum, p) => sum + buildVariants(p).length, 0);
const soldOutTotal = products.reduce((sum, p) => sum + (p.soldOut?.length ?? 0), 0);

console.log(`${products.length} products, ${variantTotal} variants (${soldOutTotal} sold out)`);
console.log(`${rows.length} CSV rows -> demo/shopiflow-demo-products.csv`);
