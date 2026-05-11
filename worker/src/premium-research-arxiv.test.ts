import { describe, it, expect } from 'vitest';
import {
  computeMilestones,
  computeEmergingKeywords,
  computeTopicSearch,
  validateTopicSearchInput,
  loadTopicSearchTaxonomies,
  computeLabProductivity,
  validateLabProductivityInput,
  ARXIV_RESEARCH_ATTRIBUTION,
} from './premium-research-arxiv';
import type { Env } from './types';

function makeKV(initial: Record<string, unknown>) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string, type?: string) => {
      const v = store.get(key);
      if (v === undefined) return null;
      // Mimic the .get(key, 'json') overload by returning the raw object.
      // In production env.KV.get(key, 'json') parses; our test store already
      // holds parsed objects.
      return type === 'json' ? v : typeof v === 'string' ? v : JSON.stringify(v);
    },
    put: async () => undefined,
    delete: async () => undefined,
    list: async () => ({ keys: [] }),
  };
}

function makeEnv(initial: Record<string, unknown> = {}): Env {
  const cache = makeKV(initial);
  return {
    TENSORFEED_NEWS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_CACHE: cache as unknown as KVNamespace,
    ENVIRONMENT: 'test',
    SITE_URL: 'https://tensorfeed.ai',
    INDEXNOW_KEY: '',
    X_API_KEY: '',
    X_API_SECRET: '',
    X_ACCESS_TOKEN: '',
    X_ACCESS_SECRET: '',
    GITHUB_TOKEN: '',
    RESEND_API_KEY: '',
    ALERT_EMAIL_TO: '',
    ALERT_EMAIL_FROM: '',
    PAYMENT_WALLET: '0x0',
    PAYMENT_ENABLED: 'true',
  };
}

const SAMPLE_MILESTONES = {
  window_days: 30,
  as_of: '2026-05-10',
  papers: [
    {
      arxiv_id: '2026.04001',
      date: '2026-04-15',
      subfield_tag: 'llm-alignment',
      methodology_bucket: 'empirical-study',
      title: 'Constitutional AI for Multi-Turn Dialogue Safety',
      affiliations: ['Anthropic'],
      milestone_reasoning: 'Established new SOTA on HHH-Eval at 87.4%, prior 81.2%.',
      summary: 'Extended constitutional AI methodology to multi-turn dialogue with new SOTA on HHH-Eval.',
    },
  ],
};

const SAMPLE_KEYWORDS = {
  recent_window_days: 30,
  baseline_window_days: 90,
  as_of: '2026-05-10',
  keywords: [
    {
      keyword: 'speculative decoding',
      recent_count: 18,
      baseline_count: 6,
      lift: 9.1,
      example_arxiv_ids: ['2026.04111', '2026.04222', '2026.04333'],
    },
  ],
};

const SAMPLE_TOPIC_INDEX = {
  as_of: '2026-05-10',
  subfield_tags: ['llm-alignment', 'efficiency', 'agents'],
  methodology_buckets: ['empirical-study', 'training-recipe', 'system-tooling'],
  papers: [
    {
      arxiv_id: '2026.04001',
      date: '2026-04-15',
      title: 'Constitutional AI for Multi-Turn Dialogue Safety',
      subfield_tag: 'llm-alignment',
      methodology_bucket: 'empirical-study',
      is_milestone_candidate: true,
      affiliations: ['Anthropic'],
      summary: 'Constitutional AI methodology for multi-turn dialogue.',
    },
    {
      arxiv_id: '2026.04002',
      date: '2026-04-20',
      title: 'Speculative Decoding for MoE',
      subfield_tag: 'efficiency',
      methodology_bucket: 'training-recipe',
      is_milestone_candidate: false,
      affiliations: ['Google DeepMind'],
      summary: 'Speculative decoding reduces MoE inference latency by 2.3x.',
    },
    {
      arxiv_id: '2026.05003',
      date: '2026-05-05',
      title: 'Agent Memory via Episodic Logs',
      subfield_tag: 'agents',
      methodology_bucket: 'system-tooling',
      is_milestone_candidate: false,
      affiliations: ['MIT'],
      summary: 'Episodic-log retrieval mechanism for long-running agent memory.',
    },
  ],
};

// ── computeMilestones ────────────────────────────────────────────────

describe('computeMilestones', () => {
  it('returns no_snapshot_yet when KV is empty', async () => {
    const env = makeEnv({});
    const r = await computeMilestones(env);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe('no_snapshot_yet');
      expect(r.hint).toBeDefined();
    }
  });

  it('returns parsed snapshot with attribution', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_milestones': SAMPLE_MILESTONES });
    const r = await computeMilestones(env);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.capturedAt).toBe('2026-05-10');
      expect(r.window_days).toBe(30);
      expect(r.total).toBe(1);
      expect(r.papers[0].arxiv_id).toBe('2026.04001');
      expect(r.attribution).toBe(ARXIV_RESEARCH_ATTRIBUTION);
    }
  });
});

// ── computeEmergingKeywords ─────────────────────────────────────────

