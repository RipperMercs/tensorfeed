import { describe, it, expect } from 'vitest';
import { parseCardJson } from './action-cards-generator';

// The Article type is internal to action-cards-generator.ts but parseCardJson's
// signature accepts it structurally. We mirror its shape here.
interface Article {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceDomain: string;
  snippet: string;
  publishedAt: string;
}

// ── factories ──────────────────────────────────────────────────────

function makeArticle(partial: Partial<Article> = {}): Article {
  return {
    id: partial.id ?? 'article-1',
    title: partial.title ?? 'Anthropic ships Claude Haiku 4.5',
    url: partial.url ?? 'https://example.com/haiku',
    source: partial.source ?? 'Anthropic',
    sourceDomain: partial.sourceDomain ?? 'anthropic.com',
    snippet: partial.snippet ?? 'Sample snippet.',
    publishedAt: partial.publishedAt ?? '2026-05-24T08:00:00.000Z',
  };
}

const GENERATED_AT = '2026-05-24T09:00:00.000Z';

function validCardJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    action_summary: 'Migrate to Haiku 4.5 for cheap structured output.',
    migration_recommendation: 'Move from Haiku 3.5 to Haiku 4.5.',
    affected_capability: 'model',
    cost_impact: 'medium',
    security_impact: 'low',
    urgency: 'this_week',
    ...overrides,
  });
}

// ── malformed / empty input ────────────────────────────────────────

