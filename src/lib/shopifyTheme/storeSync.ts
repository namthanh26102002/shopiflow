// Two-way sync between a theme project and the theme installed on the
// merchant's store. Pure functions; ShopifySyncContext runs them on a timer.
//
// Only the JSON a merchant edits is synced (settings_data, JSON templates,
// section groups). Each file is compared three ways, against the version both
// sides last agreed on (the "base"):
//
//   changed in Shopify only     → take Shopify's version
//   changed here only           → send ours to Shopify
//   changed on both, differently → conflict: the merchant chooses
//
// Comparisons use a canonical form, because Shopify rewrites these files when
// its editor saves them (a comment header, its own key order and spacing).
import { buildThemeFiles } from './exportZip';
import { THEME_FILES } from './themeSource';
import type { SectionGroupJson, SettingsMap, TemplateJson, ThemeData } from './types';

export const isSyncableFile = (filename: string) =>
  filename === 'config/settings_data.json' ||
  /^templates\/[a-z0-9_.-]+\.json$/i.test(filename) ||
  /^sections\/[a-z0-9_-]+\.json$/i.test(filename);

/** Shopify prefixes editor-saved JSON with a block comment; JSON.parse cannot read it. */
export const stripJsonComments = (content: string) =>
  (content.charCodeAt(0) === 0xfeff ? content.slice(1) : content).replace(/^\s*(\/\*[\s\S]*?\*\/\s*)+/, '');

export const parseThemeJson = (content: string): unknown => JSON.parse(stripJsonComments(content));

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
};

/** Same data → same string, whoever wrote the file. Unparseable files compare as text. */
export const canonical = (content: string): string => {
  try {
    return JSON.stringify(sortKeys(parseThemeJson(content)));
  } catch {
    return content.trim();
  }
};

/** The project's syncable files, as they would be written to the store. */
export const localSyncFiles = (data: ThemeData): Record<string, string> =>
  Object.fromEntries(Object.entries(buildThemeFiles(data)).filter(([name]) => isSyncableFile(name)));

export interface RemoteFile {
  content: string;
  checksum: string | null;
}

/** What the project remembers about its last agreement with the store. */
export interface StoreSyncState {
  /** The Shopify theme this state belongs to (gid). */
  themeId: string;
  /** Canonical content of each file at the last agreement. */
  base: Record<string, string>;
  /** Shopify's checksumMd5 at the last agreement, sent back to detect races. */
  checksums: Record<string, string | null>;
}

export interface SyncPlan {
  /** Shopify's version to take into the editor. */
  pull: Record<string, string>;
  /** Our version to send to Shopify. */
  push: Record<string, string>;
  /** Changed on both sides, differently. */
  conflicts: string[];
  /** The new agreement once pull and push have both happened. */
  nextBase: Record<string, string>;
}

export const planSync = (
  local: Record<string, string>,
  remote: Record<string, RemoteFile>,
  base: Record<string, string>,
): SyncPlan => {
  const plan: SyncPlan = { pull: {}, push: {}, conflicts: [], nextBase: { ...base } };
  const names = new Set([...Object.keys(local), ...Object.keys(remote)]);

  for (const name of [...names].sort()) {
    const ours = name in local ? canonical(local[name]) : undefined;
    const theirs = name in remote ? canonical(remote[name].content) : undefined;
    const agreed = base[name];

    if (ours === theirs) {
      if (ours !== undefined) plan.nextBase[name] = ours;
      continue;
    }
    // A file only Shopify has (a template made in its editor): take it.
    if (ours === undefined) {
      if (theirs !== undefined && theirs !== agreed) {
        plan.pull[name] = remote[name].content;
        plan.nextBase[name] = theirs;
      }
      continue;
    }
    // A file only we have: send it. (Deleting in Shopify is not synced back.)
    if (theirs === undefined) {
      plan.push[name] = local[name];
      plan.nextBase[name] = ours;
      continue;
    }

    const changedHere = ours !== agreed;
    const changedThere = theirs !== agreed;
    if (changedThere && !changedHere) {
      plan.pull[name] = remote[name].content;
      plan.nextBase[name] = theirs;
    } else if (changedHere && !changedThere) {
      plan.push[name] = local[name];
      plan.nextBase[name] = ours;
    } else {
      // Both changed (or there is no agreement yet to tell who did).
      plan.conflicts.push(name);
    }
  }
  return plan;
};

const basePresets = () => {
  try {
    return (JSON.parse(THEME_FILES['config/settings_data.json'] ?? '{}') as { presets?: Record<string, SettingsMap> }).presets ?? {};
  } catch {
    return {};
  }
};

/** Writes Shopify's versions of files into the project. Unreadable files are skipped and returned. */
export const applyRemoteFiles = (data: ThemeData, files: Record<string, string>): { data: ThemeData; skipped: string[] } => {
  const next = structuredClone(data);
  const skipped: string[] = [];
  for (const [name, content] of Object.entries(files)) {
    let parsed: unknown;
    try {
      parsed = parseThemeJson(content);
    } catch {
      skipped.push(name);
      continue;
    }
    if (!parsed || typeof parsed !== 'object') {
      skipped.push(name);
      continue;
    }
    if (name === 'config/settings_data.json') {
      const settingsData = parsed as { current?: string | SettingsMap; presets?: Record<string, SettingsMap> };
      const current =
        typeof settingsData.current === 'string'
          ? (settingsData.presets ?? basePresets())[settingsData.current]
          : settingsData.current;
      if (current && typeof current === 'object') next.settings = current;
      else skipped.push(name);
    } else if (name.startsWith('templates/')) {
      next.templates[name.slice('templates/'.length, -'.json'.length)] = parsed as TemplateJson;
    } else if (name.startsWith('sections/')) {
      next.groups[name.slice('sections/'.length, -'.json'.length)] = parsed as SectionGroupJson;
    }
  }
  return { data: next, skipped };
};

/** Sections Shopify apps add have types like "shopify://apps/reviews/blocks/stars/123". */
export const isAppType = (type: string) => type.startsWith('shopify://apps/') || type === '@app';
