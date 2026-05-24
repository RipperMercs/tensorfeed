import { describe, it, expect } from 'vitest';
import {
  parseTriageJson,
  selectTriageableIncidents,
} from './incident-triage-generator';
import type { Incident } from './status';

// ── factories ──────────────────────────────────────────────────────

function makeIncident(partial: Partial<Incident> & Pick<Incident, 'id'>): Incident {
  return {
    id: partial.id,
    service: partial.service ?? 'API',
    provider: partial.provider ?? 'OpenAI',
    severity: partial.severity ?? 'minor',
    title: partial.title ?? `Incident ${partial.id}`,
    startedAt: partial.startedAt ?? '2026-05-24T10:00:00.000Z',
    resolvedAt: partial.resolvedAt === undefined ? null : partial.resolvedAt,
    durationMinutes: partial.durationMinutes ?? null,
  };
}

const GENERATED_AT = '2026-05-24T12:00:00.000Z';

const VALID_TRIAGE_JSON = JSON.stringify({
  triage_summary: 'OpenAI API experiencing 5% elevated latency. No impact on Assistants.',
  impact_classification: 'minor',
  affected_capabilities: ['inference'],
  recommended_action: 'monitor',
});

// ── parseTriageJson: malformed input ───────────────────────────────

describe('parseTriageJson: malformed input', () => {
  it('returns null on "not json"', () => {
    const inc = makeIncident({ id: 'i1' });
    expect(parseTriageJson('not json', inc, GENERATED_AT)).toBeNull();
  });

  it('returns null on incomplete json "{"', () => {
    const inc = makeIncident({ id: 'i1' });
    expect(parseTriageJson('{', inc, GENERATED_AT)).toBeNull();
  });

  it('returns null on empty string', () => {
    const inc = makeIncident({ id: 'i1' });
    expect(parseTriageJson('', inc, GENERATED_AT)).toBeNull();
  });
});

// ── parseTriageJson: triage_summary validation ─────────────────────

describe('parseTriageJson: triage_summary', () => {
  it('returns null when triage_summary missing', () => {
    const raw = JSON.stringify({
      impact_classification: 'minor',
      affected_capabilities: ['inference'],
      recommended_action: 'monitor',
    });
    expect(parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT)).toBeNull();
  });

  it('returns null when triage_summary non-string', () => {
    const raw = JSON.stringify({
      triage_summary: 42,
      impact_classification: 'minor',
      affected_capabilities: ['inference'],
      recommended_action: 'monitor',
    });
    expect(parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT)).toBeNull();
  });

  it('returns null when triage_summary empty after trim', () => {
    const raw = JSON.stringify({
      triage_summary: '   ',
      impact_classification: 'minor',
      affected_capabilities: ['inference'],
      recommended_action: 'monitor',
    });
    expect(parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT)).toBeNull();
  });
});

// ── parseTriageJson: impact_classification validation ──────────────

describe('parseTriageJson: impact_classification', () => {
  it('returns null when impact_classification missing', () => {
    const raw = JSON.stringify({
      triage_summary: 'summary',
      affected_capabilities: ['inference'],
      recommended_action: 'monitor',
    });
    expect(parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT)).toBeNull();
  });

  it('returns null when impact_classification invalid (huge)', () => {
    const raw = JSON.stringify({
      triage_summary: 'summary',
      impact_classification: 'huge',
      affected_capabilities: ['inference'],
      recommended_action: 'monitor',
    });
    expect(parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT)).toBeNull();
  });
});

// ── parseTriageJson: recommended_action validation ─────────────────

describe('parseTriageJson: recommended_action', () => {
  it('returns null when recommended_action missing', () => {
    const raw = JSON.stringify({
      triage_summary: 'summary',
      impact_classification: 'minor',
      affected_capabilities: ['inference'],
    });
    expect(parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT)).toBeNull();
  });

  it('returns null when recommended_action invalid (panic)', () => {
    const raw = JSON.stringify({
      triage_summary: 'summary',
      impact_classification: 'minor',
      affected_capabilities: ['inference'],
      recommended_action: 'panic',
    });
    expect(parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT)).toBeNull();
  });
});

// ── parseTriageJson: happy path ────────────────────────────────────

