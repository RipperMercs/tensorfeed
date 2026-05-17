import { describe, it, expect, beforeEach } from 'vitest';
import { _resetIsolateMemoForTests } from './kill-switch';
import type { Env } from './types';
import type { PricingRow, SubmissionRecord } from './jobs-submissions';
import {
  assembleIngestRecord,
  ingestAcceptedSubmission,
  getIngest,
  listIngest,
  deleteIngest,
  ingestKey,
  projectModelPricingFeed,
  INGEST_KEY_PREFIX,
  DEFAULT_FEED_ID,
  feedPrefix,
  isRegisteredFeed,
  assertRegisteredFeed,
  type IngestRecord,
} from './jobs-ingest';

// Same minimal in-memory KV the jobs-store tests use.
class FakeKV {
  store = new Map<string, string>();
  async get(key: string, _type?: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  async list({ prefix }: { prefix: string; cursor?: string }) {
    const keys = [...this.store.keys()]
      .filter((k) => k.startsWith(prefix))
      .map((name) => ({ name }));
    return { keys, list_complete: true as const, cursor: undefined };
  }
}

function envWith(kv: FakeKV, killed = false): Env {
  return {
    TENSORFEED_CACHE: kv,
    ...(killed ? { KILL_SWITCH_KV_WRITES: 'true' } : {}),
  } as unknown as Env;
}

function row(over: Partial<PricingRow> = {}): PricingRow {
  return {
    model: over.model ?? 'claude-opus-4-7',
    vendor: over.vendor ?? 'Anthropic',
    input_per_1m: over.input_per_1m ?? 15,
    output_per_1m: over.output_per_1m ?? 75,
    context_window: over.context_window ?? 1_000_000,
    modalities: over.modalities ?? ['text', 'image'],
    effective_date: over.effective_date ?? '2026-05-15',
    source_url: over.source_url ?? 'https://www.anthropic.com/pricing',
  };
}

function sub(id: string, rows: PricingRow[], over: Partial<SubmissionRecord> = {}): SubmissionRecord {
  return {
    id,
    gig_id: over.gig_id ?? 'gig-1',
    submitter_addr: over.submitter_addr ?? '0x' + 'a'.repeat(40),
    rows,
    notes: '',
    nonce: 'n-' + id,
    signed_at: 1_778_000_000,
    signature: '0xsig',
    status: 'accepted',
    signed_message: '{}',
    created_at: 1_778_000_000,
    decided_at: 1_778_000_100,
    decision_note: 'ok',
  };
}

beforeEach(() => {
  _resetIsolateMemoForTests();
});

describe('assembleIngestRecord', () => {
  it('carries provenance and is deterministic for caller-supplied time', () => {
    const r = sub('s1', [row()]);
    const ing = assembleIngestRecord(r, 1_778_001_000);
    expect(ing).toEqual({
      submission_id: 's1',
      gig_id: 'gig-1',
      submitter_addr: '0x' + 'a'.repeat(40),
      accepted_at: 1_778_001_000,
      rows: [row()],
    });
  });

  it('deep-copies rows so later mutation cannot reach the persisted record', () => {
    const original = row();
    const r = sub('s1', [original]);
    const ing = assembleIngestRecord(r, 1);
    original.modalities.push('audio');
    original.input_per_1m = 999;
    expect(ing.rows[0].modalities).toEqual(['text', 'image']);
    expect(ing.rows[0].input_per_1m).toBe(15);
  });
});

describe('ingestAcceptedSubmission / getIngest', () => {
  it('round-trips an accepted submission keyed by submission id', async () => {
    const kv = new FakeKV();
    const env = envWith(kv);
    const r = sub('s1', [row()]);
    expect(await ingestAcceptedSubmission(env, r, 1_778_001_000)).toBe(true);
    expect(kv.store.has(ingestKey('s1'))).toBe(true);
    const got = await getIngest(env, 's1');
    expect(got).toEqual(assembleIngestRecord(r, 1_778_001_000));
  });

  it('is idempotent: re-ingesting the same submission rewrites identically', async () => {
    const kv = new FakeKV();
    const env = envWith(kv);
    const r = sub('s1', [row()]);
    await ingestAcceptedSubmission(env, r, 42);
    await ingestAcceptedSubmission(env, r, 42);
    const all = await listIngest(env);
    expect(all).toHaveLength(1);
  });

  it('fails closed when the KV kill switch is active', async () => {
    const kv = new FakeKV();
    const env = envWith(kv, true);
    expect(await ingestAcceptedSubmission(env, sub('s1', [row()]), 1)).toBe(false);
    expect(kv.store.size).toBe(0);
  });

  it('reads a corrupt record as absent, not a throw', async () => {
    const kv = new FakeKV();
    const env = envWith(kv);
    await kv.put(ingestKey('bad'), '{not json');
    expect(await getIngest(env, 'bad')).toBeNull();
  });
});

describe('deleteIngest', () => {
  it('removes an existing ingest record and reports removed', async () => {
    const kv = new FakeKV();
    const env = envWith(kv);
    await ingestAcceptedSubmission(env, sub('s1', [row()]), 1);
    expect(await deleteIngest(env, 's1')).toBe('removed');
    expect(kv.store.has(ingestKey('s1'))).toBe(false);
    expect(await getIngest(env, 's1')).toBeNull();
  });

  it('reports not_found for an absent record (no throw)', async () => {
    const env = envWith(new FakeKV());
    expect(await deleteIngest(env, 'nope')).toBe('not_found');
  });

  it('fails closed under the kill switch and does not delete', async () => {
    const kv = new FakeKV();
    await ingestAcceptedSubmission(envWith(kv), sub('s1', [row()]), 1);
    // The non-killed setup write populated the kill-switch isolate memo;
    // reset it so the killed read is actually exercised (same pattern
    // the jobs-store kill-switch tests rely on).
    _resetIsolateMemoForTests();
    const killed = envWith(kv, true);
    expect(await deleteIngest(killed, 's1')).toBe('write_blocked');
    expect(kv.store.has(ingestKey('s1'))).toBe(true);
  });
});

describe('projectModelPricingFeed', () => {
  const recA: IngestRecord = {
    submission_id: 's1',
    gig_id: 'g1',
    submitter_addr: '0x1',
    accepted_at: 1000,
    rows: [
      row({ model: 'gpt-5', vendor: 'OpenAI', effective_date: '2026-05-10' }),
      row({ model: 'claude-opus-4-7', vendor: 'Anthropic', effective_date: '2026-05-10' }),
    ],
  };
  const recB: IngestRecord = {
    submission_id: 's2',
    gig_id: 'g2',
    submitter_addr: '0x2',
    accepted_at: 2000,
    rows: [
      row({ model: 'claude-opus-4-7', vendor: 'Anthropic', effective_date: '2026-05-14', input_per_1m: 14 }),
    ],
  };

  it('returns empty feed with null latest_accepted_at for no records', () => {
    const f = projectModelPricingFeed([]);
    expect(f.observations).toEqual([]);
    expect(f.latest).toEqual([]);
    expect(f.summary).toEqual({
      total_observations: 0,
      distinct_models: 0,
      distinct_vendors: 0,
      latest_accepted_at: null,
    });
  });

  it('sorts observations newest accepted_at first', () => {
    const f = projectModelPricingFeed([recA, recB]);
    expect(f.observations[0].submission_id).toBe('s2');
    expect(f.observations[0].accepted_at).toBe(2000);
    expect(f.summary.total_observations).toBe(3);
    expect(f.summary.latest_accepted_at).toBe(2000);
  });

  it('latest picks newest effective_date per (model,vendor)', () => {
    const f = projectModelPricingFeed([recA, recB]);
    const opus = f.latest.find((o) => o.model === 'claude-opus-4-7');
    expect(opus?.effective_date).toBe('2026-05-14');
    expect(opus?.input_per_1m).toBe(14);
    // gpt-5 appears once, distinct models = 2, distinct vendors = 2
    expect(f.summary.distinct_models).toBe(2);
    expect(f.summary.distinct_vendors).toBe(2);
  });

  it('filters by model and vendor case-insensitively', () => {
    const f = projectModelPricingFeed([recA, recB], { vendor: 'anthropic' });
    expect(f.observations.every((o) => o.vendor === 'Anthropic')).toBe(true);
    expect(f.observations).toHaveLength(2);
    const g = projectModelPricingFeed([recA, recB], { model: 'GPT-5' });
    expect(g.observations).toHaveLength(1);
    expect(g.observations[0].vendor).toBe('OpenAI');
  });

  it('applies the observations limit after sort but keeps full summary', () => {
    const f = projectModelPricingFeed([recA, recB], { limit: 1 });
    expect(f.observations).toHaveLength(1);
    expect(f.observations[0].accepted_at).toBe(2000);
    expect(f.summary.total_observations).toBe(3);
  });
});

describe('feed registry (Phase A foundation)', () => {
  it('pins the production namespace byte-for-byte', () => {
    // This is the load-bearing regression lock: if a future refactor
    // moves the live feed, the existing gigfeed:pricing:sub:* records
    // and /api/feeds/model-pricing would silently break. Do not relax.
    expect(INGEST_KEY_PREFIX).toBe('gigfeed:pricing:sub:');
    expect(DEFAULT_FEED_ID).toBe('pricing');
    expect(feedPrefix('pricing')).toBe('gigfeed:pricing:sub:');
  });

  it('default feed id reproduces the pre-registry key exactly', () => {
    expect(ingestKey('s1')).toBe('gigfeed:pricing:sub:s1');
    expect(ingestKey('s1')).toBe(ingestKey('s1', 'pricing'));
  });

  it('namespaces distinct feed ids without collision', () => {
    expect(feedPrefix('pricing')).not.toBe(feedPrefix('gpu-pricing'));
    expect(ingestKey('s1', 'pricing')).not.toBe(ingestKey('s1', 'gpu-pricing'));
  });

  it('recognizes the registered feed and rejects unknown ids', () => {
    expect(isRegisteredFeed('pricing')).toBe(true);
    expect(isRegisteredFeed('gpu-pricing')).toBe(false);
    expect(() => assertRegisteredFeed('pricing')).not.toThrow();
    expect(() => assertRegisteredFeed('nope')).toThrow('unregistered_feed:nope');
  });

  it('storage entrypoints reject an unregistered feed before any KV write', async () => {
    const kv = new FakeKV();
    const env = envWith(kv);
    await expect(
      ingestAcceptedSubmission(env, sub('s1', [row()]), 1, 'ghost'),
    ).rejects.toThrow('unregistered_feed:ghost');
    expect(kv.store.size).toBe(0);
    await expect(getIngest(env, 's1', 'ghost')).rejects.toThrow(
      'unregistered_feed:ghost',
    );
    await expect(deleteIngest(env, 's1', 'ghost')).rejects.toThrow(
      'unregistered_feed:ghost',
    );
    await expect(listIngest(env, 'ghost')).rejects.toThrow(
      'unregistered_feed:ghost',
    );
  });
});
