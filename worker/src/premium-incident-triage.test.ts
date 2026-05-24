import { describe, it, expect } from 'vitest';
import {
  parseProvider,
  parseImpact,
  parseRecommendedAction,
  parseCapability,
  parseOngoingOnly,
  buildTriageResponse,
} from './premium-incident-triage';
import type {
  IncidentTriageSnapshot,
  IncidentTriageCard,
  ImpactClassification,
  RecommendedAction,
  AffectedCapability,
} from './incident-triage-generator';

// ── factories ──────────────────────────────────────────────────────

function makeCard(
  partial: Partial<IncidentTriageCard> & Pick<IncidentTriageCard, 'incident_id'>,
): IncidentTriageCard {
  return {
    incident_id: partial.incident_id,
    provider: partial.provider ?? 'OpenAI',
    service: partial.service ?? 'API',
    title: partial.title ?? `Incident ${partial.incident_id}`,
    severity: partial.severity ?? 'minor',
    started_at: partial.started_at ?? '2026-05-24T08:00:00.000Z',
    resolved_at: partial.resolved_at === undefined ? null : partial.resolved_at,
    ongoing: partial.ongoing ?? (partial.resolved_at == null),
    triage_summary: partial.triage_summary ?? 'Summary text.',
    impact_classification: partial.impact_classification ?? 'minor',
    affected_capabilities: partial.affected_capabilities ?? ['inference'],
    recommended_action: partial.recommended_action ?? 'monitor',
    generated_at: partial.generated_at ?? '2026-05-24T09:00:00.000Z',
  };
}

function makeSnapshot(
  cards: IncidentTriageCard[],
  capturedAt = '2026-05-24T09:00:00.000Z',
  incidents_considered = cards.length,
): IncidentTriageSnapshot {
  const ongoing = cards.filter((c) => c.ongoing).length;
  return {
    capturedAt,
    source: 'tensorfeed.ai status incidents + Claude Haiku 4.5',
    model: 'claude-haiku-4-5-20251001',
    incidents_considered,
    incidents_succeeded: cards.length,
    incidents_failed: 0,
    ongoing_count: ongoing,
    resolved_count: cards.length - ongoing,
    cards,
  };
}

const DEFAULT_FILTER = {
  provider: null as string | null,
  impact: null as ImpactClassification | null,
  recommended_action: null as RecommendedAction | null,
  capability: null as AffectedCapability | null,
  ongoing_only: false,
};

// ── parseProvider ──────────────────────────────────────────────────

describe('parseProvider', () => {
  it('returns null on null', () => {
    expect(parseProvider(null)).toBeNull();
  });

  it('returns null on whitespace', () => {
    expect(parseProvider('   ')).toBeNull();
  });

  it('returns null on empty string', () => {
    expect(parseProvider('')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parseProvider('  OpenAI  ')).toBe('OpenAI');
  });

  it('returns the value as-is when no whitespace', () => {
    expect(parseProvider('Anthropic')).toBe('Anthropic');
  });
});

// ── parseImpact ────────────────────────────────────────────────────

describe('parseImpact', () => {
  it('returns null on null', () => {
    expect(parseImpact(null)).toBeNull();
  });

  it('returns null on invalid level', () => {
    expect(parseImpact('apocalyptic')).toBeNull();
  });

  it('lowercases "Critical" → "critical"', () => {
    expect(parseImpact('Critical')).toBe('critical');
  });

  it('accepts all four valid impact levels', () => {
    for (const lvl of ['informational', 'minor', 'major', 'critical']) {
      expect(parseImpact(lvl)).toBe(lvl);
    }
  });

  it('trims surrounding whitespace', () => {
    expect(parseImpact('  major  ')).toBe('major');
  });
});

// ── parseRecommendedAction ─────────────────────────────────────────

describe('parseRecommendedAction', () => {
  it('returns null on null', () => {
    expect(parseRecommendedAction(null)).toBeNull();
  });

  it('returns null on invalid action', () => {
    expect(parseRecommendedAction('panic')).toBeNull();
  });

  it('lowercases "ESCALATE" → "escalate"', () => {
    expect(parseRecommendedAction('ESCALATE')).toBe('escalate');
  });

  it('accepts all five valid recommended actions', () => {
    for (const act of ['no_action', 'monitor', 'retry_later', 'failover_now', 'escalate']) {
      expect(parseRecommendedAction(act)).toBe(act);
    }
  });
});