describe('parseTriageJson: happy path', () => {
  it('returns IncidentTriageCard with all fields populated', () => {
    const inc = makeIncident({
      id: 'inc-1',
      provider: 'Anthropic',
      service: 'Claude API',
      title: 'Elevated errors on /v1/messages',
      severity: 'major',
      startedAt: '2026-05-24T08:00:00.000Z',
      resolvedAt: null,
    });
    const card = parseTriageJson(VALID_TRIAGE_JSON, inc, GENERATED_AT);
    expect(card).not.toBeNull();
    if (!card) return;
    expect(card.incident_id).toBe('inc-1');
    expect(card.provider).toBe('Anthropic');
    expect(card.service).toBe('Claude API');
    expect(card.title).toBe('Elevated errors on /v1/messages');
    expect(card.severity).toBe('major');
    expect(card.started_at).toBe('2026-05-24T08:00:00.000Z');
    expect(card.resolved_at).toBeNull();
    expect(card.ongoing).toBe(true);
    expect(card.triage_summary).toBe(
      'OpenAI API experiencing 5% elevated latency. No impact on Assistants.',
    );
    expect(card.impact_classification).toBe('minor');
    expect(card.affected_capabilities).toEqual(['inference']);
    expect(card.recommended_action).toBe('monitor');
    expect(card.generated_at).toBe(GENERATED_AT);
  });
});

// ── parseTriageJson: markdown fence stripping ──────────────────────

describe('parseTriageJson: markdown fence stripping', () => {
  it('strips ```json fences before parsing', () => {
    const wrapped = '```json\n' + VALID_TRIAGE_JSON + '\n```';
    const card = parseTriageJson(wrapped, makeIncident({ id: 'i1' }), GENERATED_AT);
    expect(card).not.toBeNull();
    expect(card?.impact_classification).toBe('minor');
  });

  it('strips plain ``` fences before parsing', () => {
    const wrapped = '```\n' + VALID_TRIAGE_JSON + '\n```';
    const card = parseTriageJson(wrapped, makeIncident({ id: 'i1' }), GENERATED_AT);
    expect(card).not.toBeNull();
    expect(card?.recommended_action).toBe('monitor');
  });
});

// ── parseTriageJson: case-insensitive enums ────────────────────────

describe('parseTriageJson: case-insensitive enums', () => {
  it('lowercases impact_classification "Critical" → "critical"', () => {
    const raw = JSON.stringify({
      triage_summary: 'summary',
      impact_classification: 'Critical',
      affected_capabilities: ['inference'],
      recommended_action: 'monitor',
    });
    const card = parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT);
    expect(card?.impact_classification).toBe('critical');
  });

  it('lowercases recommended_action "ESCALATE" → "escalate"', () => {
    const raw = JSON.stringify({
      triage_summary: 'summary',
      impact_classification: 'critical',
      affected_capabilities: ['inference'],
      recommended_action: 'ESCALATE',
    });
    const card = parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT);
    expect(card?.recommended_action).toBe('escalate');
  });
});

// ── parseTriageJson: affected_capabilities normalization ───────────

describe('parseTriageJson: affected_capabilities', () => {
  it('filters out non-string entries', () => {
    const raw = JSON.stringify({
      triage_summary: 'summary',
      impact_classification: 'minor',
      affected_capabilities: ['inference', 42, null, 'console'],
      recommended_action: 'monitor',
    });
    const card = parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT);
    expect(card?.affected_capabilities).toEqual(['inference', 'console']);
  });

  it('filters out capabilities not in the allowed enum', () => {
    const raw = JSON.stringify({
      triage_summary: 'summary',
      impact_classification: 'minor',
      affected_capabilities: ['random', 'memes', 'inference'],
      recommended_action: 'monitor',
    });
    const card = parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT);
    expect(card?.affected_capabilities).toEqual(['inference']);
  });

  it('case-insensitive: "Inference" → "inference"', () => {
    const raw = JSON.stringify({
      triage_summary: 'summary',
      impact_classification: 'minor',
      affected_capabilities: ['Inference', 'CONSOLE'],
      recommended_action: 'monitor',
    });
    const card = parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT);
    expect(card?.affected_capabilities).toEqual(['inference', 'console']);
  });

  it('defaults to ["inference"] when the parsed array is empty', () => {
    const raw = JSON.stringify({
      triage_summary: 'summary',
      impact_classification: 'minor',
      affected_capabilities: [],
      recommended_action: 'monitor',
    });
    const card = parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT);
    expect(card?.affected_capabilities).toEqual(['inference']);
  });

  it('defaults to ["inference"] when affected_capabilities is missing', () => {
    const raw = JSON.stringify({
      triage_summary: 'summary',
      impact_classification: 'minor',
      recommended_action: 'monitor',
    });
    const card = parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT);
    expect(card?.affected_capabilities).toEqual(['inference']);
  });

  it('defaults to ["inference"] when affected_capabilities is not an array', () => {
    const raw = JSON.stringify({
      triage_summary: 'summary',
      impact_classification: 'minor',
      affected_capabilities: 'inference',
      recommended_action: 'monitor',
    });
    const card = parseTriageJson(raw, makeIncident({ id: 'i1' }), GENERATED_AT);
    expect(card?.affected_capabilities).toEqual(['inference']);
  });
});

