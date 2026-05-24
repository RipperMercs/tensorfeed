import { describe, it, expect } from 'vitest';
import {
  parseCapability,
  parseImpact,
  parseUrgency,
  parseQuery,
  buildCardsResponse,
} from './premium-news-action-cards';
import type {
  ActionCardsSnapshot,
  ActionCard,
  CapabilityTag,
  ImpactLevel,
  UrgencyLevel,
} from './action-cards-generator';

// ── factories ──────────────────────────────────────────────────────

function makeCard(partial: Partial<ActionCard> & Pick<ActionCard, 'article_id'>): ActionCard {
  return {
    article_id: partial.article_id,
    article_title: partial.article_title ?? `Title ${partial.article_id}`,
    article_url: partial.article_url ?? `https://example.com/${partial.article_id}`,
    article_source: partial.article_source ?? 'SourceA',
    article_published_at: partial.article_published_at ?? '2026-05-24T08:00:00.000Z',
    action_summary: partial.action_summary ?? 'Do the thing.',
    migration_recommendation: partial.migration_recommendation ?? null,
    affected_capability: partial.affected_capability ?? 'model',
    cost_impact: partial.cost_impact ?? 'none',
    security_impact: partial.security_impact ?? 'none',
    urgency: partial.urgency ?? 'fyi',
    generated_at: partial.generated_at ?? '2026-05-24T09:00:00.000Z',
  };
}

function makeSnapshot(
  cards: ActionCard[],
  capturedAt = '2026-05-24T08:00:00.000Z',
  articles_considered = cards.length,
): ActionCardsSnapshot {
  return {
    capturedAt,
    source: 'tensorfeed.ai news + Claude Haiku 4.5',
    model: 'claude-haiku-4-5-20251001',
    articles_considered,
    articles_succeeded: cards.length,
    articles_failed: 0,
    cards,
  };
}

const DEFAULT_FILTER = {
  capability: null as CapabilityTag | null,
  min_cost_impact: 'none' as ImpactLevel,
  min_security_impact: 'none' as ImpactLevel,
  urgency: null as UrgencyLevel | null,
  query: null as string | null,
};

// ── parseCapability ────────────────────────────────────────────────

describe('parseCapability', () => {
  it('returns null on null', () => {
    expect(parseCapability(null)).toBeNull();
  });

  it('returns null on "unknown"', () => {
    expect(parseCapability('unknown')).toBeNull();
  });

  it('returns null on whitespace', () => {
    expect(parseCapability('   ')).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(parseCapability('')).toBeNull();
  });

  it('normalizes "Model" to "model"', () => {
    expect(parseCapability('Model')).toBe('model');
  });

  it('accepts all valid capability tags', () => {
    for (const tag of ['pricing', 'model', 'safety', 'framework', 'infrastructure', 'tooling', 'policy', 'ecosystem']) {
      expect(parseCapability(tag)).toBe(tag);
    }
  });

  it('trims and lowercases', () => {
    expect(parseCapability('  MODEL  ')).toBe('model');
  });
});

// ── parseImpact ────────────────────────────────────────────────────

describe('parseImpact', () => {
  it('returns "none" on null', () => {
    expect(parseImpact(null)).toBe('none');
  });

  it('returns "none" on empty string', () => {
    expect(parseImpact('')).toBe('none');
  });

  it('lowercases valid level "High"', () => {
    expect(parseImpact('High')).toBe('high');
  });

  it('returns "none" on invalid input (NOT null)', () => {
    expect(parseImpact('extreme')).toBe('none');
  });

  it('accepts all valid impact levels', () => {
    for (const lvl of ['none', 'low', 'medium', 'high']) {
      expect(parseImpact(lvl)).toBe(lvl);
    }
  });
});

// ── parseUrgency ───────────────────────────────────────────────────