// ── parseCapability ────────────────────────────────────────────────

describe('parseCapability', () => {
  it('returns null on null', () => {
    expect(parseCapability(null)).toBeNull();
  });

  it('returns null on invalid capability', () => {
    expect(parseCapability('memes')).toBeNull();
  });

  it('lowercases "Inference" → "inference"', () => {
    expect(parseCapability('Inference')).toBe('inference');
  });

  it('accepts all eight valid capabilities', () => {
    for (const cap of [
      'inference', 'training', 'embeddings', 'console', 'billing', 'fine-tuning', 'api-keys', 'tooling',
    ]) {
      expect(parseCapability(cap)).toBe(cap);
    }
  });

  it('accepts "fine-tuning" with hyphen', () => {
    expect(parseCapability('fine-tuning')).toBe('fine-tuning');
  });
});

// ── parseOngoingOnly ───────────────────────────────────────────────

describe('parseOngoingOnly', () => {
  it('returns false on null', () => {
    expect(parseOngoingOnly(null)).toBe(false);
  });

  it('returns true on "1"', () => {
    expect(parseOngoingOnly('1')).toBe(true);
  });

  it('returns true on "true"', () => {
    expect(parseOngoingOnly('true')).toBe(true);
  });

  it('returns true on "TRUE" (case-insensitive)', () => {
    expect(parseOngoingOnly('TRUE')).toBe(true);
  });

  it('returns true on "yes"', () => {
    expect(parseOngoingOnly('yes')).toBe(true);
  });

  it('returns true on "Yes" (case-insensitive)', () => {
    expect(parseOngoingOnly('Yes')).toBe(true);
  });

  it('returns false on "0"', () => {
    expect(parseOngoingOnly('0')).toBe(false);
  });

  it('returns false on "false"', () => {
    expect(parseOngoingOnly('false')).toBe(false);
  });

  it('returns false on arbitrary string', () => {
    expect(parseOngoingOnly('maybe')).toBe(false);
  });
});

// ── buildTriageResponse: empty snapshot ────────────────────────────

describe('buildTriageResponse: empty snapshot', () => {
  it('returns ok=true with empty cards', () => {
    const r = buildTriageResponse(makeSnapshot([]), DEFAULT_FILTER);
    expect(r.ok).toBe(true);
    expect(r.cards).toEqual([]);
  });

  it('summary zero-initialized across all keys', () => {
    const r = buildTriageResponse(makeSnapshot([]), DEFAULT_FILTER);
    expect(r.summary.by_impact).toEqual({
      informational: 0, minor: 0, major: 0, critical: 0,
    });
    expect(r.summary.by_recommended_action).toEqual({
      no_action: 0, monitor: 0, retry_later: 0, failover_now: 0, escalate: 0,
    });
    expect(r.summary.by_capability).toEqual({
      inference: 0, training: 0, embeddings: 0, console: 0, billing: 0,
      'fine-tuning': 0, 'api-keys': 0, tooling: 0,
    });
    expect(r.summary.cards_with_failover_action).toBe(0);
    expect(r.summary.by_provider).toEqual({});
  });
});

// ── buildTriageResponse: provider filter ───────────────────────────

describe('buildTriageResponse: provider filter', () => {
  it('substring case-insensitive match', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', provider: 'Anthropic' }),
      makeCard({ incident_id: 'b', provider: 'OpenAI' }),
      makeCard({ incident_id: 'c', provider: 'Google' }),
    ]);
    const r = buildTriageResponse(snap, { ...DEFAULT_FILTER, provider: 'OPEN' });
    expect(r.cards.length).toBe(1);
    expect(r.cards[0].incident_id).toBe('b');
  });

  it('substring matches partial name', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', provider: 'Anthropic' }),
      makeCard({ incident_id: 'b', provider: 'OpenAI' }),
    ]);
    const r = buildTriageResponse(snap, { ...DEFAULT_FILTER, provider: 'thro' });
    expect(r.cards.length).toBe(1);
    expect(r.cards[0].incident_id).toBe('a');
  });
});

// ── buildTriageResponse: impact filter ─────────────────────────────