// ── parseTriageJson: ongoing flag ──────────────────────────────────

describe('parseTriageJson: ongoing flag', () => {
  it('ongoing=true when incident.resolvedAt is null', () => {
    const inc = makeIncident({ id: 'i1', resolvedAt: null });
    const card = parseTriageJson(VALID_TRIAGE_JSON, inc, GENERATED_AT);
    expect(card?.ongoing).toBe(true);
    expect(card?.resolved_at).toBeNull();
  });

  it('ongoing=false when incident.resolvedAt is non-null', () => {
    const inc = makeIncident({ id: 'i1', resolvedAt: '2026-05-24T11:00:00.000Z' });
    const card = parseTriageJson(VALID_TRIAGE_JSON, inc, GENERATED_AT);
    expect(card?.ongoing).toBe(false);
    expect(card?.resolved_at).toBe('2026-05-24T11:00:00.000Z');
  });
});

// ── parseTriageJson: input field passthrough ───────────────────────

describe('parseTriageJson: input field passthrough', () => {
  it('passes incident_id, provider, service, title, severity, started_at, resolved_at from input', () => {
    const inc = makeIncident({
      id: 'pass-1',
      provider: 'Google',
      service: 'Gemini API',
      title: 'Investigating elevated 5xx',
      severity: 'critical',
      startedAt: '2026-05-20T05:00:00.000Z',
      resolvedAt: '2026-05-20T06:00:00.000Z',
    });
    const card = parseTriageJson(VALID_TRIAGE_JSON, inc, GENERATED_AT);
    expect(card?.incident_id).toBe('pass-1');
    expect(card?.provider).toBe('Google');
    expect(card?.service).toBe('Gemini API');
    expect(card?.title).toBe('Investigating elevated 5xx');
    expect(card?.severity).toBe('critical');
    expect(card?.started_at).toBe('2026-05-20T05:00:00.000Z');
    expect(card?.resolved_at).toBe('2026-05-20T06:00:00.000Z');
  });

  it('sets generated_at to the value passed in', () => {
    const passedIn = '2030-01-01T00:00:00.000Z';
    const card = parseTriageJson(VALID_TRIAGE_JSON, makeIncident({ id: 'i1' }), passedIn);
    expect(card?.generated_at).toBe(passedIn);
  });
});

// ── selectTriageableIncidents ──────────────────────────────────────

const REFERENCE_NOW = new Date('2026-05-24T12:00:00Z');