describe('parseUrgency', () => {
  it('returns null on null', () => {
    expect(parseUrgency(null)).toBeNull();
  });

  it('returns null on invalid input', () => {
    expect(parseUrgency('soon')).toBeNull();
  });

  it('lowercases "Immediate" to "immediate"', () => {
    expect(parseUrgency('Immediate')).toBe('immediate');
  });

  it('accepts all valid urgency levels', () => {
    for (const lvl of ['immediate', 'this_week', 'fyi']) {
      expect(parseUrgency(lvl)).toBe(lvl);
    }
  });
});

// ── parseQuery ─────────────────────────────────────────────────────

describe('parseQuery', () => {
  it('returns null on null', () => {
    expect(parseQuery(null)).toBeNull();
  });

  it('returns null on whitespace', () => {
    expect(parseQuery('   ')).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(parseQuery('')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parseQuery('  hello  ')).toBe('hello');
  });
});

// ── buildCardsResponse: empty snapshot ─────────────────────────────

describe('buildCardsResponse: empty snapshot', () => {
  it('returns ok=true with empty filtered cards', () => {
    const r = buildCardsResponse(makeSnapshot([]), DEFAULT_FILTER);
    expect(r.ok).toBe(true);
    expect(r.cards).toEqual([]);
  });

  it('summary counts initialized to 0 across all categories', () => {
    const r = buildCardsResponse(makeSnapshot([]), DEFAULT_FILTER);
    expect(r.summary.by_capability).toEqual({
      pricing: 0, model: 0, safety: 0, framework: 0, infrastructure: 0, tooling: 0, policy: 0, ecosystem: 0,
    });
    expect(r.summary.by_urgency).toEqual({ immediate: 0, this_week: 0, fyi: 0 });
    expect(r.summary.by_cost_impact).toEqual({ none: 0, low: 0, medium: 0, high: 0 });
    expect(r.summary.by_security_impact).toEqual({ none: 0, low: 0, medium: 0, high: 0 });
    expect(r.summary.cards_with_migration_recommendation).toBe(0);
  });
});

// ── buildCardsResponse: capability filter ──────────────────────────

describe('buildCardsResponse: capability filter', () => {
  it('exact-match: only cards with affected_capability=model survive', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', affected_capability: 'model' }),
      makeCard({ article_id: 'b', affected_capability: 'pricing' }),
      makeCard({ article_id: 'c', affected_capability: 'safety' }),
    ]);
    const r = buildCardsResponse(snap, { ...DEFAULT_FILTER, capability: 'model' });
    expect(r.cards.length).toBe(1);
    expect(r.cards[0].article_id).toBe('a');
  });
});

// ── buildCardsResponse: urgency filter ─────────────────────────────

describe('buildCardsResponse: urgency filter', () => {
  it('exact-match: only cards with urgency=immediate survive', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', urgency: 'immediate' }),
      makeCard({ article_id: 'b', urgency: 'this_week' }),
      makeCard({ article_id: 'c', urgency: 'fyi' }),
    ]);
    const r = buildCardsResponse(snap, { ...DEFAULT_FILTER, urgency: 'immediate' });
    expect(r.cards.length).toBe(1);
    expect(r.cards[0].article_id).toBe('a');
  });
});

// ── buildCardsResponse: impact threshold filters ───────────────────

describe('buildCardsResponse: min_cost_impact', () => {
  it('min_cost_impact=medium filters out none and low', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', cost_impact: 'none' }),
      makeCard({ article_id: 'b', cost_impact: 'low' }),
      makeCard({ article_id: 'c', cost_impact: 'medium' }),
      makeCard({ article_id: 'd', cost_impact: 'high' }),
    ]);
    const r = buildCardsResponse(snap, { ...DEFAULT_FILTER, min_cost_impact: 'medium' });
    const ids = r.cards.map((c) => c.article_id).sort();
    expect(ids).toEqual(['c', 'd']);
  });

  it('min_cost_impact=none passes everything', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', cost_impact: 'none' }),
      makeCard({ article_id: 'b', cost_impact: 'low' }),
      makeCard({ article_id: 'c', cost_impact: 'medium' }),
      makeCard({ article_id: 'd', cost_impact: 'high' }),
    ]);
    const r = buildCardsResponse(snap, { ...DEFAULT_FILTER, min_cost_impact: 'none' });
    expect(r.cards.length).toBe(4);
  });
});

