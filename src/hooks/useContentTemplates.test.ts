import { describe, it, expect } from 'vitest';
import { buildProjectRow, describeTemplate, ContentTemplate } from './useContentTemplates';

const template = (over: Partial<ContentTemplate> = {}): ContentTemplate => ({
  id: 't1',
  content_type: 'advertorial',
  title: 'Skincare Launch',
  description: '',
  content: {},
  is_published: true,
  created_at: '',
  updated_at: '',
  ...over,
});

describe('buildProjectRow', () => {
  // The bug this guards: the builders render settings.title, so importing a
  // template whose source project was called something else showed that old
  // name instead of the template's.
  it('names the imported project after the template, not the source', () => {
    const t = template({ content: { settings: { title: 'Untitled Advertorial' }, blocks: [] } });
    const row = buildProjectRow('advertorial', t, 'user-1') as { settings: { title: string } };
    expect(row.settings.title).toBe('Skincare Launch');
  });

  it('sets the title column to match settings.title', () => {
    const t = template({ content: { settings: { title: 'stale' } } });
    const row = buildProjectRow('advertorial', t, 'user-1') as
      { title: string; settings: { title: string } };
    expect(row.title).toBe(row.settings.title);
  });

  it('keeps the rest of the source settings', () => {
    const t = template({ content: { settings: { title: 'old', brandColor: '#FF0000' } } });
    const row = buildProjectRow('advertorial', t, 'user-1') as
      { settings: { brandColor: string } };
    expect(row.settings.brandColor).toBe('#FF0000');
  });

  it('copies advertorial blocks and omits quiz-only fields', () => {
    const t = template({ content: { blocks: [{ id: 'b1' }] } });
    const row = buildProjectRow('advertorial', t, 'user-1') as Record<string, unknown>;
    expect(row.blocks).toEqual([{ id: 'b1' }]);
    expect(row.questions).toBeUndefined();
  });

  it('copies quiz content and omits blocks', () => {
    const t = template({
      content_type: 'quiz',
      content: { questions: [{ id: 'q1' }], products: [], results: {} },
    });
    const row = buildProjectRow('quiz', t, 'user-1') as Record<string, unknown>;
    expect(row.questions).toEqual([{ id: 'q1' }]);
    expect(row.blocks).toBeUndefined();
  });

  it('survives a template with no content at all', () => {
    const row = buildProjectRow('quiz', template({ content: {} }), 'user-1') as
      { settings: { title: string }; questions: unknown[] };
    expect(row.settings.title).toBe('Skincare Launch');
    expect(row.questions).toEqual([]);
  });
});

describe('describeTemplate', () => {
  it('counts questions for quizzes and blocks for advertorials', () => {
    expect(describeTemplate(template({
      content_type: 'quiz', content: { questions: [1, 2, 3] },
    }))).toBe('3 questions');
    expect(describeTemplate(template({ content: { blocks: [1] } }))).toBe('1 block');
  });

  it('reads zero when the content is missing', () => {
    expect(describeTemplate(template({ content: {} }))).toBe('0 blocks');
  });
});
