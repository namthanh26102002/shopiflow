// Liquid objects for setting values Shopify hands to a theme as objects rather
// than strings: colors, color schemes, fonts and images. Each prints the way
// Shopify's would ({{ color }} is the hex, {{ scheme }} the scheme id).
import { Drop } from 'liquidjs';

export class ColorDrop extends Drop {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  private hex: string;

  constructor(value: string) {
    super();
    const rgb = parseColor(value);
    this.red = rgb.r;
    this.green = rgb.g;
    this.blue = rgb.b;
    this.alpha = rgb.a;
    this.hex = value;
  }

  valueOf() {
    return this.hex;
  }

  toString() {
    return this.hex;
  }
}

export const parseColor = (value: string): { r: number; g: number; b: number; a: number } => {
  const hex = value.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3,4}$/i.test(hex)) {
    const [r, g, b, a = 'f'] = hex.split('');
    return { r: parseInt(r + r, 16), g: parseInt(g + g, 16), b: parseInt(b + b, 16), a: parseInt(a + a, 16) / 255 };
  }
  if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
    };
  }
  const rgba = value.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?/i);
  if (rgba) return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] === undefined ? 1 : +rgba[4] };
  return { r: 0, g: 0, b: 0, a: 1 };
};

export class ColorSchemeDrop extends Drop {
  id: string;
  settings: Record<string, unknown>;

  constructor(id: string, settings: Record<string, unknown>) {
    super();
    this.id = id;
    this.settings = settings;
  }

  valueOf() {
    return this.id;
  }

  toString() {
    return this.id;
  }
}

// Shopify's own fonts that are not on Google Fonts; the preview uses the
// stack Shopify would fall back to.
const SYSTEM_FONTS: Record<string, string> = {
  helvetica: 'Helvetica, Arial, sans-serif',
  arial: 'Arial, sans-serif',
  georgia: 'Georgia, serif',
  times_new_roman: '"Times New Roman", serif',
  courier_new: '"Courier New", monospace',
  monospace: 'monospace',
  sans_serif: 'sans-serif',
  serif: 'serif',
};

const SERIF_HINTS = /(serif|garamond|baskerville|playfair|lora|merriweather|crimson|cormorant|bodoni|caslon|domine|bitter|besley)/;

export class FontDrop extends Drop {
  family: string;
  fallback_families: string;
  weight: number;
  style: string;
  'system?': boolean;
  /** Font handle without the variant suffix: "playfair_display". */
  base: string;

  constructor(handle: string) {
    super();
    const match = handle.match(/^(.*)_([ni])(\d)$/);
    this.base = match ? match[1] : handle;
    this.style = match?.[2] === 'i' ? 'italic' : 'normal';
    this.weight = match ? Number(match[3]) * 100 : 400;
    const system = SYSTEM_FONTS[this.base];
    this['system?'] = !!system;
    this.family = system
      ? system.split(',')[0]
      : this.base
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
    this.fallback_families = system ? system.split(',').slice(1).join(',').trim() || 'sans-serif' : SERIF_HINTS.test(this.base) ? 'serif' : 'sans-serif';
  }

  get handle() {
    return `${this.base}_${this.style === 'italic' ? 'i' : 'n'}${Math.round(this.weight / 100)}`;
  }

  withVariant(prop: string, value: string): FontDrop {
    let weight = this.weight;
    let style = this.style;
    if (prop === 'weight') {
      if (value === 'bold' || value === 'bolder') weight = Math.min(900, Math.max(700, weight + 300));
      else if (value === 'lighter') weight = Math.max(100, weight - 300);
      else if (value === 'normal') weight = 400;
      else if (/^[+-]\d+$/.test(value)) weight = Math.min(900, Math.max(100, weight + Number(value)));
      else if (/^\d+$/.test(value)) weight = Number(value);
    } else if (prop === 'style') {
      style = value === 'italic' || value === 'oblique' ? 'italic' : 'normal';
    }
    return new FontDrop(`${this.base}_${style === 'italic' ? 'i' : 'n'}${Math.round(weight / 100)}`);
  }

  valueOf() {
    return this.family;
  }

  toString() {
    return this.family;
  }
}

export class ImageDrop extends Drop {
  src: string;
  alt: string;
  width: number;
  height: number;
  aspect_ratio: number;
  id: number;
  media_type = 'image';
  preview_image: ImageDrop;
  position = 1;

  constructor(src: string, alt: string, width: number, height: number, id = 0) {
    super();
    this.src = src;
    this.alt = alt;
    this.width = width;
    this.height = height;
    this.aspect_ratio = width / height;
    this.id = id;
    this.preview_image = this;
  }

  valueOf() {
    return this.src;
  }

  toString() {
    return this.src;
  }
}
