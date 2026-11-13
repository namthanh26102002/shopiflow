// Renders a theme project to a full HTML document for the editor preview.
//
// The real Liquid from shopify-theme/base runs here against sample store data
// (fixtures.ts). The page is shown in a sandboxed iframe with an opaque origin,
// so theme code and merchant-entered HTML cannot reach the app's session; the
// two sides talk only through postMessage (see PREVIEW_BRIDGE).
import type { Context, Liquid, Template } from 'liquidjs';
import { ColorDrop, ColorSchemeDrop, FontDrop, ImageDrop } from './drops';
import {
  BLOG,
  COLLECTIONS,
  EMPTY_CART,
  LINKLISTS,
  PAGE,
  PRODUCTS,
  ROUTES,
  SHOP,
  findCollection,
  findProduct,
} from './fixtures';
import { ASSET_PREFIX, createShopifyLiquid, withHandle } from './shopifyLiquid';
import { settingDefaults } from './state';
import { SECTION_SCHEMAS, THEME_FILES, THEME_SETTINGS_SCHEMA } from './themeSource';
import type { BlockDef, SectionInstance, SectionRef, SettingDef, SettingsMap, TemplateJson, ThemeData } from './types';

export const refToAttr = (ref: SectionRef) => `${ref.scope}|${ref.container}|${ref.key}`;
export const attrToRef = (value: string): SectionRef | null => {
  const [scope, container, key] = value.split('|');
  if ((scope !== 'template' && scope !== 'group') || !container || !key) return null;
  return { scope, container, key };
};

/** "product.offer" → "product". */
export const pageTypeOf = (template: string) => template.split('.')[0];

const toUrl = (value: unknown) => {
  if (typeof value !== 'string' || value === '') return null;
  return value.startsWith('shopify://') ? `/${value.slice('shopify://'.length)}` : value;
};

const toImage = (value: unknown) =>
  typeof value === 'string' && /^(https?:|data:image\/)/.test(value) ? new ImageDrop(value, '', 1600, 1200) : null;

type Schemes = Record<string, ColorSchemeDrop>;

/** Turns stored setting values into the objects Shopify gives Liquid. */
const convertSettings = (defs: SettingDef[] = [], stored: SettingsMap = {}, schemes: Schemes): Record<string, unknown> => {
  const values: Record<string, unknown> = { ...settingDefaults(defs), ...stored };
  const out: Record<string, unknown> = {};
  const byId = new Map(defs.filter((def) => def.id).map((def) => [def.id as string, def]));

  for (const [id, value] of Object.entries(values)) {
    const def = byId.get(id);
    out[id] = def ? convertValue(def, value, schemes) : value;
  }
  // A setting with no default and no stored value is nil on Shopify, not missing.
  for (const def of defs) if (def.id && !(def.id in out)) out[def.id] = def.type === 'checkbox' ? false : null;
  return out;
};

const convertValue = (def: SettingDef, value: unknown, schemes: Schemes): unknown => {
  switch (def.type) {
    case 'color':
      return typeof value === 'string' && value !== '' ? new ColorDrop(value) : null;
    case 'color_scheme':
      return schemes[String(value)] ?? Object.values(schemes)[0] ?? null;
    case 'font_picker':
      return new FontDrop(String(value || 'assistant_n4'));
    case 'image_picker':
      return toImage(value);
    case 'range':
    case 'number':
      return value === null || value === '' || value === undefined ? null : Number(value);
    case 'checkbox':
      return Boolean(value);
    case 'url':
      return toUrl(value);
    case 'product':
      return value ? withHandle(String(value), findProduct(value)) : null;
    case 'product_list':
      return Array.isArray(value) ? value.map((handle) => findProduct(handle)) : [];
    case 'collection':
      return value ? withHandle(String(value), findCollection(value)) : null;
    case 'collection_list':
      return Array.isArray(value) ? value.map((handle) => findCollection(handle)) : [];
    case 'link_list': {
      const list = LINKLISTS[String(value)];
      return list ? withHandle(list.handle, list) : null;
    }
    case 'page':
      return value ? PAGE : null;
    case 'blog':
      return value ? BLOG : null;
    case 'article':
      return value ? BLOG.articles[0] : null;
    case 'video':
    case 'video_url':
      return null;
    default:
      return value ?? null;
  }
};