describe('buildTriageResponse: impact filter', () => {
  it('exact match on impact_classification', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', impact_classification: 'critical' }),
      makeCard({ incident_id: 'b', impact_classification: 'major' }),
      makeCard({ incident_id: 'c', impact_classification: 'minor' }),
    ]);
    const r = buildTriageResponse(snap, { ...DEFAULT_FILTER, impact: 'critical' });
    expect(r.cards.length).toBe(1);
    expect(r.cards[0].incident_id).toBe('a');
  });
});

// ── buildTriageResponse: recommended_action filter ─────────────────

describe('buildTriageResponse: recommended_action filter', () => {
  it('exact match on recommended_action', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', recommended_action: 'escalate' }),
      makeCard({ incident_id: 'b', recommended_action: 'monitor' }),
      makeCard({ incident_id: 'c', recommended_action: 'no_action' }),
    ]);
    const r = buildTriageResponse(snap, { ...DEFAULT_FILTER, recommended_action: 'escalate' });
    expect(r.cards.length).toBe(1);
    expect(r.cards[0].incident_id).toBe('a');
  });
});

// ── buildTriageResponse: capability filter ─────────────────────────

describe('buildTriageResponse: capability filter', () => {
  it('card matches when affected_capabilities INCLUDES the value', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', affected_capabilities: ['inference', 'console'] }),
      makeCard({ incident_id: 'b', affected_capabilities: ['billing'] }),
      makeCard({ incident_id: 'c', affected_capabilities: ['inference'] }),
    ]);
    const r = buildTriageResponse(snap, { ...DEFAULT_FILTER, capability: 'inference' });
    const ids = r.cards.map((c) => c.incident_id).sort();
    expect(ids).toEqual(['a', 'c']);
  });

  it('excludes cards without the requested capability', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', affected_capabilities: ['inference'] }),
      makeCard({ incident_id: 'b', affected_capabilities: ['inference', 'training'] }),
    ]);
    const r = buildTriageResponse(snap, { ...DEFAULT_FILTER, capability: 'training' });
    expect(r.cards.length).toBe(1);
    expect(r.cards[0].incident_id).toBe('b');
  });
});

// ── buildTriageResponse: ongoing_only filter ───────────────────────

describe('buildTriageResponse: ongoing_only filter', () => {
  it('ongoing_only=true filters out resolved cards', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', ongoing: true, resolved_at: null }),
      makeCard({ incident_id: 'b', ongoing: false, resolved_at: '2026-05-24T10:00:00.000Z' }),
      makeCard({ incident_id: 'c', ongoing: true, resolved_at: null }),
    ]);
    const r = buildTriageResponse(snap, { ...DEFAULT_FILTER, ongoing_only: true });
    const ids = r.cards.map((c) => c.incident_id).sort();
    expect(ids).toEqual(['a', 'c']);
  });

  it('ongoing_only=false keeps both ongoing and resolved', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', ongoing: true, resolved_at: null }),
      makeCard({ incident_id: 'b', ongoing: false, resolved_at: '2026-05-24T10:00:00.000Z' }),
    ]);
    const r = buildTriageResponse(snap, { ...DEFAULT_FILTER, ongoing_only: false });
    expect(r.cards.length).toBe(2);
  });
});

// ── buildTriageResponse: sort order ────────────────────────────────

describe('buildTriageResponse: sort order', () => {
  it('cards sorted by impact desc (critical > major > minor > informational)', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'info', impact_classification: 'informational' }),
      makeCard({ incident_id: 'crit', impact_classification: 'critical' }),
      makeCard({ incident_id: 'maj', impact_classification: 'major' }),
      makeCard({ incident_id: 'min', impact_classification: 'minor' }),
    ]);
    const r = buildTriageResponse(snap, DEFAULT_FILTER);
    expect(r.cards.map((c) => c.incident_id)).toEqual(['crit', 'maj', 'min', 'info']);
  });

  it('within same impact, sorted by action desc (escalate > failover_now > retry_later > monitor > no_action)', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'noact', impact_classification: 'major', recommended_action: 'no_action' }),
      makeCard({ incident_id: 'esc', impact_classification: 'major', recommended_action: 'escalate' }),
      makeCard({ incident_id: 'fail', impact_classification: 'major', recommended_action: 'failover_now' }),
      makeCard({ incident_id: 'retry', impact_classification: 'major', recommended_action: 'retry_later' }),
      makeCard({ incident_id: 'mon', impact_classification: 'major', recommended_action: 'monitor' }),
    ]);
    const r = buildTriageResponse(snap, DEFAULT_FILTER);
    expect(r.cards.map((c) => c.incident_id)).toEqual(['esc', 'fail', 'retry', 'mon', 'noact']);
  });

  it('final tiebreaker: started_at desc', () => {
    const snap = makeSnapshot([
      makeCard({
        incident_id: 'old',
        impact_classification: 'minor',
        recommended_action: 'monitor',
        started_at: '2026-01-01T00:00:00.000Z',
      }),
      makeCard({
        incident_id: 'new',
        impact_classification: 'minor',
        recommended_action: 'monitor',
        started_at: '2026-05-24T08:00:00.000Z',
      }),
    ]);
    const r = buildTriageResponse(snap, DEFAULT_FILTER);
    expect(r.cards.map((c) => c.incident_id)).toEqual(['new', 'old']);
  });
});

