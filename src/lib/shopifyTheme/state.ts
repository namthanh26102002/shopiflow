// Pure edits on a ThemeData. Each returns a new object and never mutates its
// input, so React state and the undo-free autosave can treat them as values.
import type {
  BlockDef,
  BlockInstance,
  SectionInstance,
  SectionRef,
  SectionSchema,
  SettingDef,
  SettingsMap,
  TemplateJson,
  ThemeData,
} from './types';

const clone = <T>(value: T): T => structuredClone(value);

/** Settings that hold a value (headers and paragraphs are only labels). */
export const isValueSetting = (def: SettingDef): def is SettingDef & { id: string } =>
  typeof def.id === 'string' && def.type !== 'header' && def.type !== 'paragraph';

export const settingDefaults = (defs: SettingDef[] = []): SettingsMap => {
  const out: SettingsMap = {};
  for (const def of defs) {
    if (isValueSetting(def) && def.default !== undefined) out[def.id] = clone(def.default);
  }
  return out;
};

export const getContainer = (data: ThemeData, scope: SectionRef['scope'], name: string): TemplateJson | undefined =>
  scope === 'template' ? data.templates[name] : data.groups[name];

export const getSection = (data: ThemeData, ref: SectionRef): SectionInstance | undefined =>
  getContainer(data, ref.scope, ref.container)?.sections[ref.key];

const withContainer = (
  data: ThemeData,
  scope: SectionRef['scope'],
  name: string,
  edit: (container: TemplateJson) => void,
): ThemeData => {
  const next = clone(data);
  const container = getContainer(next, scope, name);
  if (!container) return data;
  edit(container);
  return next;
};

const withSection = (data: ThemeData, ref: SectionRef, edit: (section: SectionInstance) => void): ThemeData =>
  withContainer(data, ref.scope, ref.container, (container) => {
    const section = container.sections[ref.key];
    if (section) edit(section);
  });

/** A key not already used in `taken`, readable in the JSON: "hero-k3x9". */
export const uniqueKey = (base: string, taken: Iterable<string>): string => {
  const used = new Set(taken);
  const slug = base.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'item';
  for (;;) {
    const key = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    if (!used.has(key)) return key;
  }
};

const move = <T>(list: T[], from: number, to: number): T[] => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
};

// ---- Theme settings ---------------------------------------------------------

export const updateThemeSetting = (data: ThemeData, id: string, value: unknown): ThemeData => {
  const next = clone(data);
  next.settings[id] = clone(value) as SettingsMap[string];
  return next;
};

// ---- Sections ---------------------------------------------------------------

export const updateSectionSetting = (data: ThemeData, ref: SectionRef, id: string, value: unknown): ThemeData =>
  withSection(data, ref, (section) => {
    section.settings = { ...section.settings, [id]: clone(value) as SettingsMap[string] };
  });

export const setSectionDisabled = (data: ThemeData, ref: SectionRef, disabled: boolean): ThemeData =>
  withSection(data, ref, (section) => {
    if (disabled) section.disabled = true;
    else delete section.disabled;
  });

export const moveSection = (data: ThemeData, scope: SectionRef['scope'], name: string, from: number, to: number) =>
  withContainer(data, scope, name, (container) => {
    container.order = move(container.order, from, to);
  });

export const removeSection = (data: ThemeData, ref: SectionRef): ThemeData =>
  withContainer(data, ref.scope, ref.container, (container) => {
    delete container.sections[ref.key];
    container.order = container.order.filter((key) => key !== ref.key);
  });

/** Puts a removed section back where it was (for Undo). */
export const restoreSection = (data: ThemeData, ref: SectionRef, instance: SectionInstance, index: number): ThemeData =>
  withContainer(data, ref.scope, ref.container, (container) => {
    if (container.sections[ref.key]) return;
    container.sections[ref.key] = clone(instance);
    const at = Math.max(0, Math.min(index, container.order.length));
    container.order = [...container.order.slice(0, at), ref.key, ...container.order.slice(at)];
  });

const presetBlocks =(preset: NonNullable<SectionSchema['presets']>[number]) => {
  const blocks = preset.blocks ?? [];
  if (Array.isArray(blocks)) return blocks.map((block) => ({ key: undefined as string | undefined, block }));
  const order = preset.block_order ?? Object.keys(blocks);
  return order.filter((key) => blocks[key]).map((key) => ({ key, block: blocks[key] }));
};

/** A section built from its schema's first preset, ready to insert. */
export const sectionFromPreset = (type: string, schema: SectionSchema): SectionInstance => {
  const preset = schema.presets?.[0];
  const section: SectionInstance = { type, settings: { ...preset?.settings } };
  if (preset) {
    const blocks: Record<string, BlockInstance> = {};
    const order: string[] = [];
    for (const { key, block } of presetBlocks(preset)) {
      const blockKey = key ?? uniqueKey(block.type, order);
      blocks[blockKey] = { type: block.type, settings: { ...block.settings } };
      order.push(blockKey);
    }
    if (order.length > 0) {
      section.blocks = blocks;
      section.block_order = order;
    }
  }
  return section;
};

