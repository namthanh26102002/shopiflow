import { describe, expect, it } from 'vitest';
import { applyRemoteFiles, canonical, localSyncFiles, planSync, stripJsonComments } from './storeSync';
import { baseThemeData } from './themeSource';
import { updateSectionSetting } from './state';

const SHOPIFY_HEADER = `/*
 * ------------------------------------------------------------
 * IMPORTANT: The contents of this file are auto-generated.
 * ------------------------------------------------------------
 */
`;

const file = (content: string, checksum = 'x') => ({ content, checksum });

describe('canonical', () => {
  it('ignores Shopify’s comment header, key order and spacing', () => {
    const ours = JSON.stringify({ sections: { a: { type: 'hero' } }, order: ['a'] }, null, 2);
    const theirs = `${SHOPIFY_HEADER}{"order":["a"],"sections":{"a":{"type":"hero"}}}`;
    expect(canonical(theirs)).toBe(canonical(ours));
    expect(stripJsonComments(theirs).startsWith('{')).toBe(true);
  });

  it('keeps array order meaningful', () => {
    expect(canonical('{"order":["a","b"]}')).not.toBe(canonical('{"order":["b","a"]}'));
  });
});

describe('planSync', () => {
  const v1 = '{"order":["a"]}';
  const v2 = '{"order":["a","b"]}';
  const v3 = '{"order":["c"]}';
  const base = { 'templates/index.json': canonical(v1) };

  it('does nothing when neither side changed', () => {
    const plan = planSync({ 'templates/index.json': v1 }, { 'templates/index.json': file(`${SHOPIFY_HEADER}${v1}`) }, base);
    expect(plan).toMatchObject({ pull: {}, push: {}, conflicts: [] });
  });

  it('takes Shopify’s change when only Shopify changed', () => {
    const plan = planSync({ 'templates/index.json': v1 }, { 'templates/index.json': file(v2) }, base);
    expect(Object.keys(plan.pull)).toEqual(['templates/index.json']);
    expect(plan.nextBase['templates/index.json']).toBe(canonical(v2));
  });

  it('sends ours when only we changed', () => {
    const plan = planSync({ 'templates/index.json': v2 }, { 'templates/index.json': file(v1) }, base);
    expect(plan.push).toEqual({ 'templates/index.json': v2 });
  });

  it('flags a conflict when both changed differently, and agrees when both made the same change', () => {
    expect(planSync({ 'templates/index.json': v2 }, { 'templates/index.json': file(v3) }, base).conflicts).toEqual(['templates/index.json']);
    const same = planSync({ 'templates/index.json': v2 }, { 'templates/index.json': file(v2) }, base);
    expect(same.conflicts).toEqual([]);
    expect(same.nextBase['templates/index.json']).toBe(canonical(v2));
  });

  it('brings in templates created in Shopify and sends ones created here', () => {
    const plan = planSync({ 'templates/page.faq.json': v1 }, { 'templates/product.alt.json': file(v2) }, {});
    expect(Object.keys(plan.pull)).toEqual(['templates/product.alt.json']);
    expect(Object.keys(plan.push)).toEqual(['templates/page.faq.json']);
  });
});

describe('applyRemoteFiles', () => {
  it('writes templates, groups and settings from Shopify’s files', () => {
    const base = baseThemeData();
    const edited = updateSectionSetting(base, { scope: 'template', container: 'index', key: 'hero' }, 'heading', 'From Shopify');
    const remote = localSyncFiles(edited);
    const { data, skipped } = applyRemoteFiles(base, {
      'templates/index.json': `${SHOPIFY_HEADER}${remote['templates/index.json']}`,
      'config/settings_data.json': JSON.stringify({ current: { ...base.settings, page_width: 1111 } }),
      'templates/product.alt.json': remote['templates/product.json'],
    });
    expect(skipped).toEqual([]);
    expect(data.templates.index.sections.hero.settings?.heading).toBe('From Shopify');
    expect(data.settings.page_width).toBe(1111);
    expect(data.templates['product.alt']).toBeDefined();
  });

  it('skips files it cannot read instead of breaking the project', () => {
    const { data, skipped } = applyRemoteFiles(baseThemeData(), { 'templates/index.json': '{ not json' });
    expect(skipped).toEqual(['templates/index.json']);
    expect(data.templates.index).toEqual(baseThemeData().templates.index);
  });
});