describe('buildCardsResponse: min_security_impact', () => {
  it('min_security_impact=high filters out everything below high', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', security_impact: 'none' }),
      makeCard({ article_id: 'b', security_impact: 'low' }),
      makeCard({ article_id: 'c', security_impact: 'medium' }),
      makeCard({ article_id: 'd', security_impact: 'high' }),
    ]);
    const r = buildCardsResponse(snap, { ...DEFAULT_FILTER, min_security_impact: 'high' });
    expect(r.cards.length).toBe(1);
    expect(r.cards[0].article_id).toBe('d');
  });
});

// ── buildCardsResponse: query filter ───────────────────────────────

describe('buildCardsResponse: query filter', () => {
  it('case-insensitive substring match on article_title', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', article_title: 'Anthropic releases Haiku 4.5' }),
      makeCard({ article_id: 'b', article_title: 'OpenAI ships new model' }),
    ]);
    const r = buildCardsResponse(snap, { ...DEFAULT_FILTER, query: 'haiku' });
    expect(r.cards.length).toBe(1);
    expect(r.cards[0].article_id).toBe('a');
  });

  it('case-insensitive substring match on article_source', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', article_title: 'foo', article_source: 'TechCrunch' }),
      makeCard({ article_id: 'b', article_title: 'foo', article_source: 'Hacker News' }),
    ]);
    const r = buildCardsResponse(snap, { ...DEFAULT_FILTER, query: 'TECHCRUNCH' });
    expect(r.cards.length).toBe(1);
    expect(r.cards[0].article_id).toBe('a');
  });

  it('matches when needle appears in either title or source', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', article_title: 'Has needle here', article_source: 'X' }),
      makeCard({ article_id: 'b', article_title: 'no match', article_source: 'Needle Co' }),
      makeCard({ article_id: 'c', article_title: 'nope', article_source: 'Other' }),
    ]);
    const r = buildCardsResponse(snap, { ...DEFAULT_FILTER, query: 'needle' });
    expect(r.cards.length).toBe(2);
    expect(r.cards.map((c) => c.article_id).sort()).toEqual(['a', 'b']);
  });
});

// ── buildCardsResponse: sort order ─────────────────────────────────

describe('buildCardsResponse: sort order', () => {
  it('cards sorted by urgency desc (immediate > this_week > fyi)', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'fyi-one', urgency: 'fyi' }),
      makeCard({ article_id: 'imm-one', urgency: 'immediate' }),
      makeCard({ article_id: 'wk-one', urgency: 'this_week' }),
    ]);
    const r = buildCardsResponse(snap, DEFAULT_FILTER);
    expect(r.cards.map((c) => c.article_id)).toEqual(['imm-one', 'wk-one', 'fyi-one']);
  });

  it('within same urgency, sorted by security_impact desc', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'sec-none', urgency: 'fyi', security_impact: 'none' }),
      makeCard({ article_id: 'sec-high', urgency: 'fyi', security_impact: 'high' }),
      makeCard({ article_id: 'sec-low', urgency: 'fyi', security_impact: 'low' }),
    ]);
    const r = buildCardsResponse(snap, DEFAULT_FILTER);
    expect(r.cards.map((c) => c.article_id)).toEqual(['sec-high', 'sec-low', 'sec-none']);
  });

  it('within same urgency and security_impact, sorted by cost_impact desc', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'cost-low', urgency: 'fyi', security_impact: 'none', cost_impact: 'low' }),
      makeCard({ article_id: 'cost-high', urgency: 'fyi', security_impact: 'none', cost_impact: 'high' }),
      makeCard({ article_id: 'cost-none', urgency: 'fyi', security_impact: 'none', cost_impact: 'none' }),
    ]);
    const r = buildCardsResponse(snap, DEFAULT_FILTER);
    expect(r.cards.map((c) => c.article_id)).toEqual(['cost-high', 'cost-low', 'cost-none']);
  });

  it('final tiebreaker: article_published_at desc', () => {
    const snap = makeSnapshot([
      makeCard({
        article_id: 'old',
        urgency: 'fyi',
        security_impact: 'none',
        cost_impact: 'none',
        article_published_at: '2026-01-01T00:00:00.000Z',
      }),
      makeCard({
        article_id: 'new',
        urgency: 'fyi',
        security_impact: 'none',
        cost_impact: 'none',
        article_published_at: '2026-05-24T00:00:00.000Z',
      }),
    ]);
    const r = buildCardsResponse(snap, DEFAULT_FILTER);
    expect(r.cards.map((c) => c.article_id)).toEqual(['new', 'old']);
  });
});