describe('parseCardJson: malformed JSON', () => {
  it('returns null on plain text input', () => {
    expect(parseCardJson('not json', makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null on unclosed JSON', () => {
    expect(parseCardJson('{', makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(parseCardJson('', makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null on whitespace-only input', () => {
    expect(parseCardJson('   \n  ', makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null when parsed JSON is null literal', () => {
    expect(parseCardJson('null', makeArticle(), GENERATED_AT)).toBeNull();
  });
});

// ── action_summary validation ──────────────────────────────────────

describe('parseCardJson: action_summary validation', () => {
  it('returns null when action_summary is missing', () => {
    const raw = JSON.stringify({
      affected_capability: 'model',
      cost_impact: 'low',
      security_impact: 'low',
      urgency: 'fyi',
    });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null when action_summary is not a string (number)', () => {
    const raw = validCardJson({ action_summary: 42 });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null when action_summary is not a string (array)', () => {
    const raw = validCardJson({ action_summary: ['hi'] });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null when action_summary is empty string', () => {
    const raw = validCardJson({ action_summary: '' });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null when action_summary is whitespace only', () => {
    const raw = validCardJson({ action_summary: '   ' });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('trims surrounding whitespace from action_summary', () => {
    const raw = validCardJson({ action_summary: '  Do the thing.  ' });
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card).not.toBeNull();
    expect(card!.action_summary).toBe('Do the thing.');
  });
});

// ── affected_capability validation ─────────────────────────────────

describe('parseCardJson: affected_capability validation', () => {
  it('returns null when affected_capability is missing', () => {
    const raw = JSON.stringify({
      action_summary: 'hi',
      cost_impact: 'low',
      security_impact: 'low',
      urgency: 'fyi',
    });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null when affected_capability is "memes" (not allowed)', () => {
    const raw = validCardJson({ affected_capability: 'memes' });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null when affected_capability is "random" (not allowed)', () => {
    const raw = validCardJson({ affected_capability: 'random' });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null when affected_capability is not a string', () => {
    const raw = validCardJson({ affected_capability: 5 });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('normalizes uppercase affected_capability to lowercase', () => {
    const raw = validCardJson({ affected_capability: 'MODEL' });
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card).not.toBeNull();
    expect(card!.affected_capability).toBe('model');
  });

  it('accepts each allowed capability tag', () => {
    for (const tag of ['pricing', 'model', 'safety', 'framework', 'infrastructure', 'tooling', 'policy', 'ecosystem']) {
      const raw = validCardJson({ affected_capability: tag });
      const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
      expect(card).not.toBeNull();
      expect(card!.affected_capability).toBe(tag);
    }
  });
});

// ── cost_impact validation ─────────────────────────────────────────

describe('parseCardJson: cost_impact validation', () => {
  it('returns null when cost_impact is missing', () => {
    const raw = JSON.stringify({
      action_summary: 'hi',
      affected_capability: 'model',
      security_impact: 'low',
      urgency: 'fyi',
    });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null when cost_impact is invalid', () => {
    const raw = validCardJson({ cost_impact: 'extreme' });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('normalizes "High" to "high"', () => {
    const raw = validCardJson({ cost_impact: 'High' });
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card).not.toBeNull();
    expect(card!.cost_impact).toBe('high');
  });
});

// ── security_impact validation ─────────────────────────────────────

describe('parseCardJson: security_impact validation', () => {
  it('returns null when security_impact is missing', () => {
    const raw = JSON.stringify({
      action_summary: 'hi',
      affected_capability: 'model',
      cost_impact: 'low',
      urgency: 'fyi',
    });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null when security_impact is invalid', () => {
    const raw = validCardJson({ security_impact: 'unknown' });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('normalizes "MEDIUM" to "medium"', () => {
    const raw = validCardJson({ security_impact: 'MEDIUM' });
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card).not.toBeNull();
    expect(card!.security_impact).toBe('medium');
  });
});

// ── urgency validation ─────────────────────────────────────────────

describe('parseCardJson: urgency validation', () => {
  it('returns null when urgency is missing', () => {
    const raw = JSON.stringify({
      action_summary: 'hi',
      affected_capability: 'model',
      cost_impact: 'low',
      security_impact: 'low',
    });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('returns null when urgency is invalid', () => {
    const raw = validCardJson({ urgency: 'soon' });
    expect(parseCardJson(raw, makeArticle(), GENERATED_AT)).toBeNull();
  });

  it('normalizes "Immediate" to "immediate"', () => {
    const raw = validCardJson({ urgency: 'Immediate' });
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card).not.toBeNull();
    expect(card!.urgency).toBe('immediate');
  });
});

// ── happy path ─────────────────────────────────────────────────────

describe('parseCardJson: happy path', () => {
  it('returns a fully populated ActionCard on valid JSON', () => {
    const article = makeArticle({
      id: 'a-42',
      title: 'Big news',
      url: 'https://news.example/big',
      source: 'BigNews',
      publishedAt: '2026-05-23T12:00:00.000Z',
    });
    const card = parseCardJson(validCardJson(), article, GENERATED_AT);
    expect(card).not.toBeNull();
    expect(card!.article_id).toBe('a-42');
    expect(card!.article_title).toBe('Big news');
    expect(card!.article_url).toBe('https://news.example/big');
    expect(card!.article_source).toBe('BigNews');
    expect(card!.article_published_at).toBe('2026-05-23T12:00:00.000Z');
    expect(card!.action_summary).toBe('Migrate to Haiku 4.5 for cheap structured output.');
    expect(card!.migration_recommendation).toBe('Move from Haiku 3.5 to Haiku 4.5.');
    expect(card!.affected_capability).toBe('model');
    expect(card!.cost_impact).toBe('medium');
    expect(card!.security_impact).toBe('low');
    expect(card!.urgency).toBe('this_week');
    expect(card!.generated_at).toBe(GENERATED_AT);
  });
});

// ── markdown fence handling ────────────────────────────────────────

describe('parseCardJson: markdown fences', () => {
  it('strips ```json fences before parsing', () => {
    const raw = '```json\n' + validCardJson() + '\n```';
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card).not.toBeNull();
    expect(card!.action_summary).toBe('Migrate to Haiku 4.5 for cheap structured output.');
  });

  it('strips plain ``` fences before parsing', () => {
    const raw = '```\n' + validCardJson() + '\n```';
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card).not.toBeNull();
  });

  it('tolerates surrounding whitespace and fences together', () => {
    const raw = '   \n```json\n' + validCardJson() + '\n```   \n';
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card).not.toBeNull();
  });

  it('tolerates surrounding whitespace alone', () => {
    const raw = '   \n' + validCardJson() + '\n   ';
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card).not.toBeNull();
  });
});

// ── migration_recommendation handling ──────────────────────────────

describe('parseCardJson: migration_recommendation', () => {
  it('passes through verbatim when string and non-empty', () => {
    const raw = validCardJson({ migration_recommendation: 'Switch to model-x.' });
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card!.migration_recommendation).toBe('Switch to model-x.');
  });

  it('is null when migration_recommendation is missing from JSON', () => {
    const raw = JSON.stringify({
      action_summary: 'hi',
      affected_capability: 'model',
      cost_impact: 'low',
      security_impact: 'low',
      urgency: 'fyi',
    });
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card!.migration_recommendation).toBeNull();
  });

  it('is null when migration_recommendation is explicitly null', () => {
    const raw = validCardJson({ migration_recommendation: null });
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card!.migration_recommendation).toBeNull();
  });

  it('is null when migration_recommendation is empty string', () => {
    const raw = validCardJson({ migration_recommendation: '' });
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card!.migration_recommendation).toBeNull();
  });

  it('is null when migration_recommendation is whitespace only', () => {
    const raw = validCardJson({ migration_recommendation: '   ' });
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card!.migration_recommendation).toBeNull();
  });

  it('is null when migration_recommendation is a number', () => {
    const raw = validCardJson({ migration_recommendation: 5 });
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card!.migration_recommendation).toBeNull();
  });

  it('is null when migration_recommendation is an array', () => {
    const raw = validCardJson({ migration_recommendation: ['use x'] });
    const card = parseCardJson(raw, makeArticle(), GENERATED_AT);
    expect(card!.migration_recommendation).toBeNull();
  });
});

// ── article passthrough + generated_at ─────────────────────────────

describe('parseCardJson: article and generated_at passthrough', () => {
  it('passes article_id, article_title, article_url, article_source, article_published_at verbatim', () => {
    const article = makeArticle({
      id: 'verbatim-id',
      title: 'Verbatim Title',
      url: 'https://verbatim.example',
      source: 'VerbatimSource',
      publishedAt: '2026-01-01T00:00:00.000Z',
    });
    const card = parseCardJson(validCardJson(), article, GENERATED_AT);
    expect(card!.article_id).toBe('verbatim-id');
    expect(card!.article_title).toBe('Verbatim Title');
    expect(card!.article_url).toBe('https://verbatim.example');
    expect(card!.article_source).toBe('VerbatimSource');
    expect(card!.article_published_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('sets generated_at to the value passed in', () => {
    const ts = '2026-12-25T00:00:00.000Z';
    const card = parseCardJson(validCardJson(), makeArticle(), ts);
    expect(card!.generated_at).toBe(ts);
  });
});
