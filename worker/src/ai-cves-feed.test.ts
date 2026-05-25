import { describe, it, expect } from 'vitest';
import {
  validateBatch,
  classifyProduct,
  classifyPaper,
  toPublicPaper,
  MAX_PAPERS_PER_BATCH,
  type AiCvesPaper,
} from './ai-cves-feed';
import {
  severityRank,
  buildLatestResponse,
  buildFeedResponse,
  buildStatsResponse,
  FEED_MAX_LIMIT,
} from './premium-ai-cves';

// ── Helpers ────────────────────────────────────────────────────────

function paper(over: Partial<AiCvesPaper> = {}): AiCvesPaper {
  return {
    cve_ids: ['CVE-2026-0001'],
    affected_products: ['Generic Product'],
    affected_version_ranges: ['< 1.0.0'],
    fixed_versions: ['1.0.1'],
    exploited_in_wild: 'unstated',
    severity_label: 'unstated',
    source_url: 'https://github.com/advisories/GHSA-test-0000',
    quote_spans: { exploited_in_wild: '', severity_label: '' },
    ...over,
  };
}

function batch(papers: AiCvesPaper[]) {
  return {
    batch_id: 'test-001',
    extracted_at: '2026-05-24T00:00:00Z',
    window_start: '2026-04-01',
    window_end: '2026-05-04',
    model: 'qwen-3.6-27b@test',
    papers,
  };
}

// ── validateBatch ──────────────────────────────────────────────────