describe('computeEmergingKeywords', () => {
  it('returns no_snapshot_yet when KV is empty', async () => {
    const env = makeEnv({});
    const r = await computeEmergingKeywords(env);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('no_snapshot_yet');
  });

  it('returns ranked keywords', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_keywords': SAMPLE_KEYWORDS });
    const r = await computeEmergingKeywords(env);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.recent_window_days).toBe(30);
      expect(r.baseline_window_days).toBe(90);
      expect(r.total).toBe(1);
      expect(r.keywords[0].keyword).toBe('speculative decoding');
      expect(r.keywords[0].lift).toBe(9.1);
      expect(r.keywords[0].example_arxiv_ids).toHaveLength(3);
    }
  });
});

// ── validateTopicSearchInput ─────────────────────────────────────────

describe('validateTopicSearchInput', () => {
  const subfields = ['llm-alignment', 'efficiency', 'agents'];
  const methodologies = ['empirical-study', 'training-recipe'];

  it('passes empty input', () => {
    expect(validateTopicSearchInput({}, subfields, methodologies)).toBeNull();
  });

  it('rejects unknown subfield', () => {
    const r = validateTopicSearchInput({ subfield_tag: 'made-up' }, subfields, methodologies);
    expect(r?.error).toBe('invalid_subfield_tag');
    expect(r?.valid).toEqual(subfields);
  });

  it('rejects unknown methodology', () => {
    const r = validateTopicSearchInput({ methodology_bucket: 'nope' }, subfields, methodologies);
    expect(r?.error).toBe('invalid_methodology_bucket');
  });

  it('rejects malformed since', () => {
    expect(validateTopicSearchInput({ since: 'yesterday' }, subfields, methodologies)?.error).toBe('invalid_since');
  });

  it('rejects malformed until', () => {
    expect(validateTopicSearchInput({ until: '20260510' }, subfields, methodologies)?.error).toBe('invalid_until');
  });

  it('rejects since > until', () => {
    const r = validateTopicSearchInput({ since: '2026-05-10', until: '2026-04-01' }, subfields, methodologies);
    expect(r?.error).toBe('invalid_date_range');
  });

  it('rejects out-of-range limit', () => {
    expect(validateTopicSearchInput({ limit: 0 }, subfields, methodologies)?.error).toBe('invalid_limit');
    expect(validateTopicSearchInput({ limit: 500 }, subfields, methodologies)?.error).toBe('invalid_limit');
  });

  it('rejects negative offset', () => {
    expect(validateTopicSearchInput({ offset: -1 }, subfields, methodologies)?.error).toBe('invalid_offset');
  });

  it('skips taxonomy validation when index lists are null', () => {
    expect(validateTopicSearchInput({ subfield_tag: 'anything' }, null, null)).toBeNull();
  });
});

// ── computeTopicSearch ──────────────────────────────────────────────

describe('computeTopicSearch', () => {
  it('returns no_snapshot_yet when KV is empty', async () => {
    const env = makeEnv({});
    const r = await computeTopicSearch(env, {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('no_snapshot_yet');
  });

  it('returns all papers when no filters set, sorted by date desc', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_topic_search_index': SAMPLE_TOPIC_INDEX });
    const r = await computeTopicSearch(env, {});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total_matches).toBe(3);
      expect(r.returned).toBe(3);
      expect(r.papers[0].arxiv_id).toBe('2026.05003'); // most recent first
      expect(r.papers[2].arxiv_id).toBe('2026.04001'); // oldest last
    }
  });

  it('filters by subfield_tag', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_topic_search_index': SAMPLE_TOPIC_INDEX });
    const r = await computeTopicSearch(env, { subfield_tag: 'efficiency' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total_matches).toBe(1);
      expect(r.papers[0].subfield_tag).toBe('efficiency');
    }
  });

  it('filters by methodology_bucket', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_topic_search_index': SAMPLE_TOPIC_INDEX });
    const r = await computeTopicSearch(env, { methodology_bucket: 'system-tooling' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.total_matches).toBe(1);
  });

  it('filters by milestone_only', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_topic_search_index': SAMPLE_TOPIC_INDEX });
    const r = await computeTopicSearch(env, { milestone_only: true });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total_matches).toBe(1);
      expect(r.papers[0].is_milestone_candidate).toBe(true);
    }
  });

  it('filters by date range', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_topic_search_index': SAMPLE_TOPIC_INDEX });
    const r = await computeTopicSearch(env, { since: '2026-04-18', until: '2026-05-01' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total_matches).toBe(1);
      expect(r.papers[0].arxiv_id).toBe('2026.04002');
    }
  });

  it('combines filters', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_topic_search_index': SAMPLE_TOPIC_INDEX });
    const r = await computeTopicSearch(env, {
      subfield_tag: 'llm-alignment',
      milestone_only: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total_matches).toBe(1);
      expect(r.papers[0].arxiv_id).toBe('2026.04001');
    }
  });

  it('paginates with limit + offset', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_topic_search_index': SAMPLE_TOPIC_INDEX });
    const r = await computeTopicSearch(env, { limit: 1, offset: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total_matches).toBe(3);
      expect(r.returned).toBe(1);
      expect(r.papers[0].arxiv_id).toBe('2026.04002'); // second by date desc
    }
  });
});