// ── buildTriageResponse: summary counts ────────────────────────────

describe('buildTriageResponse: summary.by_provider', () => {
  it('counts each provider', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', provider: 'OpenAI' }),
      makeCard({ incident_id: 'b', provider: 'OpenAI' }),
      makeCard({ incident_id: 'c', provider: 'Anthropic' }),
    ]);
    const r = buildTriageResponse(snap, DEFAULT_FILTER);
    expect(r.summary.by_provider).toEqual({ OpenAI: 2, Anthropic: 1 });
  });
});

describe('buildTriageResponse: summary.by_impact', () => {
  it('has all 4 keys initialized; counts present impacts', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', impact_classification: 'critical' }),
      makeCard({ incident_id: 'b', impact_classification: 'major' }),
      makeCard({ incident_id: 'c', impact_classification: 'major' }),
    ]);
    const r = buildTriageResponse(snap, DEFAULT_FILTER);
    expect(r.summary.by_impact).toEqual({
      informational: 0, minor: 0, major: 2, critical: 1,
    });
  });
});

describe('buildTriageResponse: summary.by_recommended_action', () => {
  it('has all 5 keys initialized; counts present actions', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', recommended_action: 'escalate' }),
      makeCard({ incident_id: 'b', recommended_action: 'failover_now' }),
      makeCard({ incident_id: 'c', recommended_action: 'monitor' }),
    ]);
    const r = buildTriageResponse(snap, DEFAULT_FILTER);
    expect(r.summary.by_recommended_action).toEqual({
      no_action: 0, monitor: 1, retry_later: 0, failover_now: 1, escalate: 1,
    });
  });
});

describe('buildTriageResponse: summary.by_capability', () => {
  it('has all 8 keys initialized', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', affected_capabilities: ['inference'] }),
    ]);
    const r = buildTriageResponse(snap, DEFAULT_FILTER);
    expect(Object.keys(r.summary.by_capability).sort()).toEqual(
      ['api-keys', 'billing', 'console', 'embeddings', 'fine-tuning', 'inference', 'tooling', 'training'],
    );
  });

  it('a card with multiple affected_capabilities increments multiple keys', () => {
    const snap = makeSnapshot([
      makeCard({
        incident_id: 'a',
        affected_capabilities: ['inference', 'console', 'billing'],
      }),
      makeCard({ incident_id: 'b', affected_capabilities: ['inference'] }),
    ]);
    const r = buildTriageResponse(snap, DEFAULT_FILTER);
    expect(r.summary.by_capability.inference).toBe(2);
    expect(r.summary.by_capability.console).toBe(1);
    expect(r.summary.by_capability.billing).toBe(1);
    expect(r.summary.by_capability.training).toBe(0);
  });
});

describe('buildTriageResponse: summary.cards_with_failover_action', () => {
  it('counts cards with action=failover_now OR escalate', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', recommended_action: 'failover_now' }),
      makeCard({ incident_id: 'b', recommended_action: 'escalate' }),
      makeCard({ incident_id: 'c', recommended_action: 'monitor' }),
      makeCard({ incident_id: 'd', recommended_action: 'no_action' }),
    ]);
    const r = buildTriageResponse(snap, DEFAULT_FILTER);
    expect(r.summary.cards_with_failover_action).toBe(2);
  });

  it('returns 0 when no card has failover_now or escalate', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', recommended_action: 'monitor' }),
      makeCard({ incident_id: 'b', recommended_action: 'no_action' }),
    ]);
    const r = buildTriageResponse(snap, DEFAULT_FILTER);
    expect(r.summary.cards_with_failover_action).toBe(0);
  });
});