// ── buildCardsResponse: summary counts ─────────────────────────────

describe('buildCardsResponse: summary.by_capability', () => {
  it('counts all 8 capabilities with zeros for absent ones', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', affected_capability: 'model' }),
      makeCard({ article_id: 'b', affected_capability: 'model' }),
      makeCard({ article_id: 'c', affected_capability: 'pricing' }),
    ]);
    const r = buildCardsResponse(snap, DEFAULT_FILTER);
    expect(r.summary.by_capability.model).toBe(2);
    expect(r.summary.by_capability.pricing).toBe(1);
    expect(r.summary.by_capability.safety).toBe(0);
    expect(r.summary.by_capability.framework).toBe(0);
    expect(r.summary.by_capability.infrastructure).toBe(0);
    expect(r.summary.by_capability.tooling).toBe(0);
    expect(r.summary.by_capability.policy).toBe(0);
    expect(r.summary.by_capability.ecosystem).toBe(0);
  });
});

describe('buildCardsResponse: summary.by_urgency', () => {
  it('counts all 3 urgency levels', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', urgency: 'immediate' }),
      makeCard({ article_id: 'b', urgency: 'this_week' }),
      makeCard({ article_id: 'c', urgency: 'this_week' }),
      makeCard({ article_id: 'd', urgency: 'fyi' }),
    ]);
    const r = buildCardsResponse(snap, DEFAULT_FILTER);
    expect(r.summary.by_urgency).toEqual({ immediate: 1, this_week: 2, fyi: 1 });
  });
});

describe('buildCardsResponse: summary.by_cost_impact', () => {
  it('counts all 4 impact levels', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', cost_impact: 'none' }),
      makeCard({ article_id: 'b', cost_impact: 'low' }),
      makeCard({ article_id: 'c', cost_impact: 'medium' }),
      makeCard({ article_id: 'd', cost_impact: 'high' }),
      makeCard({ article_id: 'e', cost_impact: 'high' }),
    ]);
    const r = buildCardsResponse(snap, DEFAULT_FILTER);
    expect(r.summary.by_cost_impact).toEqual({ none: 1, low: 1, medium: 1, high: 2 });
  });
});

describe('buildCardsResponse: summary.by_security_impact', () => {
  it('counts all 4 impact levels', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', security_impact: 'none' }),
      makeCard({ article_id: 'b', security_impact: 'low' }),
      makeCard({ article_id: 'c', security_impact: 'medium' }),
      makeCard({ article_id: 'd', security_impact: 'high' }),
    ]);
    const r = buildCardsResponse(snap, DEFAULT_FILTER);
    expect(r.summary.by_security_impact).toEqual({ none: 1, low: 1, medium: 1, high: 1 });
  });
});

