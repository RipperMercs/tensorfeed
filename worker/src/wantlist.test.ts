import { describe, expect, it } from 'vitest';
import {
  buildNotificationEmail,
  listWantlist,
  parseSubmission,
  slugifyTopic,
  submitWantlistItem,
  WANTLIST_DEFAULTS,
} from './wantlist';
import type { WantlistItem } from './wantlist';

function makeKv(): { kv: any; store: Map<string, string> } {
  const store = new Map<string, string>();
  const kv = {
    async get(key: string, fmt?: string) {
      const raw = store.get(key);
      if (raw === undefined) return null;
      return fmt === 'json' ? JSON.parse(raw) : raw;
    },
    async put(key: string, value: string, _opts?: unknown) {
      store.set(key, value);
    },
  };
  return { kv, store };
}

describe('slugifyTopic', () => {
  it('lowercases, strips punctuation, joins with hyphens', () => {
    expect(slugifyTopic('Real Estate Records')).toBe('real-estate-records');
    expect(slugifyTopic('  AI/ML Benchmarks!! ')).toBe('ai-ml-benchmarks');
  });
  it('caps at 50 chars', () => {
    expect(slugifyTopic('a'.repeat(80)).length).toBe(50);
  });
});

describe('parseSubmission', () => {
  it('accepts a valid submission', () => {
    const out = parseSubmission({
      topic: 'sec filings',
      request_type: 'data_source',
      description: 'I want structured deltas of 10-K filings year over year.',
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.item.topic).toBe('sec filings');
      expect(out.item.request_type).toBe('data_source');
    }
  });
  it('rejects missing topic', () => {
    expect(parseSubmission({ description: 'd' }).ok).toBe(false);
  });
  it('rejects missing description', () => {
    expect(parseSubmission({ topic: 't' }).ok).toBe(false);
  });
  it('rejects topic too long', () => {
    const out = parseSubmission({ topic: 'a'.repeat(100), description: 'd' });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toBe('topic_too_long');
  });
  it('rejects description too long', () => {
    const out = parseSubmission({ topic: 't', description: 'a'.repeat(600) });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toBe('description_too_long');
  });
  it('rejects invalid request_type', () => {
    const out = parseSubmission({ topic: 't', description: 'd', request_type: 'bogus' });
    expect(out.ok).toBe(false);
  });
  it('defaults request_type to "other" when omitted', () => {
    const out = parseSubmission({ topic: 't', description: 'd' });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.item.request_type).toBe('other');
  });
  it('accepts optional contact and trims it', () => {
    const out = parseSubmission({
      topic: 't',
      description: 'd',
      contact_optional: '  hello@example.com  ',
    });
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.item.contact_optional).toBe('hello@example.com');
  });
  it('rejects contact too long', () => {
    const out = parseSubmission({
      topic: 't',
      description: 'd',
      contact_optional: 'a'.repeat(300),
    });
    expect(out.ok).toBe(false);
  });
});

