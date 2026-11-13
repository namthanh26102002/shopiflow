// One input for one Shopify setting, chosen by the setting's schema type.
//
// Settings that point at things only the merchant's store has (images,
// videos, real products) cannot be filled in meaningfully here yet: images
// must live in the store's Files to be valid in settings_data.json. Those
// show a note instead of an input that would produce an invalid theme.
import React, { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { SettingDef } from '@/lib/shopifyTheme/types';
import { COLLECTIONS, LINKLISTS, PRODUCTS } from '@/lib/shopifyTheme/fixtures';
import { ThemeRichText } from './ThemeRichText';
import { cn } from '@/lib/utils';

/**
 * Fonts offered by the picker. Values are Shopify font-library handles, which
 * is what settings_data.json must hold; the preview loads the same family from
 * Google Fonts. Keep to families in both libraries.
 */
export const FONT_CHOICES: Array<{ value: string; label: string }> = [
  { value: 'assistant_n4', label: 'Assistant' },
  { value: 'inter_n4', label: 'Inter' },
  { value: 'dm_sans_n4', label: 'DM Sans' },
  { value: 'poppins_n4', label: 'Poppins' },
  { value: 'montserrat_n4', label: 'Montserrat' },
  { value: 'lato_n4', label: 'Lato' },
  { value: 'work_sans_n4', label: 'Work Sans' },
  { value: 'karla_n4', label: 'Karla' },
  { value: 'rubik_n4', label: 'Rubik' },
  { value: 'nunito_sans_n4', label: 'Nunito Sans' },
  { value: 'josefin_sans_n4', label: 'Josefin Sans' },
  { value: 'raleway_n4', label: 'Raleway' },
  { value: 'jost_n4', label: 'Jost' },
  { value: 'archivo_n4', label: 'Archivo' },
  { value: 'figtree_n4', label: 'Figtree' },
  { value: 'playfair_display_n4', label: 'Playfair Display' },
  { value: 'lora_n4', label: 'Lora' },
  { value: 'libre_baskerville_n4', label: 'Libre Baskerville' },
  { value: 'cormorant_n4', label: 'Cormorant' },
  { value: 'crimson_text_n4', label: 'Crimson Text' },
];

const titleCase = (handle: string) =>
  handle
    .replace(/_[ni]\d$/, '')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export interface SchemeChoice {
  id: string;
  background: string;
  text: string;
  label: string;
}

interface SettingFieldProps {
  def: SettingDef;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Scheme ids and colors, for color_scheme pickers. */
  schemes?: SchemeChoice[];
  /** Path used for element ids, unique within the panel. */
  idPrefix: string;
}

/** Text inputs keep their own state so the preview re-renders on pause, not per key. */
const useDraft = (value: string, onCommit: (value: string) => void) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return {
    value: draft,
    onChange: (next: string) => {
      setDraft(next);
      onCommit(next);
    },
    /** Update the field without committing (for half-typed values). */
    setDraft,
  };
};

const HelpText: React.FC<{ info?: string }> = ({ info }) =>
  info ? <p className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: info.replace(/<(?!\/?(a|b|strong|em|i)\b)[^>]*>/g, '') }} /> : null;