describe('validateBatch', () => {
  it('rejects non-object input', () => {
    const r = validateBatch('nope');
    expect(r.ok).toBe(false);
  });

  it('rejects missing batch_id', () => {
    const r = validateBatch({ ...batch([paper()]), batch_id: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toMatch(/batch_id/);
  });

  it('rejects empty papers', () => {
    const r = validateBatch(batch([]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toMatch(/non-empty/);
  });

  it('rejects too-many papers', () => {
    const big = Array.from({ length: MAX_PAPERS_PER_BATCH + 1 }, () => paper());
    const r = validateBatch(batch(big));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toMatch(/exceeds max/);
  });

  it('rejects bad exploited_in_wild enum', () => {
    const r = validateBatch(batch([paper({ exploited_in_wild: 'maybe' as never })]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toMatch(/exploited_in_wild/);
  });

  it('rejects em-dash in severity_label', () => {
    const r = validateBatch(batch([paper({ severity_label: 'high — critical' })]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toMatch(/em-dash/);
  });

  it('rejects double-hyphen in severity_label', () => {
    const r = validateBatch(batch([paper({ severity_label: 'high -- critical' })]));
    expect(r.ok).toBe(false);
  });

  it('rejects non-https source_url', () => {
    const r = validateBatch(batch([paper({ source_url: 'http://example.com/x' })]));
    expect(r.ok).toBe(false);
  });

  it('rejects missing quote_spans', () => {
    const bad = { ...paper(), quote_spans: undefined } as unknown as AiCvesPaper;
    const r = validateBatch(batch([bad]));
    expect(r.ok).toBe(false);
  });

  it('accepts a clean batch', () => {
    const r = validateBatch(batch([paper(), paper({ cve_ids: ['CVE-2026-0002'] })]));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.batch.papers).toHaveLength(2);
  });

  it('accepts stated_yes and stated_no', () => {
    const r = validateBatch(
      batch([paper({ exploited_in_wild: 'stated_yes' }), paper({ exploited_in_wild: 'stated_no' })]),
    );
    expect(r.ok).toBe(true);
  });
});

// ── classifyProduct ────────────────────────────────────────────────

describe('classifyProduct', () => {
  it('matches vLLM (case-insensitive)', () => {
    expect(classifyProduct('vLLM')).toBe('inference-stack');
    expect(classifyProduct('vllm-server v0.5')).toBe('inference-stack');
  });

  it('matches LangChain', () => {
    expect(classifyProduct('LangChain Core')).toBe('agent-framework');
  });

  it('matches PyTorch', () => {
    expect(classifyProduct('PyTorch')).toBe('training-stack');
  });

  it('matches Pinecone', () => {
    expect(classifyProduct('Pinecone Client')).toBe('vector-db');
  });

  it('matches Anthropic', () => {
    expect(classifyProduct('Anthropic SDK')).toBe('model-gateway');
  });

  it('returns null for unrelated products', () => {
    expect(classifyProduct('Eclipse BaSyx Java Server SDK')).toBeNull();
    expect(classifyProduct('Next.js')).toBeNull();
  });
});

describe('classifyPaper', () => {
  it('returns the matched category from any affected_product', () => {
    const p = paper({ affected_products: ['Unrelated Product', 'vLLM'] });
    expect(classifyPaper(p)).toBe('inference-stack');
  });

  it('returns null when no product matches', () => {
    const p = paper({ affected_products: ['Random Thing'] });
    expect(classifyPaper(p)).toBeNull();
  });
});

// ── toPublicPaper ──────────────────────────────────────────────────

describe('toPublicPaper', () => {
  it('omits quote_spans', () => {
    const pub = toPublicPaper(paper({ quote_spans: { exploited_in_wild: 'foo', severity_label: 'bar' } }));
    expect((pub as unknown as Record<string, unknown>).quote_spans).toBeUndefined();
  });
});

// ── severityRank ───────────────────────────────────────────────────

describe('severityRank', () => {
  it('maps critical to 4', () => {
    expect(severityRank('critical')).toBe(4);
    expect(severityRank('CVSS 9.8 Critical')).toBe(4);
  });
  it('maps high to 3', () => expect(severityRank('high')).toBe(3));
  it('maps medium and moderate to 2', () => {
    expect(severityRank('medium')).toBe(2);
    expect(severityRank('moderate')).toBe(2);
  });
  it('maps low to 1', () => expect(severityRank('low')).toBe(1));
  it('maps unstated/unknown to 0', () => {
    expect(severityRank('unstated')).toBe(0);
    expect(severityRank('')).toBe(0);
    expect(severityRank('garbage')).toBe(0);
  });
});

// ── buildLatestResponse ────────────────────────────────────────────

describe('buildLatestResponse', () => {
  it('returns empty shape when batch is null', () => {
    const r = buildLatestResponse(null, 0);
    expect(r.batch_id).toBeNull();
    expect(r.total_papers).toBe(0);
    expect(r.papers).toEqual([]);
    expect(r.source_license).toBe('CC BY 4.0');
  });

  it('clips to 25 papers and reports total', () => {
    const papers = Array.from({ length: 100 }, () => paper());
    const r = buildLatestResponse({ ...batch(papers), papers }, 5);
    expect(r.total_papers).toBe(100);
    expect(r.papers).toHaveLength(25);
    expect(r.ai_flagged_count).toBe(5);
  });

  it('omits quote_spans from returned papers', () => {
    const r = buildLatestResponse({ ...batch([paper()]), papers: [paper()] }, 0);
    expect((r.papers[0] as unknown as Record<string, unknown>).quote_spans).toBeUndefined();
  });
});

// ── buildFeedResponse ──────────────────────────────────────────────

describe('buildFeedResponse', () => {
  it('caps limit at FEED_MAX_LIMIT', () => {
    const papers = Array.from({ length: 100 }, () => paper());
    const r = buildFeedResponse({ batch_id: 'b', papers }, 999, 0);
    expect(r.limit).toBe(FEED_MAX_LIMIT);
    expect(r.papers).toHaveLength(FEED_MAX_LIMIT);
  });

  it('honors offset', () => {
    const papers = Array.from({ length: 10 }, (_, i) => paper({ cve_ids: [`CVE-2026-${i}`] }));
    const r = buildFeedResponse({ batch_id: 'b', papers }, 3, 5);
    expect(r.papers).toHaveLength(3);
    expect(r.papers[0].cve_ids[0]).toBe('CVE-2026-5');
  });

  it('defaults limit to 25, offset to 0', () => {
    const papers = Array.from({ length: 50 }, () => paper());
    const r = buildFeedResponse({ batch_id: 'b', papers }, 0, 0);
    expect(r.limit).toBe(25);
    expect(r.offset).toBe(0);
    expect(r.papers).toHaveLength(25);
  });
});

// ── buildStatsResponse ─────────────────────────────────────────────

describe('buildStatsResponse', () => {
  it('counts severities correctly', () => {
    const papers = [
      paper({ severity_label: 'critical' }),
      paper({ severity_label: 'critical' }),
      paper({ severity_label: 'high' }),
      paper({ severity_label: 'medium' }),
      paper({ severity_label: 'unstated' }),
    ];
    const r = buildStatsResponse({ batch_id: 'b', papers });
    expect(r.by_severity.critical).toBe(2);
    expect(r.by_severity.high).toBe(1);
    expect(r.by_severity.medium).toBe(1);
    expect(r.by_severity.unstated).toBe(1);
  });

  it('counts exploitation enum correctly', () => {
    const papers = [
      paper({ exploited_in_wild: 'stated_yes' }),
      paper({ exploited_in_wild: 'stated_no' }),
      paper({ exploited_in_wild: 'stated_no' }),
      paper({ exploited_in_wild: 'unstated' }),
    ];
    const r = buildStatsResponse({ batch_id: 'b', papers });
    expect(r.by_exploitation.stated_yes).toBe(1);
    expect(r.by_exploitation.stated_no).toBe(2);
    expect(r.by_exploitation.unstated).toBe(1);
  });

  it('ranks top vendors by frequency', () => {
    const papers = [
      paper({ affected_products: ['Eclipse Mosquitto'] }),
      paper({ affected_products: ['Eclipse BaSyx'] }),
      paper({ affected_products: ['Spring Framework'] }),
    ];
    const r = buildStatsResponse({ batch_id: 'b', papers });
    expect(r.top_vendors[0]).toEqual({ vendor: 'Eclipse', count: 2 });
    expect(r.top_vendors[1]).toEqual({ vendor: 'Spring', count: 1 });
  });

  it('case-folds vendor names so OpenClaw and openclaw count as one', () => {
    const papers = [
      paper({ affected_products: ['OpenClaw'] }),
      paper({ affected_products: ['openclaw'] }),
      paper({ affected_products: ['OPENCLAW'] }),
      paper({ affected_products: ['Apache HTTP'] }),
    ];
    const r = buildStatsResponse({ batch_id: 'b', papers });
    expect(r.top_vendors).toHaveLength(2);
    expect(r.top_vendors[0].count).toBe(3);
    // The display spelling is the FIRST original-cased form encountered.
    expect(r.top_vendors[0].vendor).toBe('OpenClaw');
    expect(r.top_vendors[1]).toEqual({ vendor: 'Apache', count: 1 });
  });

  it('handles null batch', () => {
    const r = buildStatsResponse(null);
    expect(r.total_papers).toBe(0);
    expect(r.top_vendors).toEqual([]);
  });
});