// ── loadTopicSearchTaxonomies ──────────────────────────────────────

describe('loadTopicSearchTaxonomies', () => {
  it('returns null when index missing', async () => {
    const env = makeEnv({});
    expect(await loadTopicSearchTaxonomies(env)).toBeNull();
  });

  it('returns subfield + methodology lists when index present', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_topic_search_index': SAMPLE_TOPIC_INDEX });
    const r = await loadTopicSearchTaxonomies(env);
    expect(r).not.toBeNull();
    expect(r?.subfields).toContain('llm-alignment');
    expect(r?.methodologies).toContain('training-recipe');
  });
});

// ── computeLabProductivity ──────────────────────────────────────────

const SAMPLE_LABS = {
  as_of: '2026-05-10',
  windows: {
    '30d': [
      { affiliation: 'Google DeepMind', papers: 14, type: 'industry' },
      { affiliation: 'MIT', papers: 10, type: 'academia' },
      { affiliation: 'Anthropic', papers: 6, type: 'industry' },
    ],
    '90d': [
      { affiliation: 'Google DeepMind', papers: 42, type: 'industry' },
      { affiliation: 'Stanford University', papers: 30, type: 'academia' },
      { affiliation: 'Meta AI', papers: 25, type: 'industry' },
      { affiliation: 'NIST', papers: 4, type: 'government' },
    ],
    '365d': [
      { affiliation: 'Google DeepMind', papers: 180, type: 'industry' },
      { affiliation: 'Stanford University', papers: 130, type: 'academia' },
    ],
  },
};

describe('computeLabProductivity', () => {
  it('returns no_snapshot_yet when KV is empty', async () => {
    const env = makeEnv({});
    const r = await computeLabProductivity(env, {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('no_snapshot_yet');
  });

  it('returns all three windows when window param omitted', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_labs': SAMPLE_LABS });
    const r = await computeLabProductivity(env, {});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.windows).sort()).toEqual(['30d', '365d', '90d']);
      expect(r.query.window).toBeNull();
      expect(r.capturedAt).toBe('2026-05-10');
      expect(r.attribution).toBe(ARXIV_RESEARCH_ATTRIBUTION);
    }
  });

  it('returns only the requested window', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_labs': SAMPLE_LABS });
    const r = await computeLabProductivity(env, { window: '90d' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.windows)).toEqual(['90d']);
      expect(r.windows['90d']).toHaveLength(4);
    }
  });

  it('filters by affiliation_type', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_labs': SAMPLE_LABS });
    const r = await computeLabProductivity(env, { window: '90d', affiliation_type: 'industry' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.windows['90d']).toHaveLength(2);
      expect(r.windows['90d'].every((e) => e.type === 'industry')).toBe(true);
    }
  });

  it('honors limit per window', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_labs': SAMPLE_LABS });
    const r = await computeLabProductivity(env, { limit: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.windows['30d']).toHaveLength(1);
      expect(r.windows['30d'][0].affiliation).toBe('Google DeepMind');
      expect(r.windows['90d']).toHaveLength(1);
      expect(r.windows['365d']).toHaveLength(1);
    }
  });

  it('returns empty array for window with no rows after type filter', async () => {
    const env = makeEnv({ 'arxiv-research:rollup_labs': SAMPLE_LABS });
    const r = await computeLabProductivity(env, { window: '365d', affiliation_type: 'government' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.windows['365d']).toEqual([]);
  });
});

describe('validateLabProductivityInput', () => {
  it('accepts empty input', () => {
    expect(validateLabProductivityInput({})).toBeNull();
  });

  it('accepts valid window + affiliation_type + limit', () => {
    expect(validateLabProductivityInput({ window: '30d', affiliation_type: 'academia', limit: 10 })).toBeNull();
    expect(validateLabProductivityInput({ window: '365d', affiliation_type: 'industry', limit: 50 })).toBeNull();
  });

  it('rejects invalid window with valid list', () => {
    const v = validateLabProductivityInput({ window: '7d' });
    expect(v?.ok).toBe(false);
    expect(v?.error).toBe('invalid_window');
    expect(v?.valid).toEqual(['30d', '90d', '365d']);
  });

  it('rejects invalid affiliation_type with valid list', () => {
    const v = validateLabProductivityInput({ affiliation_type: 'corporate' });
    expect(v?.ok).toBe(false);
    expect(v?.error).toBe('invalid_affiliation_type');
    expect(v?.valid).toContain('industry');
    expect(v?.valid).toContain('academia');
  });

  it('rejects out-of-range limit', () => {
    expect(validateLabProductivityInput({ limit: 0 })?.error).toBe('invalid_limit');
    expect(validateLabProductivityInput({ limit: 51 })?.error).toBe('invalid_limit');
    expect(validateLabProductivityInput({ limit: -5 })?.error).toBe('invalid_limit');
  });
});