describe('buildCardsResponse: summary.cards_with_migration_recommendation', () => {
  it('counts cards whose migration_recommendation is non-null', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', migration_recommendation: 'Move to X' }),
      makeCard({ article_id: 'b', migration_recommendation: 'Move to Y' }),
      makeCard({ article_id: 'c', migration_recommendation: null }),
    ]);
    const r = buildCardsResponse(snap, DEFAULT_FILTER);
    expect(r.summary.cards_with_migration_recommendation).toBe(2);
  });

  it('returns 0 when all cards have null migration_recommendation', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', migration_recommendation: null }),
      makeCard({ article_id: 'b', migration_recommendation: null }),
    ]);
    const r = buildCardsResponse(snap, DEFAULT_FILTER);
    expect(r.summary.cards_with_migration_recommendation).toBe(0);
  });
});

// ── buildCardsResponse: cohort ─────────────────────────────────────

describe('buildCardsResponse: cohort', () => {
  it('articles_considered echoed from snapshot', () => {
    const snap = makeSnapshot([makeCard({ article_id: 'a' })], '2026-05-24T08:00:00.000Z', 42);
    const r = buildCardsResponse(snap, DEFAULT_FILTER);
    expect(r.cohort.articles_considered).toBe(42);
  });

  it('cards_in_snapshot = snapshot.cards.length (full, NOT filtered)', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', affected_capability: 'model' }),
      makeCard({ article_id: 'b', affected_capability: 'pricing' }),
      makeCard({ article_id: 'c', affected_capability: 'safety' }),
    ]);
    const r = buildCardsResponse(snap, { ...DEFAULT_FILTER, capability: 'model' });
    expect(r.cohort.cards_in_snapshot).toBe(3);
    expect(r.cohort.cards_filtered).toBe(1);
  });

  it('cards_filtered = filtered count', () => {
    const snap = makeSnapshot([
      makeCard({ article_id: 'a', urgency: 'immediate' }),
      makeCard({ article_id: 'b', urgency: 'fyi' }),
    ]);
    const r = buildCardsResponse(snap, { ...DEFAULT_FILTER, urgency: 'immediate' });
    expect(r.cohort.cards_filtered).toBe(1);
  });
});

// ── buildCardsResponse: filter echo ────────────────────────────────

describe('buildCardsResponse: filter echo', () => {
  it('returns the filter object as supplied', () => {
    const filter = {
      capability: 'model' as CapabilityTag,
      min_cost_impact: 'medium' as ImpactLevel,
      min_security_impact: 'low' as ImpactLevel,
      urgency: 'immediate' as UrgencyLevel,
      query: 'haiku',
    };
    const r = buildCardsResponse(makeSnapshot([]), filter);
    expect(r.filter).toEqual(filter);
  });
});

// ── buildCardsResponse: snapshot_captured_at ───────────────────────

describe('buildCardsResponse: snapshot_captured_at', () => {
  it('preserved from snapshot.capturedAt', () => {
    const snap = makeSnapshot([], '2026-04-01T00:00:00.000Z');
    const r = buildCardsResponse(snap, DEFAULT_FILTER);
    expect(r.snapshot_captured_at).toBe('2026-04-01T00:00:00.000Z');
  });
});

// ── buildCardsResponse: attribution ────────────────────────────────

describe('buildCardsResponse: attribution', () => {
  it('attribution.source mentions Haiku', () => {
    const r = buildCardsResponse(makeSnapshot([]), DEFAULT_FILTER);
    expect(r.attribution.source).toContain('Haiku');
  });

  it('attribution.notes mentions sort priority', () => {
    const r = buildCardsResponse(makeSnapshot([]), DEFAULT_FILTER);
    expect(r.attribution.notes.toLowerCase()).toContain('sort priority');
  });

  it('attribution.license present and non-empty', () => {
    const r = buildCardsResponse(makeSnapshot([]), DEFAULT_FILTER);
    expect(r.attribution.license.length).toBeGreaterThan(0);
  });
});
