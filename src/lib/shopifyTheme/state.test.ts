import { describe, it, expect } from 'vitest';
import {
  addBlock,
  addSection,
  addableBlocks,
  addableSections,
  moveSection,
  removeBlock,
  removeSection,
  setSectionDisabled,
  updateBlockSetting,
} from './state';
import { baseThemeData, SECTION_SCHEMAS } from './themeSource';

const base = baseThemeData();

describe('theme state edits', () => {
  it('never mutates the input', () => {
    const before = JSON.stringify(base);
    moveSection(base, 'template', 'index', 0, 2);
    removeSection(base, { scope: 'template', container: 'index', key: 'hero' });
    setSectionDisabled(base, { scope: 'template', container: 'index', key: 'hero' }, true);
    expect(JSON.stringify(base)).toBe(before);
  });

  it('moves sections', () => {
    const next = moveSection(base, 'template', 'index', 0, 2);
    expect(next.templates.index.order).toEqual(['featured', 'about', 'hero']);
  });

  it('adds a section from its preset at the requested position', () => {
    const { data, key } = addSection(base, 'template', 'index', 'faq', SECTION_SCHEMAS.faq, 1);
    expect(data.templates.index.order[1]).toBe(key);
    expect(data.templates.index.sections[key].type).toBe('faq');
  });

  it('removes a section from both the map and the order', () => {
    const next = removeSection(base, { scope: 'template', container: 'index', key: 'hero' });
    expect(next.templates.index.sections.hero).toBeUndefined();
    expect(next.templates.index.order).not.toContain('hero');
  });

  it('adds, edits and removes blocks', () => {
    const ref = { scope: 'template' as const, container: 'index', key: 'about' };
    const def = SECTION_SCHEMAS['rich-text'].blocks!.find((block) => block.type === 'text')!;
    const added = addBlock(base, ref, def);
    expect(added.data.templates.index.sections.about.block_order).toContain(added.key);
    const edited = updateBlockSetting(added.data, ref, added.key, 'text', '<p>Hi</p>');
    expect(edited.templates.index.sections.about.blocks![added.key].settings!.text).toBe('<p>Hi</p>');
    const removed = removeBlock(edited, ref, added.key);
    expect(removed.templates.index.sections.about.blocks![added.key]).toBeUndefined();
  });

  it('offers only template sections in templates and group sections in groups', () => {
    const inTemplate = addableSections(SECTION_SCHEMAS, base, 'template', 'index').map((s) => s.type);
    const inHeader = addableSections(SECTION_SCHEMAS, base, 'group', 'header-group').map((s) => s.type);
    expect(inTemplate).toContain('faq');
    expect(inHeader).not.toContain('faq');
  });

  it('stops offering blocks at max_blocks', () => {
    const schema = { name: 'x', max_blocks: 1, blocks: [{ type: 'a', name: 'A' }] };
    expect(addableBlocks(schema, { type: 'x', blocks: { k: { type: 'a' } }, block_order: ['k'] })).toEqual([]);
    expect(addableBlocks(schema, { type: 'x' })).toHaveLength(1);
  });
});