/** Inserts a section and returns the new data plus the key it was given. */
export const addSection = (
  data: ThemeData,
  scope: SectionRef['scope'],
  name: string,
  type: string,
  schema: SectionSchema,
  index?: number,
  /** Key to use, when the caller needs to know it up front (to select it). */
  requestedKey?: string,
): { data: ThemeData; key: string } => {
  const container = getContainer(data, scope, name);
  const taken = Object.keys(container?.sections ?? {});
  const key = requestedKey && !taken.includes(requestedKey) ? requestedKey : uniqueKey(type, taken);
  const next = withContainer(data, scope, name, (target) => {
    target.sections[key] = sectionFromPreset(type, schema);
    const at = index ?? target.order.length;
    target.order = [...target.order.slice(0, at), key, ...target.order.slice(at)];
  });
  return { data: next, key };
};

/**
 * Sections a merchant may add to this template or group: those with a preset
 * (Shopify's rule), allowed by enabled_on / disabled_on, and under their limit.
 */
export const addableSections = (
  schemas: Record<string, SectionSchema>,
  data: ThemeData,
  scope: SectionRef['scope'],
  name: string,
): Array<{ type: string; schema: SectionSchema }> => {
  const container = getContainer(data, scope, name);
  if (!container) return [];
  const templateType = name.split('.')[0];
  const groupType = scope === 'group' ? (data.groups[name]?.type ?? '') : '';

  const matches = (list: string[] | undefined) => {
    if (!list) return false;
    if (scope === 'template') return list.includes('*') || list.includes(templateType);
    return list.includes('*') || list.includes(groupType) || (groupType === 'custom' && list.some((g) => g.startsWith('custom.')));
  };
  const listFor = (rule: SectionSchema['enabled_on']) => (scope === 'template' ? rule?.templates : rule?.groups);

  return Object.entries(schemas)
    .filter(([, schema]) => (schema.presets?.length ?? 0) > 0)
    .filter(([, schema]) => {
      if (schema.enabled_on) return matches(listFor(schema.enabled_on));
      if (schema.disabled_on && matches(listFor(schema.disabled_on))) return false;
      // Without rules, Shopify allows a section in templates but not in groups.
      return scope === 'template';
    })
    .filter(([type, schema]) => {
      if (!schema.limit) return true;
      const used = Object.values(container.sections).filter((section) => section.type === type).length;
      return used < schema.limit;
    })
    .map(([type, schema]) => ({ type, schema }))
    .sort((a, b) => a.schema.name.localeCompare(b.schema.name));
};

// ---- Blocks -------------------------------------------------------------------

export const updateBlockSetting = (
  data: ThemeData,
  ref: SectionRef,
  blockKey: string,
  id: string,
  value: unknown,
): ThemeData =>
  withSection(data, ref, (section) => {
    const block = section.blocks?.[blockKey];
    if (block) block.settings = { ...block.settings, [id]: clone(value) as SettingsMap[string] };
  });

export const setBlockDisabled = (data: ThemeData, ref: SectionRef, blockKey: string, disabled: boolean): ThemeData =>
  withSection(data, ref, (section) => {
    const block = section.blocks?.[blockKey];
    if (!block) return;
    if (disabled) block.disabled = true;
    else delete block.disabled;
  });

export const moveBlock = (data: ThemeData, ref: SectionRef, from: number, to: number): ThemeData =>
  withSection(data, ref, (section) => {
    section.block_order = move(section.block_order ?? [], from, to);
  });

export const removeBlock = (data: ThemeData, ref: SectionRef, blockKey: string): ThemeData =>
  withSection(data, ref, (section) => {
    if (section.blocks) delete section.blocks[blockKey];
    section.block_order = (section.block_order ?? []).filter((key) => key !== blockKey);
  });

/** Puts a removed block back where it was (for Undo). */
export const restoreBlock = (data: ThemeData, ref: SectionRef, blockKey: string, block: BlockInstance, index: number): ThemeData =>
  withSection(data, ref, (section) => {
    if (section.blocks?.[blockKey]) return;
    section.blocks = { ...section.blocks, [blockKey]: clone(block) };
    const order = section.block_order ?? [];
    const at = Math.max(0, Math.min(index, order.length));
    section.block_order = [...order.slice(0, at), blockKey, ...order.slice(at)];
  });

export const addBlock = (
  data: ThemeData,
  ref: SectionRef,
  def: BlockDef,
  requestedKey?: string,
): { data: ThemeData; key: string } => {
  const section = getSection(data, ref);
  const taken = Object.keys(section?.blocks ?? {});
  const key = requestedKey && !taken.includes(requestedKey) ? requestedKey : uniqueKey(def.type, taken);
  const next = withSection(data, ref, (target) => {
    target.blocks = { ...target.blocks, [key]: { type: def.type, settings: {} } };
    target.block_order = [...(target.block_order ?? []), key];
  });
  return { data: next, key };
};

/** Block types that can still be added, honouring max_blocks and per-type limits. */
export const addableBlocks = (schema: SectionSchema | undefined, section: SectionInstance | undefined): BlockDef[] => {
  if (!schema?.blocks || !section) return [];
  const order = section.block_order ?? [];
  if (schema.max_blocks !== undefined && order.length >= schema.max_blocks) return [];
  return schema.blocks.filter((def) => {
    if (def.type.startsWith('@')) return false;
    if (!def.limit) return true;
    const used = order.filter((key) => section.blocks?.[key]?.type === def.type).length;
    return used < def.limit;
  });
};
