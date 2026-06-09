import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildIndexNowPayload, pingIndexNow, STATUS_CHANGE_URLS } from './indexnow';

describe('buildIndexNowPayload', () => {
  it('builds the spec payload with host, key, keyLocation, urlList', () => {
    const p = buildIndexNowPayload('abc123', ['https://tensorfeed.ai/status']);
    expect(p).toEqual({
      host: 'tensorfeed.ai',
      key: 'abc123',
      keyLocation: 'https://tensorfeed.ai/abc123.txt',
      urlList: ['https://tensorfeed.ai/status'],
    });
  });
});

describe('STATUS_CHANGE_URLS', () => {
  it('includes the status hub', () => {
    expect(STATUS_CHANGE_URLS).toContain('https://tensorfeed.ai/status');
  });
});

describe('pingIndexNow', () => {
  const realFetch = globalThis.fetch;
  let calls: Array<{ url: string; body: string }>;

  beforeEach(() => {
    calls = [];
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), body: String(init?.body ?? '') });
      return new Response('ok', { status: 200 });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('no-ops without a key', async () => {
    const sent = await pingIndexNow({ INDEXNOW_KEY: undefined }, ['https://tensorfeed.ai/status'], 'test');
    expect(sent).toBe(false);
    expect(calls.length).toBe(0);
  });

  it('no-ops on an empty url list', async () => {
    const sent = await pingIndexNow({ INDEXNOW_KEY: 'k' }, [], 'test');
    expect(sent).toBe(false);
    expect(calls.length).toBe(0);
  });

  it('POSTs the payload to api.indexnow.org', async () => {
    const sent = await pingIndexNow({ INDEXNOW_KEY: 'k' }, ['https://tensorfeed.ai/status'], 'status-flip');
    expect(sent).toBe(true);
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe('https://api.indexnow.org/indexnow');
    const body = JSON.parse(calls[0].body) as { key: string; urlList: string[] };
    expect(body.key).toBe('k');
    expect(body.urlList).toEqual(['https://tensorfeed.ai/status']);
  });

  it('swallows fetch failures and returns false', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down');
    }) as typeof fetch;
    const sent = await pingIndexNow({ INDEXNOW_KEY: 'k' }, ['https://tensorfeed.ai/status'], 'test');
    expect(sent).toBe(false);
  });
});
