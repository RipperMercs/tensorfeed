import { describe, it, expect } from 'vitest';
import { normalizeAvidEntry } from './avid-fetcher';

// ── normalizeAvidEntry ─────────────────────────────────────────────

describe('normalizeAvidEntry', () => {
  it('returns null when metadata is entirely missing', () => {
    expect(normalizeAvidEntry({})).toBeNull();
  });

  it('returns null when metadata.report_id is missing', () => {
    expect(normalizeAvidEntry({ metadata: {} })).toBeNull();
  });

  it('returns null when metadata.report_id is an empty string', () => {
    expect(normalizeAvidEntry({ metadata: { report_id: '' } })).toBeNull();
  });

  it('returns null when metadata.report_id is a non-string value', () => {
    // Force-cast through unknown to test the runtime guard against bad upstream data.
    const bad = { metadata: { report_id: 123 } } as unknown as Parameters<typeof normalizeAvidEntry>[0];
    expect(normalizeAvidEntry(bad)).toBeNull();
  });

  it('happy-path: maps a fully-populated AVID entry verbatim', () => {
    const raw = {
      data_type: 'AVID',
      data_version: '0.3.3',
      metadata: { report_id: 'AVID-2025-R0035' },
      affects: {
        developer: ['OpenAI'],
        deployer: ['Microsoft', 'GitHub'],
        artifacts: [
          { type: 'Model', name: 'gpt-4' },
          { type: 'System', name: 'Copilot' },
        ],
      },
      problemtype: {
        classof: 'LLM Evaluation',
        type: 'Detection',
        description: { lang: 'eng', value: 'fallback description from problemtype' },
      },
      metrics: [
        { scorer: 'HELM', metrics: 'toxicity', value: 0.42 },
      ],
      references: [
        { type: 'source', label: 'paper', url: 'https://arxiv.org/abs/0001.00001' },
      ],
      description: { lang: 'eng', value: 'top-level description wins' },
      impact: {
        avid: {
          vuln_id: 'V-001',
          risk_domain: ['Security', 'Ethics'],
          sep_view: ['S0100', 'E0200'],
          lifecycle_view: ['L01:Procurement'],
          taxonomy_version: '0.2',
        },
      },
      credit: [{ lang: 'eng', value: 'Jane Researcher' }],
      reported_date: '2025-06-15',
    };
    const out = normalizeAvidEntry(raw);
    expect(out).not.toBeNull();
    expect(out!.report_id).toBe('AVID-2025-R0035');
    expect(out!.data_version).toBe('0.3.3');
    expect(out!.reported_date).toBe('2025-06-15');
    expect(out!.developers).toEqual(['OpenAI']);
    expect(out!.deployers).toEqual(['Microsoft', 'GitHub']);
    expect(out!.artifacts).toEqual([
      { type: 'Model', name: 'gpt-4' },
      { type: 'System', name: 'Copilot' },
    ]);
    expect(out!.problem_class).toBe('LLM Evaluation');
    expect(out!.problem_type).toBe('Detection');
    expect(out!.description).toBe('top-level description wins');
    expect(out!.risk_domains).toEqual(['Security', 'Ethics']);
    expect(out!.sep_view).toEqual(['S0100', 'E0200']);
    expect(out!.lifecycle_view).toEqual(['L01:Procurement']);
    expect(out!.taxonomy_version).toBe('0.2');
    expect(out!.metrics).toEqual([{ scorer: 'HELM', metric: 'toxicity', value: 0.42 }]);
    expect(out!.references).toEqual([
      { type: 'source', label: 'paper', url: 'https://arxiv.org/abs/0001.00001' },
    ]);
    expect(out!.credit).toEqual(['Jane Researcher']);
  });

  it('filters out non-string developers', () => {
    const raw = {
      metadata: { report_id: 'AVID-2025-R0001' },
      affects: {
        developer: ['OpenAI', 42, null, 'Anthropic', undefined] as unknown as string[],
      },
    };
    const out = normalizeAvidEntry(raw);
    expect(out!.developers).toEqual(['OpenAI', 'Anthropic']);
  });

  it('filters out non-string deployers', () => {
    const raw = {
      metadata: { report_id: 'AVID-2025-R0001' },
      affects: {
        deployer: [{}, 'Microsoft', 100, 'GitHub', false] as unknown as string[],
      },
    };
    const out = normalizeAvidEntry(raw);
    expect(out!.deployers).toEqual(['Microsoft', 'GitHub']);
  });

  it('coerces missing data_version to "unknown"', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.data_version).toBe('unknown');
  });

  it('coerces non-string data_version to "unknown"', () => {
    const raw = {
      metadata: { report_id: 'AVID-2025-R0001' },
      data_version: 3 as unknown as string,
    };
    const out = normalizeAvidEntry(raw);
    expect(out!.data_version).toBe('unknown');
  });

  it('coerces missing reported_date to empty string', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.reported_date).toBe('');
  });

  it('coerces non-string reported_date to empty string', () => {
    const raw = {
      metadata: { report_id: 'AVID-2025-R0001' },
      reported_date: 20250101 as unknown as string,
    };
    const out = normalizeAvidEntry(raw);
    expect(out!.reported_date).toBe('');
  });

  it('description falls back to problemtype.description.value when top-level description is missing', () => {
    const out = normalizeAvidEntry({
      metadata: { report_id: 'AVID-2025-R0001' },
      problemtype: { description: { value: 'fallback text' } },
    });
    expect(out!.description).toBe('fallback text');
  });

  it('description is empty string when both top-level and problemtype description are missing', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.description).toBe('');
  });

  it('description prefers top-level over problemtype.description.value', () => {
    const out = normalizeAvidEntry({
      metadata: { report_id: 'AVID-2025-R0001' },
      description: { value: 'top wins' },
      problemtype: { description: { value: 'fallback loses' } },
    });
    expect(out!.description).toBe('top wins');
  });

  it('artifacts: missing type defaults to "Unknown"', () => {
    const out = normalizeAvidEntry({
      metadata: { report_id: 'AVID-2025-R0001' },
      affects: { artifacts: [{ name: 'gpt-4' }] },
    });
    expect(out!.artifacts).toEqual([{ type: 'Unknown', name: 'gpt-4' }]);
  });

  it('artifacts: missing name defaults to "unknown"', () => {
    const out = normalizeAvidEntry({
      metadata: { report_id: 'AVID-2025-R0001' },
      affects: { artifacts: [{ type: 'Model' }] },
    });
    expect(out!.artifacts).toEqual([{ type: 'Model', name: 'unknown' }]);
  });

  it('artifacts: both missing fall back to defaults', () => {
    const out = normalizeAvidEntry({
      metadata: { report_id: 'AVID-2025-R0001' },
      affects: { artifacts: [{}] },
    });
    expect(out!.artifacts).toEqual([{ type: 'Unknown', name: 'unknown' }]);
  });

  it('artifacts: empty array stays empty', () => {
    const out = normalizeAvidEntry({
      metadata: { report_id: 'AVID-2025-R0001' },
      affects: { artifacts: [] },
    });
    expect(out!.artifacts).toEqual([]);
  });

  it('artifacts: missing affects entirely returns empty array', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.artifacts).toEqual([]);
  });

  it('metrics: missing scorer/metrics/value coerce to empty/empty/0', () => {
    const out = normalizeAvidEntry({
      metadata: { report_id: 'AVID-2025-R0001' },
      metrics: [{}],
    });
    expect(out!.metrics).toEqual([{ scorer: '', metric: '', value: 0 }]);
  });

  it('metrics: non-numeric value coerces to 0', () => {
    const raw = {
      metadata: { report_id: 'AVID-2025-R0001' },
      metrics: [{ scorer: 'X', metrics: 'm', value: 'not-a-number' as unknown as number }],
    };
    const out = normalizeAvidEntry(raw);
    expect(out!.metrics).toEqual([{ scorer: 'X', metric: 'm', value: 0 }]);
  });

  it('metrics: missing metrics entry returns empty array', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.metrics).toEqual([]);
  });

  it('references: drops entries without a url', () => {
    const out = normalizeAvidEntry({
      metadata: { report_id: 'AVID-2025-R0001' },
      references: [
        { type: 'source', label: 'no url here' },
        { type: 'source', label: 'has url', url: 'https://example.test/1' },
        { type: 'source', label: 'also no url' },
      ],
    });
    expect(out!.references).toEqual([
      { type: 'source', label: 'has url', url: 'https://example.test/1' },
    ]);
  });

  it('references: drops entries with non-string url', () => {
    const raw = {
      metadata: { report_id: 'AVID-2025-R0001' },
      references: [
        { type: 'source', label: 'bad url', url: 12345 as unknown as string },
        { type: 'source', label: 'good url', url: 'https://example.test/ok' },
      ],
    };
    const out = normalizeAvidEntry(raw);
    expect(out!.references).toEqual([
      { type: 'source', label: 'good url', url: 'https://example.test/ok' },
    ]);
  });

  it('references: missing type defaults to "source"', () => {
    const out = normalizeAvidEntry({
      metadata: { report_id: 'AVID-2025-R0001' },
      references: [{ url: 'https://example.test/x' }],
    });
    expect(out!.references).toEqual([{ type: 'source', label: '', url: 'https://example.test/x' }]);
  });

  it('credit: drops non-string credit entries', () => {
    const raw = {
      metadata: { report_id: 'AVID-2025-R0001' },
      credit: [
        { lang: 'eng', value: 'Jane' },
        { lang: 'eng', value: 99 as unknown as string },
        { lang: 'eng' },
        { lang: 'eng', value: 'Bob' },
      ],
    };
    const out = normalizeAvidEntry(raw);
    expect(out!.credit).toEqual(['Jane', 'Bob']);
  });

  it('credit: missing credit field returns empty array', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.credit).toEqual([]);
  });

  it('risk_domains defaults to empty array when impact.avid missing', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.risk_domains).toEqual([]);
  });

  it('sep_view defaults to empty array when impact.avid missing', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.sep_view).toEqual([]);
  });

  it('lifecycle_view defaults to empty array when impact.avid missing', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.lifecycle_view).toEqual([]);
  });

  it('risk_domains filters out non-string entries', () => {
    const raw = {
      metadata: { report_id: 'AVID-2025-R0001' },
      impact: { avid: { risk_domain: ['Security', 5 as unknown as string, 'Ethics'] } },
    };
    const out = normalizeAvidEntry(raw);
    expect(out!.risk_domains).toEqual(['Security', 'Ethics']);
  });

  it('sep_view filters out non-string entries', () => {
    const raw = {
      metadata: { report_id: 'AVID-2025-R0001' },
      impact: { avid: { sep_view: ['S0100', null as unknown as string, 'P0300'] } },
    };
    const out = normalizeAvidEntry(raw);
    expect(out!.sep_view).toEqual(['S0100', 'P0300']);
  });

  it('lifecycle_view filters out non-string entries', () => {
    const raw = {
      metadata: { report_id: 'AVID-2025-R0001' },
      impact: { avid: { lifecycle_view: ['L01', 7 as unknown as string, 'L02'] } },
    };
    const out = normalizeAvidEntry(raw);
    expect(out!.lifecycle_view).toEqual(['L01', 'L02']);
  });

  it('taxonomy_version defaults to empty string when impact.avid missing', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.taxonomy_version).toBe('');
  });

  it('problem_class defaults to empty string when missing', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.problem_class).toBe('');
  });

  it('problem_type defaults to empty string when missing', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.problem_type).toBe('');
  });

  it('avid_url construction parses year from report_id (2025)', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0035' } });
    expect(out!.avid_url).toBe('https://github.com/avidml/avid-db/blob/main/reports/2025/AVID-2025-R0035.json');
  });

  it('avid_url construction parses year from report_id (2022)', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2022-R0001' } });
    expect(out!.avid_url).toBe('https://github.com/avidml/avid-db/blob/main/reports/2022/AVID-2022-R0001.json');
  });

  it('avid_url falls back to current UTC year when report_id has no parseable year segment', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'NOPE' } });
    const currentYear = new Date().getUTCFullYear();
    expect(out!.avid_url).toBe(`https://github.com/avidml/avid-db/blob/main/reports/${currentYear}/NOPE.json`);
  });

  it('developers defaults to empty array when affects missing', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.developers).toEqual([]);
  });

  it('deployers defaults to empty array when affects missing', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.deployers).toEqual([]);
  });

  it('credit handles empty array', () => {
    const out = normalizeAvidEntry({
      metadata: { report_id: 'AVID-2025-R0001' },
      credit: [],
    });
    expect(out!.credit).toEqual([]);
  });

  it('preserves report_id verbatim in output', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2024-R0500' } });
    expect(out!.report_id).toBe('AVID-2024-R0500');
  });

  it('handles missing problemtype gracefully', () => {
    const out = normalizeAvidEntry({ metadata: { report_id: 'AVID-2025-R0001' } });
    expect(out!.problem_class).toBe('');
    expect(out!.problem_type).toBe('');
    expect(out!.description).toBe('');
  });

  it('full-shape entry roundtrips all impact.avid fields', () => {
    const out = normalizeAvidEntry({
      metadata: { report_id: 'AVID-2025-R0099' },
      impact: {
        avid: {
          vuln_id: 'V-99',
          risk_domain: ['Security'],
          sep_view: ['S0100'],
          lifecycle_view: ['L01'],
          taxonomy_version: '0.3',
        },
      },
    });
    expect(out!.risk_domains).toEqual(['Security']);
    expect(out!.sep_view).toEqual(['S0100']);
    expect(out!.lifecycle_view).toEqual(['L01']);
    expect(out!.taxonomy_version).toBe('0.3');
  });
});
