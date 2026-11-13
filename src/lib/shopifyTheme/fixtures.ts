// Sample store the preview renders against until a real store is connected.
// Prices are in cents, as Shopify's Liquid objects carry them.
import { ImageDrop } from './drops';

const svgImage = (label: string, hue: number, width: number, height: number, id: number) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="hsl(${hue} 35% 90%)"/>` +
    `<circle cx="${width / 2}" cy="${height / 2 - height * 0.06}" r="${Math.min(width, height) * 0.22}" fill="hsl(${hue} 40% 72%)"/>` +
    `<text x="50%" y="${height * 0.86}" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(width / 18)}" fill="hsl(${hue} 30% 35%)">${label}</text>` +
    `</svg>`;
  return new ImageDrop(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, label, width, height, id);
};

interface ProductSeed {
  handle: string;
  title: string;
  price: number;
  compareAt?: number;
  hue: number;
  vendor: string;
  type: string;
  sizes?: string[];
}

const SEEDS: ProductSeed[] = [
  { handle: 'daily-greens', title: 'Daily Greens Powder', price: 4900, compareAt: 6500, hue: 140, vendor: 'Shopiflow', type: 'Supplement', sizes: ['30 servings', '60 servings', '90 servings'] },
  { handle: 'sleep-gummies', title: 'Deep Sleep Gummies', price: 2900, hue: 260, vendor: 'Shopiflow', type: 'Supplement' },
  { handle: 'protein-bar-box', title: 'Protein Bar Box', price: 3400, compareAt: 3900, hue: 30, vendor: 'Shopiflow', type: 'Snack', sizes: ['12 bars', '24 bars'] },
  { handle: 'shaker-bottle', title: 'Steel Shaker Bottle', price: 2400, hue: 200, vendor: 'Shopiflow', type: 'Accessory' },
  { handle: 'collagen-peptides', title: 'Collagen Peptides', price: 3900, hue: 15, vendor: 'Shopiflow', type: 'Supplement' },
  { handle: 'electrolyte-mix', title: 'Electrolyte Drink Mix', price: 2200, compareAt: 2800, hue: 185, vendor: 'Shopiflow', type: 'Supplement' },
  { handle: 'gift-card', title: 'Gift Card', price: 5000, hue: 330, vendor: 'Shopiflow', type: 'Gift card' },
  { handle: 'starter-bundle', title: 'Starter Bundle', price: 9900, compareAt: 12900, hue: 95, vendor: 'Shopiflow', type: 'Bundle' },
];

const DESCRIPTION =
  '<p>A short product description goes here. Say what it is, who it is for and why it is worth the money.</p>' +
  '<ul><li>Made with clean ingredients</li><li>Ships in 1–2 business days</li><li>30-day money-back guarantee</li></ul>';

let nextId = 1000;

const buildProduct = (seed: ProductSeed) => {
  const productId = nextId++;
  const images = [0, 1, 2].map((i) => svgImage(seed.title, seed.hue + i * 18, 1200, 1200, nextId++));
  const sizes = seed.sizes ?? ['Default Title'];
  const variants = sizes.map((size, i) => {
    const price = seed.price + i * Math.round(seed.price * 0.8);
    const compareAt = seed.compareAt ? seed.compareAt + i * Math.round(seed.compareAt * 0.8) : null;
    return {
      id: nextId++,
      title: size,
      option1: size,
      options: [size],
      price,
      compare_at_price: compareAt,
      available: true,
      sku: `${seed.handle}-${i + 1}`,
      url: `/products/${seed.handle}?variant=${i}`,
      featured_image: images[0],
      featured_media: images[0],
      image: images[0],
      requires_shipping: true,
      inventory_quantity: 50,
      metafields: {},
    };
  });
  const first = variants[0];
  const hasOnlyDefault = !seed.sizes;
  return {
    id: productId,
    handle: seed.handle,
    title: seed.title,
    url: `/products/${seed.handle}`,
    vendor: seed.vendor,
    type: seed.type,
    description: DESCRIPTION,
    content: DESCRIPTION,
    available: true,
    price: first.price,
    price_min: first.price,
    price_max: variants[variants.length - 1].price,
    price_varies: variants.length > 1,
    compare_at_price: first.compare_at_price,
    compare_at_price_min: first.compare_at_price,
    compare_at_price_max: variants[variants.length - 1].compare_at_price,
    featured_image: images[0],
    featured_media: images[0],
    images,
    media: images,
    variants,
    selected_variant: null,
    selected_or_first_available_variant: first,
    first_available_variant: first,
    has_only_default_variant: hasOnlyDefault,
    options: hasOnlyDefault ? ['Title'] : ['Size'],
    options_with_values: hasOnlyDefault
      ? [{ name: 'Title', position: 1, values: ['Default Title'], selected_value: 'Default Title' }]
      : [{ name: 'Size', position: 1, values: sizes, selected_value: sizes[0] }],
    tags: [seed.type.toLowerCase()],
    metafields: {},
    gift_card: seed.type === 'Gift card',
    requires_selling_plan: false,
    selling_plan_groups: [],
  };
};

export type FixtureProduct = ReturnType<typeof buildProduct>;

export const PRODUCTS: FixtureProduct[] = SEEDS.map(buildProduct);

