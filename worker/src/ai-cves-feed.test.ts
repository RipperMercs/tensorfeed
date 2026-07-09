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
  parseBatchIdsParam,
  buildBatchResponse,
  CVE_BATCH_MAX_IDS,
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

  it('accepts a paper without ecosystems (pre-sidecar batches stay valid)', () => {
    const r = validateBatch(batch([paper()]));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.batch.papers[0].ecosystems).toBeUndefined();
  });

  it('accepts ecosystems and normalizes to lowercase', () => {
    const r = validateBatch(batch([paper({ ecosystems: ['PyPI ', 'npm'] as never })]));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.batch.papers[0].ecosystems).toEqual(['pypi', 'npm']);
  });

  it('accepts an empty ecosystems array (GHSA record with no package entry)', () => {
    const r = validateBatch(batch([paper({ ecosystems: [] })]));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.batch.papers[0].ecosystems).toEqual([]);
  });

  it('rejects non-array ecosystems', () => {
    const r = validateBatch(batch([paper({ ecosystems: 'pip' as never })]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toMatch(/ecosystems must be an array/);
  });

  it('rejects empty-string and non-string ecosystem elements', () => {
    for (const bad of [[''], ['  '], [42 as never]]) {
      const r = validateBatch(batch([paper({ ecosystems: bad as never })]));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.detail).toMatch(/ecosystems\[0\]/);
    }
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

  it('rejects em-dash in an affected_products element', () => {
    const r = validateBatch(batch([paper({ affected_products: ['vLLM — server'] })]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toMatch(/affected_products\[0\]/);
  });

  it('rejects double-hyphen in a fixed_versions element', () => {
    const r = validateBatch(batch([paper({ fixed_versions: ['1.0.0--rc1'] })]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.detail).toMatch(/fixed_versions\[0\]/);
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

  it('matches the AI-native tooling wave (job #95 corpus: agent builders, UIs, gateways)', () => {
    expect(classifyProduct('Flowise')).toBe('agent-framework');
    expect(classifyProduct('FlowiseAI/Flosise')).toBe('agent-framework'); // source-verbatim typo, still flags on 'flowise'
    expect(classifyProduct('Langflow')).toBe('agent-framework');
    expect(classifyProduct('LangSmith SDK')).toBe('agent-framework');
    expect(classifyProduct('LiteLLM')).toBe('model-gateway');
    expect(classifyProduct('SGLang')).toBe('inference-stack');
    expect(classifyProduct('Gradio')).toBe('other-ai');
    expect(classifyProduct('Open WebUI')).toBe('other-ai');
    expect(classifyProduct('open-webui')).toBe('other-ai');
  });

  it('matches the full-corpus additions (run 20260624-133422: MLflow, Ray, Claude SDK, MCP SDKs)', () => {
    expect(classifyProduct('MLflow')).toBe('training-stack');
    expect(classifyProduct('mlflow/mlflow')).toBe('training-stack');
    expect(classifyProduct('MLflow Tracking Server')).toBe('training-stack');
    expect(classifyProduct('Ray')).toBe('training-stack');
    expect(classifyProduct('Ray Dashboard')).toBe('training-stack');
    expect(classifyProduct('Claude SDK for Python')).toBe('model-gateway');
    expect(classifyProduct('MCP Python SDK')).toBe('mcp-tool');
    expect(classifyProduct('MCP Ruby SDK')).toBe('mcp-tool');
  });

  it('matches the real pinned pip package names people put in AI lockfiles (CVE Check cohort completeness)', () => {
    // The 'pytorch' needle matches advisory prose but not the pip package
    // name; these are the names that actually appear in a requirements.txt.
    expect(classifyProduct('torch')).toBe('training-stack');
    expect(classifyProduct('torchvision')).toBe('training-stack');
    expect(classifyProduct('tokenizers')).toBe('training-stack');
    expect(classifyProduct('safetensors')).toBe('training-stack');
    expect(classifyProduct('diffusers')).toBe('training-stack');
    expect(classifyProduct('peft')).toBe('training-stack');
    expect(classifyProduct('bitsandbytes')).toBe('training-stack');
    expect(classifyProduct('xformers')).toBe('training-stack');
    expect(classifyProduct('keras')).toBe('training-stack');
    expect(classifyProduct('sentencepiece')).toBe('training-stack');
    expect(classifyProduct('onnxruntime')).toBe('inference-stack');
    expect(classifyProduct('onnx')).toBe('inference-stack');
    expect(classifyProduct('dspy-ai')).toBe('agent-framework');
  });

  it('matches the run 20260709-111957 cohort-widening package names', () => {
    // Product strings verbatim from the widened corpus that the previous
    // needle list missed (measured: 11 papers would have gone unflagged).
    expect(classifyProduct('triton')).toBe('inference-stack');
    expect(classifyProduct('Triton Inference Server')).toBe('inference-stack');
    expect(classifyProduct('fastmcp')).toBe('mcp-tool');
    expect(classifyProduct('FastMCP OpenAPI Provider')).toBe('mcp-tool');
    expect(classifyProduct('@modelcontextprotocol/sdk')).toBe('mcp-tool');
    expect(classifyProduct('guardrails-ai')).toBe('agent-framework');
    expect(classifyProduct('Guardrails AI')).toBe('agent-framework');
    expect(classifyProduct('instructor')).toBe('agent-framework');
    expect(classifyProduct('outlines')).toBe('agent-framework');
    expect(classifyProduct('run-llama/llama_index')).toBe('agent-framework');
    expect(classifyProduct('llama_index.core')).toBe('agent-framework');
    expect(classifyProduct('google-cloud-aiplatform')).toBe('model-gateway');
  });

  it('leaves general (non-AI-stack) dependency libs unflagged', () => {
    // These appeared in AI-stack advisories as dependencies but are not AI-stack core.
    expect(classifyProduct('FFmpeg')).toBeNull();
    expect(classifyProduct('Socket.IO')).toBeNull();
    expect(classifyProduct('Pandas')).toBeNull();
    expect(classifyProduct('libopenjp2')).toBeNull();
    // General web infra ubiquitous in AI deployments but out of the
    // AI-stack brand on purpose: CVE Check reports these UNKNOWN (not
    // assessed) rather than pretending to gate the whole lockfile.
    expect(classifyProduct('fastapi')).toBeNull();
    expect(classifyProduct('uvicorn')).toBeNull();
    expect(classifyProduct('pydantic')).toBeNull();
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

// ── parseBatchIdsParam ─────────────────────────────────────────────

describe('parseBatchIdsParam', () => {
  it('rejects null or empty string', () => {
    const r1 = parseBatchIdsParam(null);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error).toBe('missing_ids');
    const r2 = parseBatchIdsParam('');
    expect(r2.ok).toBe(false);
    const r3 = parseBatchIdsParam('   ');
    expect(r3.ok).toBe(false);
  });

  it('parses a single id', () => {
    const r = parseBatchIdsParam('CVE-2026-0001');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ids).toEqual(['CVE-2026-0001']);
  });

  it('parses comma-separated ids with whitespace tolerance', () => {
    const r = parseBatchIdsParam('CVE-2026-0001, CVE-2026-0002 ,CVE-2026-0003');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ids).toEqual(['CVE-2026-0001', 'CVE-2026-0002', 'CVE-2026-0003']);
  });

  it('accepts lowercase id', () => {
    const r = parseBatchIdsParam('cve-2026-0001');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ids).toEqual(['cve-2026-0001']);
  });

  it('rejects more than CVE_BATCH_MAX_IDS', () => {
    const ids = Array.from({ length: CVE_BATCH_MAX_IDS + 1 }, (_, i) => `CVE-2026-${String(i).padStart(4, '0')}`).join(',');
    const r = parseBatchIdsParam(ids);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('too_many_ids');
  });

  it('accepts exactly CVE_BATCH_MAX_IDS', () => {
    const ids = Array.from({ length: CVE_BATCH_MAX_IDS }, (_, i) => `CVE-2026-${String(i).padStart(4, '0')}`).join(',');
    const r = parseBatchIdsParam(ids);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ids).toHaveLength(CVE_BATCH_MAX_IDS);
  });

  it('rejects malformed id', () => {
    const r = parseBatchIdsParam('CVE-2026-0001,NOT-A-CVE,CVE-2026-0003');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_cve_id');
  });

  it('rejects id with wrong year format', () => {
    const r = parseBatchIdsParam('CVE-26-0001');
    expect(r.ok).toBe(false);
  });

  it('rejects id with too-short sequence', () => {
    const r = parseBatchIdsParam('CVE-2026-001');
    expect(r.ok).toBe(false);
  });

  it('filters empty segments from leading/trailing commas', () => {
    const r = parseBatchIdsParam(',CVE-2026-0001,,CVE-2026-0002,');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ids).toEqual(['CVE-2026-0001', 'CVE-2026-0002']);
  });
});

// ── buildBatchResponse ─────────────────────────────────────────────

describe('buildBatchResponse', () => {
  it('returns all not-found when index is null', () => {
    const r = buildBatchResponse(['CVE-2026-0001', 'CVE-2026-0002'], null, {});
    expect(r.total_requested).toBe(2);
    expect(r.total_found).toBe(0);
    expect(r.results).toHaveLength(2);
    expect(r.results.every((p) => !p.found)).toBe(true);
  });

  it('normalizes lowercase ids to uppercase in response', () => {
    const r = buildBatchResponse(['cve-2026-0001'], null, {});
    expect(r.results[0].cve_id).toBe('CVE-2026-0001');
  });

  it('resolves found ids from batch map', () => {
    const p = paper({ cve_ids: ['CVE-2026-0001'], severity_label: 'critical' });
    const b = { batch_id: 'b1', extracted_at: '', window_start: '', window_end: '', model: 'm', papers: [p] };
    const idx = { 'CVE-2026-0001': { batch_id: 'b1', paper_index: 0 } };
    const r = buildBatchResponse(['CVE-2026-0001'], idx, { b1: b });
    expect(r.total_found).toBe(1);
    expect(r.results[0].found).toBe(true);
    expect(r.results[0].paper?.severity_label).toBe('critical');
    expect(r.results[0].batch_id).toBe('b1');
  });

  it('strips quote_spans from returned papers', () => {
    const p = paper({ cve_ids: ['CVE-2026-0001'] });
    const b = { batch_id: 'b1', extracted_at: '', window_start: '', window_end: '', model: 'm', papers: [p] };
    const idx = { 'CVE-2026-0001': { batch_id: 'b1', paper_index: 0 } };
    const r = buildBatchResponse(['CVE-2026-0001'], idx, { b1: b });
    expect(r.results[0].paper).toBeTruthy();
    expect((r.results[0].paper as Record<string, unknown>).quote_spans).toBeUndefined();
  });

  it('returns found:false for ids absent from the index', () => {
    const p = paper({ cve_ids: ['CVE-2026-0001'] });
    const b = { batch_id: 'b1', extracted_at: '', window_start: '', window_end: '', model: 'm', papers: [p] };
    const idx = { 'CVE-2026-0001': { batch_id: 'b1', paper_index: 0 } };
    const r = buildBatchResponse(['CVE-2026-0001', 'CVE-2026-9999'], idx, { b1: b });
    expect(r.total_requested).toBe(2);
    expect(r.total_found).toBe(1);
    expect(r.results[0].found).toBe(true);
    expect(r.results[1].found).toBe(false);
    expect(r.results[1].cve_id).toBe('CVE-2026-9999');
  });

  it('returns found:false when the batch is missing from the map', () => {
    const idx = { 'CVE-2026-0001': { batch_id: 'b-missing', paper_index: 0 } };
    const r = buildBatchResponse(['CVE-2026-0001'], idx, {});
    expect(r.results[0].found).toBe(false);
  });

  it('returns found:false when paper_index is out of range', () => {
    const p = paper({ cve_ids: ['CVE-2026-0001'] });
    const b = { batch_id: 'b1', extracted_at: '', window_start: '', window_end: '', model: 'm', papers: [p] };
    const idx = { 'CVE-2026-0001': { batch_id: 'b1', paper_index: 99 } };
    const r = buildBatchResponse(['CVE-2026-0001'], idx, { b1: b });
    expect(r.results[0].found).toBe(false);
  });

  it('preserves request order in results', () => {
    const p1 = paper({ cve_ids: ['CVE-2026-0001'] });
    const p2 = paper({ cve_ids: ['CVE-2026-0002'] });
    const b = { batch_id: 'b1', extracted_at: '', window_start: '', window_end: '', model: 'm', papers: [p1, p2] };
    const idx = {
      'CVE-2026-0001': { batch_id: 'b1', paper_index: 0 },
      'CVE-2026-0002': { batch_id: 'b1', paper_index: 1 },
    };
    const r = buildBatchResponse(['CVE-2026-0002', 'CVE-2026-0001'], idx, { b1: b });
    expect(r.results.map((x) => x.cve_id)).toEqual(['CVE-2026-0002', 'CVE-2026-0001']);
  });

  it('carries attribution on the envelope and each result', () => {
    const r = buildBatchResponse(['CVE-2026-0001'], null, {});
    expect(r.source_license).toBeTruthy();
    expect(r.source_attribution).toBeTruthy();
    expect(r.results[0].source_license).toBeTruthy();
  });
});