const buildSchemes = (data: ThemeData): Schemes => {
  const groupDef = THEME_SETTINGS_SCHEMA.flatMap((group) => group.settings ?? []).find(
    (def) => def.type === 'color_scheme_group',
  );
  const stored = (data.settings[groupDef?.id ?? 'color_schemes'] ?? {}) as Record<string, { settings?: SettingsMap }>;
  const schemes: Schemes = {};
  for (const [id, scheme] of Object.entries(stored)) {
    const settings = convertSettings(groupDef?.definition, scheme.settings, {});
    schemes[id] = new ColorSchemeDrop(id, settings);
  }
  return schemes;
};

const buildThemeSettings = (data: ThemeData, schemes: Schemes) => {
  const defs = THEME_SETTINGS_SCHEMA.flatMap((group) => group.settings ?? []).filter((def) => def.type !== 'color_scheme_group');
  const settings = convertSettings(defs, data.settings, schemes);
  const groupDef = THEME_SETTINGS_SCHEMA.flatMap((group) => group.settings ?? []).find((def) => def.type === 'color_scheme_group');
  if (groupDef?.id) {
    // Iterable for {% for scheme in settings.color_schemes %}, keyed for settings.color_schemes['scheme-1'].
    const list = Object.values(schemes) as unknown as ColorSchemeDrop[] & Record<string, ColorSchemeDrop>;
    for (const scheme of Object.values(schemes)) list[scheme.id] = scheme;
    settings[groupDef.id] = list;
  }
  return settings;
};

/** Google Fonts links for the theme's font settings (Shopify serves these from its own CDN). */
const fontLinks = (settings: Record<string, unknown>) => {
  const families = new Map<string, Set<number>>();
  for (const value of Object.values(settings)) {
    if (!(value instanceof FontDrop) || value['system?']) continue;
    const weights = families.get(value.family) ?? new Set<number>();
    weights.add(value.weight);
    weights.add(Math.min(900, Math.max(700, value.weight + 300)));
    families.set(value.family, weights);
  }
  // One request per family: Google rejects a whole request if one weight is missing.
  return [...families.entries()]
    .map(([family, weights]) => {
      const query = `${encodeURIComponent(family).replace(/%20/g, '+')}:wght@${[...weights].sort((a, b) => a - b).join(';')}`;
      return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${query}&display=swap">`;
    })
    .join('');
};

/**
 * Runs inside the preview iframe. Stops links and forms from navigating, tells
 * the editor which section was clicked, and swaps sections in place when the
 * editor sends new HTML, so typing does not reload the whole page.
 */
const PREVIEW_BRIDGE = `
(function () {
  var post = function (msg) { parent.postMessage(Object.assign({ source: 'sf-preview' }, msg), '*'); };
  var style = document.createElement('style');
  style.textContent = '[data-sf-section]{position:relative}[data-sf-section].sf-hover::after,[data-sf-section].sf-selected::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:2147483646;outline:2px solid #2563eb;outline-offset:-2px}[data-sf-section].sf-hover:not(.sf-selected)::after{outline-style:dashed;outline-color:#60a5fa}';
  document.head.appendChild(style);

  document.addEventListener('click', function (event) {
    var target = event.target;
    var link = target.closest && target.closest('a[href], button[type="submit"], input[type="submit"]');
    if (link) event.preventDefault();
    var section = target.closest && target.closest('[data-sf-section]');
    if (!section) return;
    var block = target.closest('[data-sf-block]');
    post({ type: 'select', ref: section.getAttribute('data-sf-section'), block: block && section.contains(block) ? block.getAttribute('data-sf-block') : null });
  }, true);
  document.addEventListener('submit', function (event) { event.preventDefault(); }, true);

  var hovered = null;
  document.addEventListener('mouseover', function (event) {
    var section = event.target.closest && event.target.closest('[data-sf-section]');
    if (section === hovered) return;
    if (hovered) hovered.classList.remove('sf-hover');
    hovered = section;
    if (hovered) hovered.classList.add('sf-hover');
  });

  var scrollTimer = null;
  window.addEventListener('scroll', function () {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () { post({ type: 'scroll', y: window.scrollY }); }, 80);
  }, { passive: true });

  var find = function (ref) {
    var all = document.querySelectorAll('[data-sf-section]');
    for (var i = 0; i < all.length; i++) if (all[i].getAttribute('data-sf-section') === ref) return all[i];
    return null;
  };

  window.addEventListener('message', function (event) {
    var msg = event.data || {};
    if (msg.target !== 'sf-preview') return;
    if (msg.type === 'replace-section') {
      var old = find(msg.ref);
      if (!old) return;
      var holder = document.createElement('div');
      holder.innerHTML = msg.html;
      var fresh = holder.firstElementChild;
      if (!fresh) return;
      if (old.classList.contains('sf-selected')) fresh.classList.add('sf-selected');
      old.replaceWith(fresh);
      // Inline scripts in the new HTML do not run through innerHTML; re-create them.
      fresh.querySelectorAll('script').forEach(function (s) {
        var copy = document.createElement('script');
        for (var i = 0; i < s.attributes.length; i++) copy.setAttribute(s.attributes[i].name, s.attributes[i].value);
        copy.textContent = s.textContent;
        s.replaceWith(copy);
      });
      document.dispatchEvent(new CustomEvent('shopify:section:load', { bubbles: true, detail: { sectionId: msg.ref } }));
    } else if (msg.type === 'select') {
      document.querySelectorAll('.sf-selected').forEach(function (el) { el.classList.remove('sf-selected'); });
      var el = msg.ref && find(msg.ref);
      if (el) {
        el.classList.add('sf-selected');
        if (msg.scroll) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });

  if (window.__sfRestoreScroll) window.scrollTo(0, window.__sfRestoreScroll);
  post({ type: 'ready' });
})();
`;