const buildCollection = (handle: string, title: string, products: FixtureProduct[], hue: number) => ({
  id: nextId++,
  handle,
  title,
  url: `/collections/${handle}`,
  description: `<p>Everything in ${title.toLowerCase()}, in one place.</p>`,
  products,
  products_count: products.length,
  all_products_count: products.length,
  featured_image: svgImage(title, hue, 1600, 900, nextId++),
  image: null,
  sort_by: 'manual',
  default_sort_by: 'manual',
  sort_options: [
    { value: 'manual', name: 'Featured' },
    { value: 'price-ascending', name: 'Price, low to high' },
    { value: 'price-descending', name: 'Price, high to low' },
  ],
  filters: [],
  current_type: null,
  current_vendor: null,
});

export const COLLECTIONS = [
  buildCollection('all', 'All products', PRODUCTS, 120),
  buildCollection('featured', 'Featured', PRODUCTS.slice(0, 4), 40),
  buildCollection('frontpage', 'Home page', PRODUCTS.slice(0, 4), 40),
  buildCollection('best-sellers', 'Best sellers', PRODUCTS.slice(2, 8), 280),
];

const link = (title: string, url: string, links: unknown[] = []) => ({
  title,
  url,
  links,
  active: false,
  current: false,
  child_active: false,
  levels: links.length ? 1 : 0,
  type: 'http_link',
});

export const LINKLISTS: Record<string, { handle: string; title: string; links: unknown[] }> = {
  'main-menu': {
    handle: 'main-menu',
    title: 'Main menu',
    links: [link('Home', '/'), link('Shop all', '/collections/all'), link('Best sellers', '/collections/best-sellers'), link('About', '/pages/about')],
  },
  footer: {
    handle: 'footer',
    title: 'Footer menu',
    links: [link('Search', '/search'), link('Shipping', '/pages/shipping'), link('Refund policy', '/policies/refund-policy'), link('Contact', '/pages/contact')],
  },
};

const ARTICLE_BODY =
  '<p>This is a sample blog post. Write about how your product is made, answer a common question, or share a customer story.</p>' +
  '<p>Posts like this give shoppers a reason to come back and help your store show up in search.</p>';

export const BLOG = {
  id: nextId++,
  handle: 'news',
  title: 'News',
  url: '/blogs/news',
  articles: [
    { title: 'How we source our ingredients', hue: 100 },
    { title: '5 habits for better sleep', hue: 250 },
    { title: 'What customers ask us most', hue: 20 },
  ].map(({ title, hue }, i) => ({
    id: nextId++,
    title,
    handle: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    url: `/blogs/news/${i}`,
    author: 'Shopiflow team',
    published_at: new Date(Date.UTC(2026, 9, 20 - i * 6)).toISOString(),
    created_at: new Date(Date.UTC(2026, 9, 20 - i * 6)).toISOString(),
    image: svgImage(title, hue, 1600, 1000, nextId++),
    excerpt: '',
    excerpt_or_content: ARTICLE_BODY,
    content: ARTICLE_BODY,
    tags: [],
    comments: [],
    comments_count: 0,
    comments_enabled: false,
  })),
  articles_count: 3,
  tags: [],
  comments_enabled: false,
};

export const PAGE = {
  id: nextId++,
  handle: 'about',
  title: 'About us',
  url: '/pages/about',
  content: '<p>Tell shoppers who you are and why you started. A real story builds more trust than a list of features.</p>',
  author: 'Shopiflow team',
};

export const SHOP = {
  name: 'Your Store',
  description: 'A short description of your store.',
  url: 'https://your-store.myshopify.com',
  domain: 'your-store.myshopify.com',
  permanent_domain: 'your-store.myshopify.com',
  currency: 'USD',
  money_format: '${{amount}}',
  money_with_currency_format: '${{amount}} USD',
  enabled_payment_types: ['visa', 'master', 'american_express', 'paypal', 'apple_pay', 'google_pay'],
  customer_accounts_enabled: true,
  customer_accounts_optional: true,
  brand: null,
};

export const EMPTY_CART = {
  item_count: 0,
  items: [],
  items_subtotal_price: 0,
  total_price: 0,
  total_discount: 0,
  original_total_price: 0,
  note: '',
  currency: { iso_code: 'USD', symbol: '$' },
  requires_shipping: false,
  cart_level_discount_applications: [],
};

export const ROUTES = {
  root_url: '/',
  account_url: '/account',
  account_login_url: '/account/login',
  account_logout_url: '/account/logout',
  account_register_url: '/account/register',
  account_addresses_url: '/account/addresses',
  collections_url: '/collections',
  all_products_collection_url: '/collections/all',
  search_url: '/search',
  predictive_search_url: '/search/suggest',
  cart_url: '/cart',
  cart_add_url: '/cart/add',
  cart_change_url: '/cart/change',
  cart_clear_url: '/cart/clear',
  cart_update_url: '/cart/update',
  product_recommendations_url: '/recommendations/products',
};

export const findProduct = (handle: unknown) =>
  PRODUCTS.find((product) => product.handle === handle) ?? PRODUCTS[0];

export const findCollection = (handle: unknown) =>
  COLLECTIONS.find((collection) => collection.handle === handle) ?? COLLECTIONS[1];
