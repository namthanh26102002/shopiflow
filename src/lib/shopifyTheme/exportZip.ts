// Builds the uploadable theme ZIP for a project: the shipped base theme with
// the merchant's settings, templates and section groups written over it.
//
// validateThemeFiles runs the same checks as shopify-theme/scripts/zip.mjs, so
// a ZIP this produces is one Shopify will accept. Keep the two in step.
import { zipSync, strToU8 } from 'fflate';
import { SCHEMA_PATTERN, THEME_FILES, THEME_NAME, THEME_VERSION } from './themeSource';
import type { SectionSchema, ThemeData } from './types';

/** Shopify rejects a theme ZIP over 50 MB. */
export const MAX_ZIP_BYTES = 50 * 1024 * 1024;

const REQUIRED = ['layout/theme.liquid', 'config/settings_schema.json'];

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** Every file of the merchant's theme, as text, keyed by path inside the theme. */
export const buildThemeFiles = (data: ThemeData): Record<string, string> => {
  const files: Record<string, string> = { ...THEME_FILES };

  const base = JSON.parse(THEME_FILES['config/settings_data.json'] ?? '{}') as { presets?: unknown };
  files['config/settings_data.json'] = json({ current: data.settings, presets: base.presets ?? {} });

  for (const [name, template] of Object.entries(data.templates)) files[`templates/${name}.json`] = json(template);
  for (const [name, group] of Object.entries(data.groups)) files[`sections/${name}.json`] = json(group);

  return files;
};

export const validateThemeFiles = (files: Record<string, string>): string[] => {
  const problems: string[] = [];
  for (const name of REQUIRED) if (!(name in files)) problems.push(`missing required file: ${name}`);

  const schemas = new Map<string, SectionSchema | null>();
  for (const [rel, text] of Object.entries(files)) {
    const match = rel.match(/^sections\/([^/]+)\.(liquid|json)$/);
    if (!match) continue;
    if (match[2] === 'json') {
      if (!schemas.has(match[1])) schemas.set(match[1], null);
      continue;
    }
    const schema = text.match(SCHEMA_PATTERN);
    try {
      schemas.set(match[1], schema ? (JSON.parse(schema[1]) as SectionSchema) : null);
    } catch (error) {
      problems.push(`invalid schema JSON in ${rel}: ${(error as Error).message}`);
    }
  }

  for (const [rel, text] of Object.entries(files)) {
    if (!rel.endsWith('.json')) continue;
    let parsed: { sections?: Record<string, { type?: string; blocks?: Record<string, { type?: string }> }>; order?: string[] };
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      problems.push(`invalid JSON in ${rel}: ${(error as Error).message}`);
      continue;
    }
    if (!rel.startsWith('templates/') && !/^sections\/[^/]+\.json$/.test(rel)) continue;

    for (const [key, section] of Object.entries(parsed.sections ?? {})) {
      if (!section?.type) continue;
      // Sections added by Shopify apps (pulled from the store) live in the app, not the theme.
      if (section.type.startsWith('shopify://apps/')) continue;
      if (!schemas.has(section.type)) {
        problems.push(`${rel} references unknown section "${section.type}"`);
        continue;
      }
      const allowed = new Set((schemas.get(section.type)?.blocks ?? []).map((block) => block.type));
      for (const block of Object.values(section.blocks ?? {})) {
        if (block?.type?.startsWith('shopify://apps/')) continue;
        if (block?.type && !allowed.has(block.type) && !allowed.has('@app') && !allowed.has('@theme')) {
          problems.push(`${rel}: section "${key}" has a block of unknown type "${block.type}"`);
        }
      }
    }
    for (const key of parsed.order ?? []) {
      if (!parsed.sections?.[key]) problems.push(`${rel}: order lists "${key}" but no such section exists`);
    }
  }
  return problems;
};

export const zipFileName = (title: string) => {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme';
  return `${THEME_NAME.toLowerCase()}-${slug}-${THEME_VERSION}.zip`;
};

export type ExportResult =
  | { ok: true; bytes: Uint8Array; fileName: string }
  | { ok: false; problems: string[] };

export const exportThemeZip = (data: ThemeData, title: string): ExportResult => {
  const files = buildThemeFiles(data);
  const problems = validateThemeFiles(files);
  if (problems.length > 0) return { ok: false, problems };

  const bytes = zipSync(
    Object.fromEntries(Object.entries(files).map(([rel, text]) => [rel, strToU8(text)])),
    { level: 9 },
  );
  if (bytes.byteLength > MAX_ZIP_BYTES) {
    return { ok: false, problems: [`zip is ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB, over Shopify's 50 MB limit`] };
  }
  return { ok: true, bytes, fileName: zipFileName(title) };
};