export interface RenderPageOptions {
  /** Scroll position to restore once the page loads. */
  scrollY?: number;
  /** Section ref (refToAttr) to outline as selected. */
  selectedRef?: string | null;
}

export class ThemeRenderer {
  private engine: Liquid;
  private parsed = new Map<string, Template[]>();

  constructor() {
    const snippets = Object.fromEntries(
      Object.entries(THEME_FILES)
        .filter(([rel]) => rel.startsWith('snippets/') && rel.endsWith('.liquid'))
        .map(([rel, src]) => [rel.slice('snippets/'.length, -'.liquid'.length), src]),
    );
    this.engine = createShopifyLiquid({
      snippets,
      locale: JSON.parse(THEME_FILES['locales/en.default.json'] ?? '{}'),
      moneyFormat: SHOP.money_format,
      moneyWithCurrencyFormat: SHOP.money_with_currency_format,
      renderGroup: (name, ctx) => this.renderGroup(name, ctx),
    });
  }

  private parse(path: string): Template[] {
    let tpl = this.parsed.get(path);
    if (!tpl) {
      const source = THEME_FILES[path];
      if (source === undefined) throw new Error(`Missing theme file: ${path}`);
      tpl = this.engine.parse(source, path);
      this.parsed.set(path, tpl);
    }
    return tpl;
  }

  /** Liquid globals for one page of one theme state. */
  globalsFor(data: ThemeData, template: string): Record<string, unknown> {
    const schemes = buildSchemes(data);
    const settings = buildThemeSettings(data, schemes);
    const pageType = pageTypeOf(template);
    const product = PRODUCTS[0];
    const collection = COLLECTIONS[0];
    const article = BLOG.articles[0];
    const titles: Record<string, string> = {
      product: product.title,
      collection: collection.title,
      article: article.title,
      blog: BLOG.title,
      page: PAGE.title,
      cart: 'Your cart',
      search: 'Search',
      '404': 'Page not found',
      'list-collections': 'Collections',
    };

    return {
      __data: data,
      __schemes: schemes,
      settings,
      shop: SHOP,
      routes: ROUTES,
      cart: EMPTY_CART,
      linklists: LINKLISTS,
      collections: Object.fromEntries(COLLECTIONS.map((c) => [c.handle, c])),
      all_products: Object.fromEntries(PRODUCTS.map((p) => [p.handle, p])),
      blogs: { [BLOG.handle]: BLOG },
      pages: { [PAGE.handle]: PAGE },
      request: { page_type: pageType, design_mode: true, visual_preview_mode: false, locale: { iso_code: 'en', primary: true }, host: SHOP.domain, path: '/' },
      template: { name: pageType, suffix: template.includes('.') ? template.split('.').slice(1).join('.') : null, directory: null },
      localization: { country: { name: 'United States', iso_code: 'US' }, language: { iso_code: 'en', name: 'English' }, available_countries: [], available_languages: [] },
      page_title: titles[pageType] ?? SHOP.name,
      page_description: SHOP.description,
      canonical_url: `${SHOP.url}/`,
      content_for_header: '',
      current_page: 1,
      current_tags: null,
      powered_by_link: '<a href="https://www.shopify.com" target="_blank" rel="nofollow">Powered by Shopify</a>',
      customer: null,
      search: { performed: false, terms: '', results: [], results_count: 0 },
      ...(pageType === 'product' ? { product } : {}),
      ...(pageType === 'collection' ? { collection } : {}),
      ...(pageType === 'list-collections' ? { collections: Object.fromEntries(COLLECTIONS.map((c) => [c.handle, c])) } : {}),
      ...(pageType === 'blog' || pageType === 'article' ? { blog: BLOG } : {}),
      ...(pageType === 'article' ? { article } : {}),
      ...(pageType === 'page' ? { page: PAGE } : {}),
      __fontLinks: fontLinks(settings),
    };
  }

