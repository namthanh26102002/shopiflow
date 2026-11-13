import { describe, it, expect } from 'vitest';
import { ThemeRenderer, attrToRef, refToAttr } from './renderer';
import { baseThemeData, SECTION_SCHEMAS } from './themeSource';
import { addSection, updateSectionSetting, updateThemeSetting } from './state';

const renderer = new ThemeRenderer();
const base = baseThemeData();

describe('ThemeRenderer', () => {
  it.each(Object.keys(base.templates))('renders the %s template without section errors', async (template) => {
    const html = await renderer.renderPage(base, template);
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).not.toContain('Could not preview section');
    expect(html).not.toContain('Translation missing');
    // Every enabled section in the template gets the selectable wrapper.
    for (const key of base.templates[template].order) {
      if (base.templates[template].sections[key].disabled) continue;
      expect(html).toContain(`data-sf-section="template|${template}|${key}"`);
    }
  });

  it('renders the header and footer groups on every page', async () => {
    const html = await renderer.renderPage(base, 'index');
    expect(html).toContain('BEGIN sections: header-group');
    expect(html).toContain('BEGIN sections: footer-group');
  });

  it('inlines theme assets instead of linking to them', async () => {
    const html = await renderer.renderPage(base, 'index');
    expect(html).not.toContain('sf-asset://');
    expect(html).toContain('<style data-asset="base.css">');
    expect(html).toContain("customElements.define('menu-toggle'");
  });

  it('reflects an edited section setting', async () => {
    const edited = updateSectionSetting(base, { scope: 'template', container: 'index', key: 'hero' }, 'heading', 'Brand new headline');
    expect(await renderer.renderPage(edited, 'index')).toContain('Brand new headline');
  });

  it('reflects edited theme colors in the CSS variables', async () => {
    const schemes = structuredClone(base.settings.color_schemes) as Record<string, { settings: Record<string, string> }>;
    schemes['scheme-1'].settings.background = '#123456';
    const html = await renderer.renderPage(updateThemeSetting(base, 'color_schemes', schemes), 'index');
    expect(html).toContain('--color-background: 18, 52, 86');
  });

  it('renders every section that can be added from a preset', async () => {
    let data = base;
    for (const [type, schema] of Object.entries(SECTION_SCHEMAS)) {
      if (!schema.presets?.length) continue;
      data = addSection(data, 'template', 'index', type, schema).data;
    }
    const html = await renderer.renderPage(data, 'index');
    expect(html).not.toContain('Could not preview section');
  });

  it('skips disabled sections', async () => {
    const data = structuredClone(base);
    data.templates.index.sections.hero.disabled = true;
    const html = await renderer.renderPage(data, 'index');
    expect(html).not.toContain('data-sf-section="template|index|hero"');
  });
});

describe('section refs', () => {
  it('round-trips through the data attribute', () => {
    const ref = { scope: 'group' as const, container: 'header-group', key: 'announcement-bar' };
    expect(attrToRef(refToAttr(ref))).toEqual(ref);
    expect(attrToRef('nonsense')).toBeNull();
  });
});
