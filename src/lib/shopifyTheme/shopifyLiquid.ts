// A LiquidJS engine taught the Shopify-only tags and filters this theme uses,
// close enough to Shopify's output that the editor preview can be trusted for
// layout and copy. Anything storefront-only (forms posting, pagination, fonts
// from Shopify's CDN) is reduced to markup that looks right and does nothing.
import { Drop, Hash, Liquid, Tag, type Context, type Emitter, type Parser, type TagToken, type TopLevelToken } from 'liquidjs';
import { FontDrop, ImageDrop } from './drops';

/** Placeholder written by asset_url; the renderer swaps it for inline content. */
export const ASSET_PREFIX = 'sf-asset://';

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const attrs = (hash: Record<string, unknown>, skip: string[] = []) =>
  Object.entries(hash)
    .filter(([key, value]) => !skip.includes(key) && value !== undefined && value !== null && value !== false && value !== '')
    .map(([key, value]) => (value === true ? key : `${key}="${escapeHtml(value)}"`))
    .join(' ');

/** Hash args from a filter call. LiquidJS passes `key: value` pairs as [key, value] tuples. */
const hashArgs = (args: unknown[]): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const arg of args) {
    if (Array.isArray(arg) && arg.length === 2 && typeof arg[0] === 'string') out[arg[0]] = arg[1];
  }
  return out;
};

const formatMoney = (cents: unknown, format: string) => {
  const amount = Number(cents ?? 0) / 100;
  const withCommas = (n: string) => n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, kind: string) => {
    if (kind === 'amount_no_decimals') return withCommas(Math.round(amount).toString());
    if (kind === 'amount_with_comma_separator') return withCommas(amount.toFixed(2)).replace('.', ',');
    return withCommas(amount.toFixed(2));
  });
};

const lookup = (source: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), source);

const placeholderSvg = (name: string, className?: string) =>
  `<svg class="${escapeHtml(className ?? 'placeholder-svg')}" data-placeholder="${escapeHtml(name)}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 525 525" preserveAspectRatio="xMidYMid slice">` +
  `<rect width="525" height="525" fill="#e9e9e9"/><path d="M190 330l60-80 45 55 30-35 55 60z" fill="#c9c9c9"/><circle cx="330" cy="200" r="22" fill="#c9c9c9"/></svg>`;

export interface ShopifyLiquidOptions {
  /** Snippet sources keyed by name without extension. */
  snippets: Record<string, string>;
  /** locales/en.default.json, parsed. */
  locale: Record<string, unknown>;
  moneyFormat: string;
  moneyWithCurrencyFormat: string;
  /** Renders a section group for {% sections 'header-group' %}. */
  renderGroup: (name: string, ctx: Context) => Promise<string>;
}