describe('selectTriageableIncidents', () => {
  it('empty input returns empty output', () => {
    expect(selectTriageableIncidents([], REFERENCE_NOW)).toEqual([]);
  });

  it('ongoing incidents (resolvedAt=null) always included', () => {
    const incs = [
      makeIncident({ id: 'a', resolvedAt: null, startedAt: '2026-05-24T11:00:00.000Z' }),
      makeIncident({ id: 'b', resolvedAt: null, startedAt: '2026-05-24T10:00:00.000Z' }),
    ];
    const out = selectTriageableIncidents(incs, REFERENCE_NOW);
    expect(out.map((i) => i.id).sort()).toEqual(['a', 'b']);
  });

  it('resolved incidents within default 24h lookback included', () => {
    const incs = [
      makeIncident({
        id: 'a',
        startedAt: '2026-05-24T05:00:00.000Z',
        resolvedAt: '2026-05-24T06:00:00.000Z',
      }),
    ];
    const out = selectTriageableIncidents(incs, REFERENCE_NOW);
    expect(out.map((i) => i.id)).toEqual(['a']);
  });

  it('resolved incidents older than lookback excluded', () => {
    const incs = [
      // resolved 48h ago, well outside 24h window
      makeIncident({
        id: 'old',
        startedAt: '2026-05-22T05:00:00.000Z',
        resolvedAt: '2026-05-22T06:00:00.000Z',
      }),
      // resolved 2h ago, inside window
      makeIncident({
        id: 'fresh',
        startedAt: '2026-05-24T09:00:00.000Z',
        resolvedAt: '2026-05-24T10:00:00.000Z',
      }),
    ];
    const out = selectTriageableIncidents(incs, REFERENCE_NOW);
    expect(out.map((i) => i.id)).toEqual(['fresh']);
  });

  it('ongoing incidents sorted to top of returned list', () => {
    const incs = [
      makeIncident({
        id: 'resolved-recent',
        startedAt: '2026-05-24T11:00:00.000Z',
        resolvedAt: '2026-05-24T11:30:00.000Z',
      }),
      makeIncident({
        id: 'ongoing-old',
        startedAt: '2026-05-24T08:00:00.000Z',
        resolvedAt: null,
      }),
    ];
    const out = selectTriageableIncidents(incs, REFERENCE_NOW);
    expect(out.map((i) => i.id)).toEqual(['ongoing-old', 'resolved-recent']);
  });

  it('among resolved, sorted by startedAt desc', () => {
    const incs = [
      makeIncident({
        id: 'old',
        startedAt: '2026-05-24T03:00:00.000Z',
        resolvedAt: '2026-05-24T04:00:00.000Z',
      }),
      makeIncident({
        id: 'newest',
        startedAt: '2026-05-24T11:00:00.000Z',
        resolvedAt: '2026-05-24T11:30:00.000Z',
      }),
      makeIncident({
        id: 'middle',
        startedAt: '2026-05-24T08:00:00.000Z',
        resolvedAt: '2026-05-24T09:00:00.000Z',
      }),
    ];
    const out = selectTriageableIncidents(incs, REFERENCE_NOW);
    expect(out.map((i) => i.id)).toEqual(['newest', 'middle', 'old']);
  });

  it('among ongoing, sorted by startedAt desc', () => {
    const incs = [
      makeIncident({ id: 'old', startedAt: '2026-05-23T01:00:00.000Z', resolvedAt: null }),
      makeIncident({ id: 'newest', startedAt: '2026-05-24T11:00:00.000Z', resolvedAt: null }),
      makeIncident({ id: 'middle', startedAt: '2026-05-24T05:00:00.000Z', resolvedAt: null }),
    ];
    const out = selectTriageableIncidents(incs, REFERENCE_NOW);
    expect(out.map((i) => i.id)).toEqual(['newest', 'middle', 'old']);
  });

  it('limit caps return list', () => {
    const incs = [
      makeIncident({ id: 'a', resolvedAt: null, startedAt: '2026-05-24T11:00:00.000Z' }),
      makeIncident({ id: 'b', resolvedAt: null, startedAt: '2026-05-24T10:00:00.000Z' }),
      makeIncident({ id: 'c', resolvedAt: null, startedAt: '2026-05-24T09:00:00.000Z' }),
      makeIncident({ id: 'd', resolvedAt: null, startedAt: '2026-05-24T08:00:00.000Z' }),
    ];
    const out = selectTriageableIncidents(incs, REFERENCE_NOW, 24, 2);
    expect(out).toHaveLength(2);
    expect(out.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('custom lookbackHours respected', () => {
    const incs = [
      // resolved 5h ago — outside 1h window, inside 24h default
      makeIncident({
        id: 'a',
        startedAt: '2026-05-24T06:00:00.000Z',
        resolvedAt: '2026-05-24T07:00:00.000Z',
      }),
      // resolved 30min ago — inside 1h window
      makeIncident({
        id: 'b',
        startedAt: '2026-05-24T11:00:00.000Z',
        resolvedAt: '2026-05-24T11:30:00.000Z',
      }),
    ];
    const out = selectTriageableIncidents(incs, REFERENCE_NOW, 1);
    expect(out.map((i) => i.id)).toEqual(['b']);
  });

  it('resolved with unparseable resolvedAt is excluded (Number.isFinite guard)', () => {
    const incs = [
      makeIncident({
        id: 'bad',
        startedAt: '2026-05-24T05:00:00.000Z',
        resolvedAt: 'not-a-date',
      }),
      makeIncident({
        id: 'good',
        startedAt: '2026-05-24T08:00:00.000Z',
        resolvedAt: '2026-05-24T09:00:00.000Z',
      }),
    ];
    const out = selectTriageableIncidents(incs, REFERENCE_NOW);
    expect(out.map((i) => i.id)).toEqual(['good']);
  });
});
