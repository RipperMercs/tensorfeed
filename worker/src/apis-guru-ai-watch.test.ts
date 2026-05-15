import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildAIApiSnapshot,
  getApisGuruAIWatch,
  refreshApisGuruAIWatch,
} from './apis-guru-ai-watch';

function makeKv(): { kv: any; store: Map<string, string> } {
  const store = new Map<string, string>();
  const kv = {
    async get(key: string) {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
  return { kv, store };
}

function entry(versionInfo: Record<string, unknown> = {}, opts: { added?: string; updated?: string; preferred?: string } = {}) {
  const v = {
    added: opts.added ?? '2026-01-01T00:00:00Z',
    updated: opts.updated ?? '2026-05-01T00:00:00Z',
    swaggerUrl: 'https://example.com/openapi.json',
    info: versionInfo,
  };
  return {
    added: opts.added ?? '2026-01-01T00:00:00Z',
    preferred: opts.preferred ?? '1.0',
    versions: { '1.0': v },
  };
}

describe('apis-guru-ai-watch: buildAIApiSnapshot', () => {
  it('includes AI-relevant entries and skips the rest', () => {
    const list = {
      'openai.com': entry({ title: 'OpenAI API', description: 'GPT and embedding endpoints', 'x-providerName': 'openai.com' }),
      'someweather.com': entry({ title: 'Weather Forecast', description: 'Hourly forecasts', 'x-providerName': 'someweather.com' }),
      'anthropic.com': entry({ title: 'Anthropic API', description: 'Claude conversational models', 'x-providerName': 'anthropic.com' }),
    };
    const snap = buildAIApiSnapshot(list, new Map());
    expect(snap.total).toBe(2);
    const ids = snap.entries.map(e => e.api_id).sort();
    expect(ids).toEqual(['anthropic.com', 'openai.com']);
  });

  it('preserves first_seen_at from prior snapshot history', () => {
    const list = {
      'openai.com': entry({ title: 'OpenAI API', description: 'GPT', 'x-providerName': 'openai.com' }),
    };
    const history = new Map([['openai.com', '2025-08-01T00:00:00Z']]);
    const snap = buildAIApiSnapshot(list, history);
    expect(snap.entries[0].first_seen_at).toBe('2025-08-01T00:00:00Z');
  });

  it('falls back to upstream `added` when no history exists', () => {
    const list = {
      'cohere.com': entry({ title: 'Cohere API', description: 'LLM embedding api', 'x-providerName': 'cohere.com' }, { added: '2026-04-15T00:00:00Z' }),
    };
    const snap = buildAIApiSnapshot(list, new Map());
    expect(snap.entries[0].first_seen_at).toBe('2026-04-15T00:00:00Z');
  });

  it('flags newly_added_last_7d when first_seen_at is within 7 days', () => {
    const now = new Date('2026-05-14T12:00:00Z');
    const list = {
      'fresh.ai': entry({ title: 'fresh model api', description: 'new llm provider', 'x-providerName': 'fresh.ai' }, { added: '2026-05-10T00:00:00Z' }),
      'stale.ai': entry({ title: 'stale model api', description: 'old llm provider', 'x-providerName': 'stale.ai' }, { added: '2026-01-01T00:00:00Z' }),
    };
    const snap = buildAIApiSnapshot(list, new Map(), now);
    const fresh = snap.entries.find(e => e.api_id === 'fresh.ai');
    const stale = snap.entries.find(e => e.api_id === 'stale.ai');
    expect(fresh?.newly_added_last_7d).toBe(true);
    expect(stale?.newly_added_last_7d).toBe(false);
    expect(snap.newly_added_last_7d).toHaveLength(1);
    expect(snap.newly_added_last_7d[0].api_id).toBe('fresh.ai');
  });

  it('builds by_provider aggregate', () => {
    const list = {
      'openai.com:assistants': entry({ title: 'OpenAI Assistants', description: 'gpt llm', 'x-providerName': 'openai.com' }),
      'openai.com:completions': entry({ title: 'OpenAI Completions', description: 'gpt embedding', 'x-providerName': 'openai.com' }),
      'anthropic.com': entry({ title: 'Anthropic API', description: 'claude llm', 'x-providerName': 'anthropic.com' }),
    };
    const snap = buildAIApiSnapshot(list, new Map());
    expect(snap.by_provider['openai.com']).toBe(2);
    expect(snap.by_provider['anthropic.com']).toBe(1);
  });

  it('skips entries with missing versions block', () => {
    const list = {
      'broken.com': { added: '2026-01-01T00:00:00Z', preferred: '1.0' } as any,
      'openai.com': entry({ title: 'OpenAI API', description: 'gpt', 'x-providerName': 'openai.com' }),
    };
    const snap = buildAIApiSnapshot(list, new Map());
    expect(snap.total).toBe(1);
    expect(snap.entries[0].api_id).toBe('openai.com');
  });

  it('matches on description-only when title is generic', () => {
    const list = {
      'generic.com': entry({ title: 'Provider Cloud Platform', description: 'Includes a sentiment analysis endpoint for text processing.', 'x-providerName': 'generic.com' }),
    };
    const snap = buildAIApiSnapshot(list, new Map());
    expect(snap.total).toBe(1);
    expect(snap.entries[0].matched_keywords).toContain('sentiment analysis');
  });

  it('sorts newest-first by first_seen_at', () => {
    const list = {
      'old.ai': entry({ title: 'old llm api', description: 'old', 'x-providerName': 'old.ai' }, { added: '2026-01-01T00:00:00Z' }),
      'new.ai': entry({ title: 'new llm api', description: 'new', 'x-providerName': 'new.ai' }, { added: '2026-05-01T00:00:00Z' }),
    };
    const snap = buildAIApiSnapshot(list, new Map());
    expect(snap.entries[0].api_id).toBe('new.ai');
    expect(snap.entries[1].api_id).toBe('old.ai');
  });
});

describe('refreshApisGuruAIWatch', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('writes a snapshot when upstream fetch succeeds', async () => {
    (fetch as any).mockResolvedValueOnce(new Response(JSON.stringify({
      'openai.com': entry({ title: 'OpenAI API', description: 'gpt', 'x-providerName': 'openai.com' }),
    }), { status: 200 }));
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const snap = await refreshApisGuruAIWatch(env);
    expect(snap.total).toBe(1);
    const got = await getApisGuruAIWatch(env);
    expect(got?.total).toBe(1);
  });

  it('preserves first_seen_at across refreshes', async () => {
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;

    (fetch as any).mockResolvedValueOnce(new Response(JSON.stringify({
      'openai.com': entry({ title: 'OpenAI API', description: 'gpt', 'x-providerName': 'openai.com' }, { added: '2026-02-01T00:00:00Z' }),
    }), { status: 200 }));
    const first = await refreshApisGuruAIWatch(env);
    const firstSeen = first.entries[0].first_seen_at;

    (fetch as any).mockResolvedValueOnce(new Response(JSON.stringify({
      'openai.com': entry({ title: 'OpenAI API', description: 'gpt + embedding', 'x-providerName': 'openai.com' }, { added: '2026-04-01T00:00:00Z' }),
    }), { status: 200 }));
    const second = await refreshApisGuruAIWatch(env);
    expect(second.entries[0].first_seen_at).toBe(firstSeen);
  });

  it('throws on HTTP failure', async () => {
    (fetch as any).mockResolvedValueOnce(new Response('rate limit', { status: 429 }));
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    await expect(refreshApisGuruAIWatch(env)).rejects.toThrow(/HTTP 429/);
  });
});

describe('getApisGuruAIWatch', () => {
  it('returns null when no snapshot', async () => {
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    expect(await getApisGuruAIWatch(env)).toBeNull();
  });

  it('returns null when snapshot is unparseable', async () => {
    const { kv, store } = makeKv();
    store.set('apis-guru-ai:current', 'not-json');
    const env = { TENSORFEED_CACHE: kv } as any;
    expect(await getApisGuruAIWatch(env)).toBeNull();
  });
});