export const createShopifyLiquid = (options: ShopifyLiquidOptions): Liquid => {
  const templates = Object.fromEntries(Object.entries(options.snippets).map(([name, src]) => [`${name}.liquid`, src]));

  const engine = new Liquid({
    templates,
    extname: '.liquid',
    cache: true,
    // Shopify ignores unknown filters and missing variables rather than failing.
    strictFilters: false,
    strictVariables: false,
    // Liquid truthiness: only nil and false are falsy, as on Shopify.
    jsTruthy: false,
  });

  // ---- Tags -----------------------------------------------------------------

  class SchemaTag extends Tag {
    constructor(token: TagToken, remain: TopLevelToken[], liquid: Liquid) {
      super(token, remain, liquid);
      while (remain.length) {
        const next = remain.shift() as TopLevelToken & { name?: string };
        if (next.name === 'endschema') return;
      }
      throw new Error('tag schema not closed');
    }
    render() {
      return '';
    }
  }
  engine.registerTag('schema', SchemaTag);

  // {% javascript %} and {% stylesheet %} bodies are bundled by Shopify; the
  // preview can inline them where they stand.
  const inlineBlock = (name: string, wrap: (body: string) => string) =>
    class extends Tag {
      private body: string[] = [];
      constructor(token: TagToken, remain: TopLevelToken[], liquid: Liquid) {
        super(token, remain, liquid);
        while (remain.length) {
          const next = remain.shift() as TopLevelToken & { name?: string };
          if (next.name === `end${name}`) return;
          this.body.push(next.getText());
        }
        throw new Error(`tag ${name} not closed`);
      }
      render() {
        return wrap(this.body.join(''));
      }
    };
  engine.registerTag('javascript', inlineBlock('javascript', (body) => `<script>${body}</script>`));
  engine.registerTag('stylesheet', inlineBlock('stylesheet', (body) => `<style>${body}</style>`));

  // Tags whose bodies are rendered Liquid, wrapped in some markup.
  abstract class WrappingTag extends Tag {
    protected templates: ReturnType<Parser['parseToken']>[] = [];
    constructor(token: TagToken, remain: TopLevelToken[], liquid: Liquid, parser: Parser, end: string) {
      super(token, remain, liquid);
      while (remain.length) {
        const next = remain.shift() as TopLevelToken & { name?: string };
        if (next.name === end) return;
        this.templates.push(parser.parseToken(next, remain));
      }
      throw new Error(`tag ${token.name} not closed`);
    }
    protected *renderBody(ctx: Context): Generator<unknown, string, unknown> {
      return (yield this.liquid.renderer.renderTemplates(this.templates, ctx)) as string;
    }
  }

  engine.registerTag(
    'style',
    class extends WrappingTag {
      constructor(token: TagToken, remain: TopLevelToken[], liquid: Liquid, parser: Parser) {
        super(token, remain, liquid, parser, 'endstyle');
      }
      *render(ctx: Context, emitter: Emitter) {
        const body = yield* this.renderBody(ctx);
        emitter.write(`<style data-shopify>${body}</style>`);
      }
    },
  );

  const FORM_ACTIONS: Record<string, string> = {
    product: '/cart/add',
    cart: '/cart',
    contact: '/contact#contact_form',
    customer: '/contact#newsletter',
    customer_login: '/account/login',
    create_customer: '/account',
    recover_customer_password: '/account/recover',
    reset_customer_password: '/account/reset',
    activate_customer_password: '/account/activate',
    customer_address: '/account/addresses',
    storefront_password: '/password',
    localization: '/localization',
    new_comment: '/blogs/comments',
  };

  engine.registerTag(
    'form',
    class extends WrappingTag {
      private formType: string;
      private hash: Hash | null = null;
      constructor(token: TagToken, remain: TopLevelToken[], liquid: Liquid, parser: Parser) {
        super(token, remain, liquid, parser, 'endform');
        // {% form 'product', product, id: 'x', class: 'y' %}
        const parts = token.args.match(/^\s*(['"])([\w-]+)\1\s*(?:,\s*([\w.[\]'"-]+)\s*(?=,|$))?\s*,?\s*([\s\S]*)$/);
        this.formType = parts?.[2] ?? 'form';
        const rest = parts?.[4]?.trim();
        if (rest) {
          try {
            this.hash = new Hash(rest);
          } catch {
            this.hash = null;
          }
        }
      }
      *render(ctx: Context, emitter: Emitter) {
        const hash = (this.hash ? yield this.hash.render(ctx) : {}) as Record<string, unknown>;
        ctx.push({
          form: {
            errors: null,
            'posted_successfully?': false,
            email: '',
            first_name: '',
            last_name: '',
            body: '',
            id: hash.id ?? null,
          },
        });
        const body = yield* this.renderBody(ctx);
        ctx.pop();
        const action = FORM_ACTIONS[this.formType] ?? '#';
        emitter.write(
          `<form method="post" action="${action}" accept-charset="UTF-8" ${attrs(hash, ['return_to'])}>` +
            `<input type="hidden" name="form_type" value="${escapeHtml(this.formType)}"><input type="hidden" name="utf8" value="✓">` +
            body +
            '</form>',
        );
      }
    },
  );

  engine.registerTag(
    'paginate',
    class extends WrappingTag {
      private size: string;
      constructor(token: TagToken, remain: TopLevelToken[], liquid: Liquid, parser: Parser) {
        super(token, remain, liquid, parser, 'endpaginate');
        this.size = token.args.match(/\bby\s+(\S+)/)?.[1] ?? '50';
      }
      *render(ctx: Context, emitter: Emitter) {
        const size = Number(this.size) || 50;
        ctx.push({
          paginate: { current_page: 1, current_offset: 0, pages: 1, items: size, page_size: size, parts: [], previous: null, next: null },
        });
        const body = yield* this.renderBody(ctx);
        ctx.pop();
        emitter.write(body);
      }
    },
  );

  engine.registerTag(
    'sections',
    class extends Tag {
      private group: string;
      constructor(token: TagToken, remain: TopLevelToken[], liquid: Liquid) {
        super(token, remain, liquid);
        this.group = token.args.trim().replace(/^['"]|['"]$/g, '');
      }
      *render(ctx: Context, emitter: Emitter) {
        emitter.write((yield options.renderGroup(this.group, ctx)) as string);
      }
    },
  );

  // ---- Filters ----------------------------------------------------------------

  engine.registerFilter('t', (key: unknown, ...args: unknown[]) => {
    const vars = hashArgs(args);
    let value = lookup(options.locale, String(key));
    if (value && typeof value === 'object' && 'count' in vars) {
      const forms = value as Record<string, string>;
      value = Number(vars.count) === 1 ? (forms.one ?? forms.other) : (forms.other ?? forms.one);
    }
    if (typeof value !== 'string') return `Translation missing: en.${String(key)}`;
    return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => String(vars[name] ?? ''));
  });

  engine.registerFilter('money', (cents: unknown) => formatMoney(cents, options.moneyFormat));
  engine.registerFilter('money_with_currency', (cents: unknown) => formatMoney(cents, options.moneyWithCurrencyFormat));
  engine.registerFilter('money_without_currency', (cents: unknown) => formatMoney(cents, '{{amount}}'));
  engine.registerFilter('money_without_trailing_zeros', (cents: unknown) =>
    formatMoney(cents, options.moneyFormat).replace(/\.00(?!\d)/, ''),
  );

  engine.registerFilter('asset_url', (name: unknown) => `${ASSET_PREFIX}${String(name)}`);
  engine.registerFilter('stylesheet_tag', (url: unknown) => `<link rel="stylesheet" href="${escapeHtml(url)}" media="all">`);
  engine.registerFilter('script_tag', (url: unknown) => `<script src="${escapeHtml(url)}"></script>`);

  const imageSrc = (input: unknown): string => {
    if (input instanceof ImageDrop) return input.src;
    if (input && typeof input === 'object' && 'src' in input) return String((input as { src: unknown }).src);
    if (input && typeof input === 'object' && 'preview_image' in input) return imageSrc((input as { preview_image: unknown }).preview_image);
    return input == null ? '' : String(input);
  };
  engine.registerFilter('image_url', (input: unknown) => imageSrc(input));
  engine.registerFilter('img_url', (input: unknown) => imageSrc(input));
  engine.registerFilter('image_tag', (src: unknown, ...args: unknown[]) => {
    const hash = hashArgs(args);
    if (!src) return '';
    return `<img src="${escapeHtml(src)}" ${attrs({ alt: hash.alt ?? '', loading: hash.loading ?? 'lazy', ...hash }, ['widths', 'preload', 'srcset', 'alt'])} alt="${escapeHtml(hash.alt ?? '')}">`;
  });
  engine.registerFilter('placeholder_svg_tag', (name: unknown, className?: unknown) => placeholderSvg(String(name), className ? String(className) : undefined));

  engine.registerFilter('video_tag', () => placeholderSvg('video', 'placeholder-svg placeholder-video'));
  engine.registerFilter('external_video_tag', () => placeholderSvg('video', 'placeholder-svg placeholder-video'));
  engine.registerFilter('external_video_url', () => '');
  engine.registerFilter('media_tag', () => placeholderSvg('media'));

  engine.registerFilter('font_face', () => '');
  engine.registerFilter('font_url', () => '');
  engine.registerFilter('font_modify', (font: unknown, prop: unknown, value: unknown) =>
    font instanceof FontDrop ? font.withVariant(String(prop), String(value)) : font,
  );

  engine.registerFilter('default_errors', () => '');
  engine.registerFilter('payment_terms', () => '');
  engine.registerFilter('payment_type_svg_tag', (type: unknown, ...args: unknown[]) => {
    const hash = hashArgs(args);
    const label = String(type).replace(/_/g, ' ');
    return (
      `<svg class="${escapeHtml(hash.class ?? 'icon icon--full-color')}" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(label)}">` +
      `<rect width="38" height="24" rx="3" fill="#fff" stroke="#d9d9d9"/><text x="19" y="15" text-anchor="middle" font-size="6" font-family="sans-serif" fill="#333">${escapeHtml(label.slice(0, 8))}</text></svg>`
    );
  });
  engine.registerFilter('format_address', (address: unknown) => {
    if (!address || typeof address !== 'object') return '';
    const a = address as Record<string, unknown>;
    return [a.name, a.address1, a.city, a.country].filter(Boolean).map(escapeHtml).join('<br>');
  });
  engine.registerFilter('handleize', (value: unknown) =>
    String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  );
  engine.registerFilter('handle', (value: unknown) =>
    String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  );
  engine.registerFilter('link_to', (text: unknown, url: unknown) => `<a href="${escapeHtml(url)}">${String(text ?? '')}</a>`);
  engine.registerFilter('within', (url: unknown) => url);
  engine.registerFilter('structured_data', () => '');

  return engine;
};

/** A Drop that prints as a handle, so `collections[setting]` finds it. */
export class HandleDrop extends Drop {
  constructor(private readonly handleValue: string) {
    super();
  }
  valueOf() {
    return this.handleValue;
  }
  toString() {
    return this.handleValue;
  }
}

export const withHandle = <T extends object>(handle: string, fields: T): HandleDrop & T =>
  Object.assign(new HandleDrop(handle), fields);
