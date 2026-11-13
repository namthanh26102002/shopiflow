import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { buildThemeFiles, exportThemeZip, validateThemeFiles, zipFileName } from './exportZip';
import { baseThemeData, THEME_FILES } from './themeSource';
import { updateSectionSetting } from './state';

describe('theme source', () => {
  it('bundles every shipped file, so the ZIP is never missing one', () => {
    const root = join(process.cwd(), 'shopify-theme', 'base');
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
      );
    const onDisk = walk(root)
      .map((full) => relative(root, full).split(sep).join('/'))
      .filter((rel) => !rel.split('/').some((part) => part.startsWith('.')))
      .sort();
    expect(Object.keys(THEME_FILES).sort()).toEqual(onDisk);
  });

  it('holds only text files (binary assets need a different loader)', () => {
    for (const rel of Object.keys(THEME_FILES)) {
      expect(rel).toMatch(/\.(liquid|json|css|js|svg|txt)$/);
    }
  });

  it('bundles each file with its real content, byte for byte', () => {
    const root = join(process.cwd(), 'shopify-theme', 'base');
    for (const [rel, text] of Object.entries(THEME_FILES)) {
      expect(text, rel).toBe(readFileSync(join(root, rel), 'utf8'));
    }
  });
});

describe('exportThemeZip', () => {
  it('exports the base theme cleanly', () => {
    const result = exportThemeZip(baseThemeData(), 'My store');
    expect(result.ok).toBe(true);
  });

  it('writes the merchant edits into the ZIP', () => {
    const data = updateSectionSetting(baseThemeData(), { scope: 'template', container: 'index', key: 'hero' }, 'heading', 'Edited');
    const result = exportThemeZip(data, 'My store');
    if ('problems' in result) throw new Error(result.problems.join('\n'));
    const files = unzipSync(result.bytes);
    const index = JSON.parse(strFromU8(files['templates/index.json']));
    expect(index.sections.hero.settings.heading).toBe('Edited');
    const settingsData = JSON.parse(strFromU8(files['config/settings_data.json']));
    expect(typeof settingsData.current).toBe('object');
    expect(settingsData.current.color_schemes).toBeDefined();
    expect(files['layout/theme.liquid']).toBeDefined();
  });

  it('refuses a template that references a section the theme does not have', () => {
    const data = baseThemeData();
    data.templates.index.sections.ghost = { type: 'does-not-exist' };
    data.templates.index.order.push('ghost');
    const result = exportThemeZip(data, 'x');
    expect(result.ok).toBe(false);
    if ('problems' in result) expect(result.problems.join('\n')).toContain('unknown section "does-not-exist"');
  });

  it('catches an order entry with no section behind it', () => {
    const files = buildThemeFiles(baseThemeData());
    const index = JSON.parse(files['templates/index.json']);
    index.order.push('missing');
    files['templates/index.json'] = JSON.stringify(index);
    expect(validateThemeFiles(files).join('\n')).toContain('order lists "missing"');
  });

  it('names the file after the project', () => {
    expect(zipFileName('Summer Sale!')).toMatch(/^shopiflow-summer-sale-\d+\.\d+\.\d+\.zip$/);
  });
});
