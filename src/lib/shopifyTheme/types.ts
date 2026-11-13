// Shapes of the Shopify theme files the editor reads and writes.
//
// A merchant's theme is the shipped base theme plus their edits to three kinds
// of JSON file: config/settings_data.json, templates/*.json and
// sections/*-group.json. The Liquid itself never changes, so those JSON files
// are all a theme project has to store.

export type SettingValue = string | number | boolean | null | Record<string, unknown> | unknown[];
export type SettingsMap = Record<string, SettingValue>;

export interface BlockInstance {
  type: string;
  disabled?: boolean;
  settings?: SettingsMap;
}

export interface SectionInstance {
  type: string;
  disabled?: boolean;
  settings?: SettingsMap;
  blocks?: Record<string, BlockInstance>;
  block_order?: string[];
}

export interface TemplateJson {
  layout?: string | false;
  wrapper?: string;
  sections: Record<string, SectionInstance>;
  order: string[];
}

export interface SectionGroupJson extends TemplateJson {
  type: string;
  name: string;
}

/** What a theme project stores: every editable JSON file, parsed. */
export interface ThemeData {
  version: 1;
  /** Base theme version the edits were made against. */
  baseVersion: string;
  /** settings_data.json "current", flattened to an object. */
  settings: SettingsMap;
  /** Keyed by template name without extension: "index", "product.offer". */
  templates: Record<string, TemplateJson>;
  /** Keyed by group file name without extension: "header-group". */
  groups: Record<string, SectionGroupJson>;
  /**
   * Last agreement with the store's copy of this theme, for two-way sync
   * (see storeSync.ts). Absent until the theme is installed on a store.
   */
  storeSync?: {
    themeId: string;
    base: Record<string, string>;
    checksums: Record<string, string | null>;
  };
}

// ---- Schema ---------------------------------------------------------------

export interface SettingOption {
  value: string;
  label: string;
}

export interface SettingDef {
  type: string;
  id?: string;
  label?: string;
  info?: string;
  content?: string;
  default?: SettingValue;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: SettingOption[];
  /** color_scheme_group only: the settings each scheme has. */
  definition?: SettingDef[];
}

export interface BlockDef {
  type: string;
  name: string;
  limit?: number;
  settings?: SettingDef[];
}

export interface SectionPreset {
  name: string;
  settings?: SettingsMap;
  blocks?: Array<{ type: string; settings?: SettingsMap }> | Record<string, { type: string; settings?: SettingsMap }>;
  block_order?: string[];
}

export interface SectionSchema {
  name: string;
  tag?: string;
  class?: string;
  limit?: number;
  max_blocks?: number;
  settings?: SettingDef[];
  blocks?: BlockDef[];
  presets?: SectionPreset[];
  enabled_on?: { templates?: string[]; groups?: string[] };
  disabled_on?: { templates?: string[]; groups?: string[] };
}

export interface ThemeSettingsGroup {
  name: string;
  settings?: SettingDef[];
  theme_name?: string;
  theme_version?: string;
}

/** Points at one section inside a template or a section group. */
export interface SectionRef {
  scope: 'template' | 'group';
  /** Template or group name. */
  container: string;
  key: string;
}

export type Selection =
  | { kind: 'theme-settings'; group?: string }
  | { kind: 'section'; ref: SectionRef }
  | { kind: 'block'; ref: SectionRef; blockKey: string };