// ── buildTriageResponse: cohort ────────────────────────────────────

describe('buildTriageResponse: cohort', () => {
  it('cards_in_snapshot = snapshot.cards.length (full, unfiltered)', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', impact_classification: 'critical' }),
      makeCard({ incident_id: 'b', impact_classification: 'minor' }),
      makeCard({ incident_id: 'c', impact_classification: 'minor' }),
    ]);
    const r = buildTriageResponse(snap, { ...DEFAULT_FILTER, impact: 'critical' });
    expect(r.cohort.cards_in_snapshot).toBe(3);
    expect(r.cohort.cards_filtered).toBe(1);
  });

  it('cards_filtered = filtered count', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', recommended_action: 'escalate' }),
      makeCard({ incident_id: 'b', recommended_action: 'monitor' }),
    ]);
    const r = buildTriageResponse(snap, { ...DEFAULT_FILTER, recommended_action: 'escalate' });
    expect(r.cohort.cards_filtered).toBe(1);
  });

  it('ongoing_in_filtered counts cards where ongoing=true in filtered set', () => {
    const snap = makeSnapshot([
      makeCard({ incident_id: 'a', ongoing: true, resolved_at: null, impact_classification: 'critical' }),
      makeCard({ incident_id: 'b', ongoing: false, resolved_at: '2026-05-24T10:00:00.000Z', impact_classification: 'critical' }),
      makeCard({ incident_id: 'c', ongoing: true, resolved_at: null, impact_classification: 'minor' }),
    ]);
    const r = buildTriageResponse(snap, { ...DEFAULT_FILTER, impact: 'critical' });
    expect(r.cohort.cards_filtered).toBe(2);
    expect(r.cohort.ongoing_in_filtered).toBe(1);
  });

  it('incidents_considered echoed from snapshot', () => {
    const snap = makeSnapshot([makeCard({ incident_id: 'a' })], '2026-05-24T09:00:00.000Z', 17);
    const r = buildTriageResponse(snap, DEFAULT_FILTER);
    expect(r.cohort.incidents_considered).toBe(17);
  });
});

// ── buildTriageResponse: filter echo ───────────────────────────────

describe('buildTriageResponse: filter echo', () => {
  it('returns the filter object as supplied', () => {
    const filter = {
      provider: 'OpenAI',
      impact: 'critical' as ImpactClassification,
      recommended_action: 'escalate' as RecommendedAction,
      capability: 'inference' as AffectedCapability,
      ongoing_only: true,
    };
    const r = buildTriageResponse(makeSnapshot([]), filter);
    expect(r.filter).toEqual(filter);
  });
});

// ── buildTriageResponse: snapshot_captured_at ──────────────────────

describe('buildTriageResponse: snapshot_captured_at', () => {
  it('preserved from snapshot.capturedAt', () => {
    const snap = makeSnapshot([], '2026-04-01T00:00:00.000Z');
    const r = buildTriageResponse(snap, DEFAULT_FILTER);
    expect(r.snapshot_captured_at).toBe('2026-04-01T00:00:00.000Z');
  });
});

// ── buildTriageResponse: attribution ───────────────────────────────

describe('buildTriageResponse: attribution', () => {
  it('attribution.source mentions Haiku', () => {
    const r = buildTriageResponse(makeSnapshot([]), DEFAULT_FILTER);
    expect(r.attribution.source).toContain('Haiku');
  });

  it('attribution.notes mentions sort priority', () => {
    const r = buildTriageResponse(makeSnapshot([]), DEFAULT_FILTER);
    expect(r.attribution.notes.toLowerCase()).toContain('sort priority');
  });

  it('attribution.notes mentions cache TTL', () => {
    const r = buildTriageResponse(makeSnapshot([]), DEFAULT_FILTER);
    expect(r.attribution.notes.toLowerCase()).toContain('ttl');
  });

  it('attribution.license present and non-empty', () => {
    const r = buildTriageResponse(makeSnapshot([]), DEFAULT_FILTER);
    expect(r.attribution.license.length).toBeGreaterThan(0);
  });
});
