// The shipped base theme, bundled into the theme editor's chunk as text.
//
// Everything in shopify-theme/base is text today (Liquid, JSON, CSS, JS). A
// binary asset would be corrupted by ?raw, so themeSource.test.ts fails if one
// appears and the loader below has to learn to fetch it by URL instead.
import type { SectionGroupJson, SectionSchema, SettingsMap, TemplateJson, ThemeData, ThemeSettingsGroup } from './types';

const raw = import.meta.glob('/shopify-theme/base/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const PREFIX = '/shopify-theme/base/';

/** Every theme file, keyed by its path inside the theme ("sections/hero.liquid"). */
export const THEME_FILES: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(raw)
      .map(([path, text]) => [path.slice(PREFIX.length), text] as const)
      // Dev-only dotfiles (.theme-check.yml) never ship.
      .filter(([rel]) => !rel.split('/').some((part) => part.startsWith('.')))
      .sort(([a], [b]) => a.localeCompare(b)),
  ),
);

export const SCHEMA_PATTERN = /\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/;

const parseJson = <T>(path: string): T => JSON.parse(THEME_FILES[path]) as T;

export const THEME_SETTINGS_SCHEMA: ThemeSettingsGroup[] = parseJson('config/settings_schema.json');

const themeInfo = THEME_SETTINGS_SCHEMA.find((group) => group.name === 'theme_info');
export const THEME_NAME = String(themeInfo?.theme_name ?? 'Shopiflow');
export const THEME_VERSION = String(themeInfo?.theme_version ?? '0.0.0');

/** Section schemas keyed by section type ("hero"). */
export const SECTION_SCHEMAS: Readonly<Record<string, SectionSchema>> = Object.fromEntries(
  Object.entries(THEME_FILES)
    .filter(([rel]) => rel.startsWith('sections/') && rel.endsWith('.liquid'))
    .map(([rel, text]) => {
      const type = rel.slice('sections/'.length, -'.liquid'.length);
      const match = text.match(SCHEMA_PATTERN);
      const schema: SectionSchema = match ? JSON.parse(match[1]) : { name: type };
      return [type, schema] as const;
    }),
);

export const isJsonTemplatePath = (rel: string) => /^templates\/[^/]+\.json$/.test(rel);
export const isSectionGroupPath = (rel: string) => /^sections\/[^/]+\.json$/.test(rel);

/** The theme as shipped, which every new project starts from. */
export const baseThemeData = (): ThemeData => {
  const settingsData = parseJson<{ current: string | SettingsMap; presets?: Record<string, SettingsMap> }>(
    'config/settings_data.json',
  );
  const current =
    typeof settingsData.current === 'string'
      ? settingsData.presets?.[settingsData.current] ?? {}
      : settingsData.current;

  const templates: Record<string, TemplateJson> = {};
  const groups: Record<string, SectionGroupJson> = {};
  for (const rel of Object.keys(THEME_FILES)) {
    if (isJsonTemplatePath(rel)) {
      templates[rel.slice('templates/'.length, -'.json'.length)] = parseJson(rel);
    } else if (isSectionGroupPath(rel)) {
      groups[rel.slice('sections/'.length, -'.json'.length)] = parseJson(rel);
    }
  }

  return {
    version: 1,
    baseVersion: THEME_VERSION,
    settings: structuredClone(current),
    templates,
    groups,
  };
};