describe('submitWantlistItem', () => {
  it('persists an item, the index, and the topic counter', async () => {
    const { kv, store } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const out = await submitWantlistItem(env, '1.2.3.4', {
      topic: 'real estate records',
      description: 'Structured public US property records by parcel id.',
      request_type: 'data_source',
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // Item persisted under wantlist:item:{id}
    expect(store.has(`wantlist:item:${out.id}`)).toBe(true);
    // Index updated
    const idx = JSON.parse(store.get('wantlist:index')!);
    expect(idx[0]).toBe(out.id);
    // Topic counter created at 1
    const counter = JSON.parse(store.get('wantlist:topic:real-estate-records')!);
    expect(counter).toBe(1);
  });

  it('blocks an IP after 5 submissions in the same UTC day', async () => {
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const ip = '5.5.5.5';
    for (let i = 0; i < WANTLIST_DEFAULTS.RL_PER_IP_PER_DAY; i += 1) {
      const r = await submitWantlistItem(env, ip, {
        topic: `t${i}`,
        description: 'd'.repeat(20),
      });
      expect(r.ok).toBe(true);
    }
    const denied = await submitWantlistItem(env, ip, {
      topic: 't-overflow',
      description: 'd'.repeat(20),
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toBe('rate_limit_exceeded');
  });

  it('does not count failed submissions against the rate limit', async () => {
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const ip = '6.6.6.6';
    // Hit with malformed bodies first; should not consume quota.
    for (let i = 0; i < 3; i += 1) {
      await submitWantlistItem(env, ip, { topic: '' as unknown as string });
    }
    // 5 valid submissions should still all be accepted.
    for (let i = 0; i < WANTLIST_DEFAULTS.RL_PER_IP_PER_DAY; i += 1) {
      const r = await submitWantlistItem(env, ip, {
        topic: `valid${i}`,
        description: 'd'.repeat(20),
      });
      expect(r.ok).toBe(true);
    }
  });
});

describe('listWantlist', () => {
  it('returns empty snapshot when nothing has been submitted', async () => {
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    const snap = await listWantlist(env);
    expect(snap.items_indexed).toBe(0);
    expect(snap.recent).toEqual([]);
    expect(snap.top_topics).toEqual([]);
    expect(snap.ttl_days).toBe(30);
    expect(snap.rate_limit_per_ip_per_day).toBe(5);
  });

  it('aggregates top topics from the recent window', async () => {
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    // Three submissions on "sec filings", one on "real estate".
    for (let i = 0; i < 3; i += 1) {
      await submitWantlistItem(env, `${i}.${i}.${i}.${i}`, {
        topic: 'sec filings',
        description: 'd'.repeat(20),
      });
    }
    await submitWantlistItem(env, '9.9.9.9', {
      topic: 'real estate records',
      description: 'd'.repeat(20),
    });

    const snap = await listWantlist(env);
    expect(snap.items_indexed).toBe(4);
    expect(snap.top_topics[0]).toEqual({ topic_slug: 'sec-filings', count: 3 });
    expect(snap.top_topics[1]).toEqual({ topic_slug: 'real-estate-records', count: 1 });
  });

  it('caps recent items at the requested limit', async () => {
    const { kv } = makeKv();
    const env = { TENSORFEED_CACHE: kv } as any;
    // 5 distinct IPs, each submits 1 item (rate limit per IP is 5).
    for (let i = 0; i < 5; i += 1) {
      await submitWantlistItem(env, `${i}.0.0.1`, {
        topic: `topic ${i}`,
        description: 'd'.repeat(20),
      });
    }
    const snap = await listWantlist(env, 2);
    expect(snap.recent.length).toBe(2);
  });
});

describe('buildNotificationEmail', () => {
  const item: WantlistItem = {
    id: 'abc-test',
    created_at: '2026-05-13T03:30:00Z',
    topic: 'real estate records',
    topic_slug: 'real-estate-records',
    request_type: 'data_source',
    description: 'Structured public US property records by parcel id.',
    contact_optional: 'agent@example.com',
  };

  it('produces a subject including request_type and topic', () => {
    const out = buildNotificationEmail(item, '1.2.3.4');
    expect(out.subject).toContain('data_source');
    expect(out.subject).toContain('real estate records');
    expect(out.subject.length).toBeLessThanOrEqual(200);
  });

  it('includes all key fields in the text body', () => {
    const out = buildNotificationEmail(item, '1.2.3.4');
    expect(out.text).toContain('real estate records');
    expect(out.text).toContain('data_source');
    expect(out.text).toContain('Structured public US property records');
    expect(out.text).toContain('agent@example.com');
    expect(out.text).toContain('1.2.3.4');
    expect(out.text).toContain('abc-test');
  });

  it('renders "(none)" when contact_optional is absent', () => {
    const noContact = { ...item, contact_optional: null };
    const out = buildNotificationEmail(noContact, '1.2.3.4');
    expect(out.text).toContain('Contact: (none)');
  });

  it('escapes HTML special chars in user-supplied fields', () => {
    const xss = { ...item, topic: '<script>alert(1)</script>', description: 'Use & abuse < > "stuff"' };
    const out = buildNotificationEmail(xss, '1.2.3.4');
    expect(out.html).not.toContain('<script>alert(1)</script>');
    expect(out.html).toContain('&lt;script&gt;');
    expect(out.html).toContain('Use &amp; abuse');
  });
});

describe('submit returns a notify_promise side-effect', () => {
  it('attaches notify_promise on a successful submission', async () => {
    const { kv } = (() => {
      const store = new Map<string, string>();
      const k = {
        async get(key: string, fmt?: string) {
          const raw = store.get(key);
          if (raw === undefined) return null;
          return fmt === 'json' ? JSON.parse(raw) : raw;
        },
        async put(key: string, value: string) {
          store.set(key, value);
        },
      };
      return { kv: k };
    })();
    const env = { TENSORFEED_CACHE: kv } as any;
    const out = await submitWantlistItem(env, '1.2.3.4', {
      topic: 't',
      description: 'd'.repeat(20),
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.notify_promise).toBeDefined();
      // No env email vars, sendEmail returns false (no-op) but does not throw.
      const result = await out.notify_promise;
      expect(result).toBe(false);
    }
  });
});