  private sectionObject(ref: SectionRef, instance: SectionInstance, index: number, schemes: Schemes, location: string) {
    const schema = SECTION_SCHEMAS[instance.type];
    const blockDefs = new Map<string, BlockDef>((schema?.blocks ?? []).map((def) => [def.type, def]));
    const blocks = (instance.block_order ?? Object.keys(instance.blocks ?? {}))
      .map((key) => [key, instance.blocks?.[key]] as const)
      .filter(([, block]) => block && !block.disabled)
      .map(([key, block]) => ({
        id: key,
        type: block!.type,
        settings: convertSettings(blockDefs.get(block!.type)?.settings, block!.settings, schemes),
        shopify_attributes: `data-sf-block="${key}"`,
      }));
    return {
      id: ref.key,
      index: index + 1,
      index0: index,
      location,
      settings: convertSettings(schema?.settings, instance.settings, schemes),
      blocks,
    };
  }

  /** One section's HTML, including Shopify's wrapper element. */
  async renderSection(
    ref: SectionRef,
    instance: SectionInstance,
    index: number,
    globals: Record<string, unknown>,
  ): Promise<string> {
    const schema = SECTION_SCHEMAS[instance.type];
    const attr = refToAttr(ref).replace(/"/g, '&quot;');
    const tag = schema?.tag ?? 'div';
    const cls = ['shopify-section', schema?.class].filter(Boolean).join(' ');
    const id = ref.scope === 'group' ? `shopify-section-sections--${ref.container}__${ref.key}` : `shopify-section-${ref.key}`;
    if (instance.type.startsWith('shopify://apps/')) {
      // Added by a Shopify app on the merchant's store; its code lives in the app.
      const app = instance.type.split('/')[3] ?? 'an app';
      return `<${tag} id="${id}" class="${cls}" data-sf-section="${attr}"><div style="margin:16px auto;max-width:960px;padding:20px;border:1px dashed #94a3b8;border-radius:8px;color:#475569;font:14px/1.4 sans-serif;text-align:center">Section from the “${app.replace(/[<>"&]/g, '')}” app. It shows on your store, not in this preview.</div></${tag}>`;
    }
    let inner: string;
    try {
      const location = ref.scope === 'group' ? ((globals.__data as ThemeData).groups[ref.container]?.type ?? 'custom') : 'template';
      const section = this.sectionObject(ref, instance, index, globals.__schemes as Schemes, location);
      inner = await this.engine.render(this.parse(`sections/${instance.type}.liquid`), { section }, { globals });
    } catch (error) {
      // One broken section should not blank the whole preview.
      const message = error instanceof Error ? error.message : String(error);
      inner = `<div style="padding:16px;margin:8px;border:1px dashed #dc2626;color:#991b1b;font:13px sans-serif">Could not preview section "${instance.type}": ${message.replace(/</g, '&lt;')}</div>`;
    }
    return `<${tag} id="${id}" class="${cls}" data-sf-section="${attr}">${inner}</${tag}>`;
  }

  /**
   * One section of a page, for swapping into a preview already showing it.
   * Returns null when the section is not on that page (or is hidden), in which
   * case the caller should re-render the whole page.
   */
  async renderSectionInPage(data: ThemeData, template: string, ref: SectionRef): Promise<string | null> {
    const container = ref.scope === 'template' ? data.templates[ref.container] : data.groups[ref.container];
    if (ref.scope === 'template' && ref.container !== template) return null;
    const instance = container?.sections[ref.key];
    if (!container || !instance || instance.disabled) return null;
    const index = container.order.filter((key) => !container.sections[key]?.disabled).indexOf(ref.key);
    if (index < 0) return null;
    return this.renderSection(ref, instance, index, this.globalsFor(data, template));
  }

  private async renderContainer(scope: SectionRef['scope'], name: string, container: TemplateJson, globals: Record<string, unknown>) {
    const parts: string[] = [];
    let index = 0;
    for (const key of container.order) {
      const instance = container.sections[key];
      if (!instance || instance.disabled) continue;
      parts.push(await this.renderSection({ scope, container: name, key }, instance, index++, globals));
    }
    return parts.join('\n');
  }

  private async renderGroup(name: string, ctx: Context): Promise<string> {
    const globals = ctx.globals as Record<string, unknown>;
    const data = globals.__data as ThemeData;
    const group = data.groups[name];
    if (!group) return '';
    return `<!-- BEGIN sections: ${name} -->${await this.renderContainer('group', name, group, globals)}<!-- END sections: ${name} -->`;
  }

  /** The full preview document for one template. */
  async renderPage(data: ThemeData, template: string, options: RenderPageOptions = {}): Promise<string> {
    const json = data.templates[template];
    if (!json) throw new Error(`Unknown template: ${template}`);
    const globals = this.globalsFor(data, template);
    const content = await this.renderContainer('template', template, json, globals);

    const layoutName = json.layout === false ? null : (json.layout ?? (pageTypeOf(template) === 'password' ? 'password' : 'theme'));
    const html = layoutName
      ? await this.engine.render(this.parse(`layout/${layoutName}.liquid`), { content_for_layout: content }, { globals })
      : `<!doctype html><html><head></head><body>${content}</body></html>`;

    return this.finishDocument(html, globals, options);
  }

  private finishDocument(html: string, globals: Record<string, unknown>, options: RenderPageOptions) {
    // Assets are inlined: the iframe has an opaque origin and nothing to fetch them from.
    const scripts: string[] = [];
    html = html.replace(/<script\b[^>]*\bsrc="sf-asset:\/\/([^"]+)"[^>]*><\/script>/g, (_, name: string) => {
      const source = THEME_FILES[`assets/${name}`];
      if (source !== undefined) scripts.push(`<script>${source.replace(/<\/script/gi, '<\\/script')}</script>`);
      return '';
    });
    html = html.replace(/<link\b[^>]*\bhref="sf-asset:\/\/([^"]+)"[^>]*>/g, (_, name: string) => {
      const source = THEME_FILES[`assets/${name}`];
      return source === undefined ? '' : `<style data-asset="${name}">${source.replace(/<\/style/gi, '<\\/style')}</style>`;
    });
    html = html.split(ASSET_PREFIX).join('');

    const head =
      `<script>window.Shopify={designMode:true,routes:{root:'/'},shop:${JSON.stringify(SHOP.domain)},currency:{active:'USD',rate:'1.0'}};` +
      `window.__sfRestoreScroll=${Math.max(0, Math.round(options.scrollY ?? 0))};</script>` +
      String(globals.__fontLinks ?? '');
    const selected = options.selectedRef ? JSON.stringify(options.selectedRef) : 'null';
    const tail =
      scripts.join('') +
      `<script>${PREVIEW_BRIDGE}</script>` +
      `<script>(function(){var r=${selected};if(!r)return;var all=document.querySelectorAll('[data-sf-section]');for(var i=0;i<all.length;i++)if(all[i].getAttribute('data-sf-section')===r)all[i].classList.add('sf-selected');})();</script>`;

    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (tag) => `${tag}${head}`) : head + html;
    // Function replacements: theme.js may contain $& or $' sequences.
    html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => `${tail}</body>`) : html + tail;
    return html;
  }
}
