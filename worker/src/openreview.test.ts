import { describe, it, expect } from 'vitest';
import { clipText, tierWord, noteToPaper, buildAcceptancesSnapshot } from './openreview';

describe('clipText', () => {
  it('leaves short text intact', () => {
    expect(clipText('hello', 240)).toBe('hello');
  });
  it('clips long text with an ellipsis', () => {
    const out = clipText('x'.repeat(300), 240);
    expect(out.length).toBe(240);
    expect(out.endsWith('...')).toBe(true);
  });
});

describe('tierWord', () => {
  it('strips the venue prefix and normalizes casing', () => {
    expect(tierWord('ICLR 2025 Oral', 'ICLR 2025')).toBe('Oral');
    expect(tierWord('NeurIPS 2025 oral', 'NeurIPS 2025')).toBe('Oral');
    expect(tierWord('ICML 2025 spotlight', 'ICML 2025')).toBe('Spotlight');
  });
});

function note(over = {}) {
  return {
    forum: 'abc123',
    cdate: 1727524763710,
    content: {
      title: { value: 'A Great Paper' },
      authors: { value: ['Ada Lovelace', 'Alan Turing', 'Grace Hopper', 'D', 'E', 'F'] },
      keywords: { value: ['rl', 'llm', 'agents', 'k4', 'k5', 'k6', 'k7'] },
      abstract: { value: 'short abstract' },
      primary_area: { value: 'reinforcement learning' },
      venue: { value: 'ICLR 2025 Oral' },
      pdf: { value: '/pdf/abc.pdf' },
    },
    ...over,
  };
}

describe('noteToPaper', () => {
  it('maps a note to an AcceptedPaper', () => {
    const p = noteToPaper(note(), 'ICLR 2025')!;
    expect(p.title).toBe('A Great Paper');
    expect(p.authors).toHaveLength(5); // capped at 5
    expect(p.keywords).toHaveLength(6); // capped at 6
    expect(p.tier).toBe('Oral');
    expect(p.venue_group).toBe('ICLR 2025');
    expect(p.primary_area).toBe('reinforcement learning');
    expect(p.forum_url).toBe('https://openreview.net/forum?id=abc123');
    expect(p.pdf_url).toBe('https://openreview.net/pdf/abc.pdf');
    expect(p.accepted_at).toBe(new Date(1727524763710).toISOString());
  });
  it('returns null without a title or forum', () => {
    expect(noteToPaper(note({ forum: undefined }), 'ICLR 2025')).toBeNull();
    expect(noteToPaper({ forum: 'x', content: {} }, 'ICLR 2025')).toBeNull();
  });
});

describe('buildAcceptancesSnapshot', () => {
  it('assembles, sorts by accepted_at desc, and lists venues', () => {
    const older = note({ cdate: 1000, content: { ...note().content, title: { value: 'Older' }, venue: { value: 'ICML 2025 oral' } } });
    const newer = note({ cdate: 2000, content: { ...note().content, title: { value: 'Newer' } } });
    const snap = buildAcceptancesSnapshot(
      [
        { label: 'ICLR 2025', notes: [newer] },
        { label: 'ICML 2025', notes: [older] },
      ],
      '2026-06-01T00:00:00.000Z',
    );
    expect(snap.paper_count).toBe(2);
    expect(snap.papers[0].title).toBe('Newer'); // most recent first
    expect(snap.venues).toEqual(['ICLR 2025', 'ICML 2025']);
    expect(snap.source.name).toBe('OpenReview');
    expect(snap.capturedAt).toBe('2026-06-01T00:00:00.000Z');
  });
});