export const SettingField: React.FC<SettingFieldProps> = ({ def, value, onChange, schemes = [], idPrefix }) => {
  const id = `${idPrefix}-${def.id ?? def.type}`;
  const label = def.label ?? def.id ?? '';
  const stringValue = value === null || value === undefined ? '' : String(value);
  const text = useDraft(stringValue, (next) => onChange(next));

  if (def.type === 'header') {
    return <h4 className="pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{def.content}</h4>;
  }
  if (def.type === 'paragraph') {
    return <HelpText info={def.content} />;
  }

  const field = (control: React.ReactNode, inlineLabel = false) => (
    <div className={cn('space-y-1.5', inlineLabel && 'flex items-center justify-between gap-3 space-y-0')}>
      <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
      {control}
      {!inlineLabel && <HelpText info={def.info} />}
    </div>
  );

  switch (def.type) {
    case 'text':
    case 'url':
      return field(
        <Input id={id} value={text.value} placeholder={def.placeholder ?? (def.type === 'url' ? '/collections/all' : undefined)} onChange={(e) => text.onChange(e.target.value)} className="h-8 text-sm" />,
      );

    case 'textarea':
    case 'html':
    case 'liquid':
      return field(
        <Textarea
          id={id}
          value={text.value}
          rows={def.type === 'textarea' ? 3 : 6}
          placeholder={def.placeholder}
          onChange={(e) => text.onChange(e.target.value)}
          className={cn('text-sm', def.type !== 'textarea' && 'font-mono text-xs')}
        />,
      );

    case 'richtext':
    case 'inline_richtext':
      return field(<ThemeRichText id={id} value={stringValue} inline={def.type === 'inline_richtext'} onChange={onChange} />);

    case 'number':
      return field(
        <Input
          id={id}
          type="number"
          value={text.value}
          onChange={(e) => {
            const next = e.target.value;
            text.setDraft(next);
            if (next !== '' && Number.isFinite(Number(next))) onChange(Number(next));
            else if (next === '') onChange(null);
          }}
          className="h-8 text-sm"
        />,
      );

    case 'range': {
      const min = def.min ?? 0;
      const max = def.max ?? 100;
      const numeric = typeof value === 'number' ? value : Number(value ?? def.default ?? min);
      return field(
        <div className="flex items-center gap-3">
          <Slider id={id} min={min} max={max} step={def.step ?? 1} value={[numeric]} onValueChange={([next]) => onChange(next)} className="flex-1" />
          <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">
            {numeric}
            {def.unit ?? ''}
          </span>
        </div>,
      );
    }

    case 'checkbox':
      return field(<Switch id={id} checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} />, true);

    case 'select':
    case 'radio': {
      const options = def.options ?? [];
      if (options.length <= 3 && options.every((o) => o.label.length <= 12)) {
        return field(
          <ToggleGroup
            id={id}
            type="single"
            value={stringValue}
            onValueChange={(next) => next && onChange(next)}
            className="grid w-full gap-1"
            style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
          >
            {options.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} className="h-8 border border-input text-xs data-[state=on]:border-primary">
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>,
        );
      }
      return field(
        <Select value={stringValue} onValueChange={onChange}>
          <SelectTrigger id={id} className="h-8 text-sm">
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      );
    }

    case 'color':
      return field(
        <div className="flex items-center gap-2">
          <input
            id={id}
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(stringValue) ? stringValue : '#000000'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="h-8 w-10 cursor-pointer rounded border border-input bg-background p-0.5"
          />
          <Input
            aria-label={`${label} hex value`}
            value={text.value}
            onChange={(e) => {
              // Commit only complete colors; "#12" would render as black.
              const next = e.target.value.trim();
              const hex = next.startsWith('#') ? next : `#${next}`;
              if (/^#[0-9a-f]{6}$/i.test(hex)) text.onChange(hex.toUpperCase());
              else text.setDraft(next);
            }}
            onBlur={() => text.setDraft(stringValue)}
            className="h-8 font-mono text-xs uppercase"
          />
        </div>,
      );

    case 'color_background':
      return field(
        <Input id={id} value={text.value} placeholder="linear-gradient(...)" onChange={(e) => text.onChange(e.target.value)} className="h-8 font-mono text-xs" />,
      );

    case 'color_scheme':
      return field(
        <div id={id} role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1.5">
          {schemes.map((scheme) => (
            <button
              key={scheme.id}
              type="button"
              role="radio"
              aria-checked={stringValue === scheme.id}
              title={scheme.label}
              onClick={() => onChange(scheme.id)}
              className={cn(
                'flex h-10 items-center justify-center rounded-md border text-sm font-semibold',
                stringValue === scheme.id ? 'border-primary ring-2 ring-primary/40' : 'border-border',
              )}
              style={{ background: scheme.background, color: scheme.text }}
            >
              Aa
            </button>
          ))}
        </div>,
      );

    case 'font_picker': {
      const known = FONT_CHOICES.some((font) => font.value === stringValue);
      const choices = known || !stringValue ? FONT_CHOICES : [{ value: stringValue, label: titleCase(stringValue) }, ...FONT_CHOICES];
      return field(
        <Select value={stringValue} onValueChange={onChange}>
          <SelectTrigger id={id} className="h-8 text-sm">
            <SelectValue placeholder="Choose a font" />
          </SelectTrigger>
          <SelectContent>
            {choices.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      );
    }

    case 'product':
    case 'collection':
    case 'link_list': {
      const suggestions =
        def.type === 'product'
          ? PRODUCTS.map((p) => p.handle)
          : def.type === 'collection'
            ? COLLECTIONS.map((c) => c.handle)
            : Object.keys(LINKLISTS);
      const noun = def.type === 'link_list' ? 'menu' : def.type;
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
          <Input id={id} list={`${id}-options`} value={text.value} placeholder={`${noun}-handle`} onChange={(e) => text.onChange(e.target.value.trim())} className="h-8 font-mono text-xs" />
          <datalist id={`${id}-options`}>
            {suggestions.map((handle) => (
              <option key={handle} value={handle} />
            ))}
          </datalist>
          <p className="text-xs text-muted-foreground">
            The {noun}'s handle in your Shopify admin. The preview shows a sample {noun}.
          </p>
        </div>
      );
    }

    case 'image_picker':
    case 'video':
    case 'video_url':
    case 'product_list':
    case 'collection_list':
    case 'page':
    case 'blog':
    case 'article':
    case 'metaobject':
    case 'metaobject_list':
    default:
      return (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{label}</Label>
          <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
            <ImageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {def.type === 'image_picker' || def.type.startsWith('video')
                ? "Add this in Shopify's theme editor after you upload the theme. It uses files from your store."
                : "Set this in Shopify's theme editor after you upload the theme. It uses content from your store."}
            </span>
          </div>
        </div>
      );
  }
};
