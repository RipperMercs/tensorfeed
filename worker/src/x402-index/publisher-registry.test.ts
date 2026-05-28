import { describe, it, expect, vi } from 'vitest';
import { crawlPublisherManifest } from './publisher-registry';

describe('crawlPublisherManifest', () => {
  it('extracts payTo wallets from a V2 manifest items[].accepts[]', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            accepts: [
              { scheme: 'exact', network: 'eip155:8453', payTo: '0xABC0000000000000000000000000000000000001' },
              { scheme: 'exact', network: 'eip155:8453', payTo: '0xABC0000000000000000000000000000000000002' },
            ],
          },
        ],
      }),
    });

    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);

    expect(rec.domain).toBe('example.com');
    expect(rec.manifest_url).toBe('https://example.com/.well-known/x402.json');
    expect(rec.pay_to_wallets).toEqual([
      '0xabc0000000000000000000000000000000000001',
      '0xabc0000000000000000000000000000000000002',
    ]);
    expect(rec.last_crawled).toBe('2026-05-27T00:00:00.000Z');
    expect(rec.last_crawl_error).toBeNull();
  });

  it('returns empty wallets when accepts has no Base network entries', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          { accepts: [{ scheme: 'exact', network: 'solana', payTo: '0xABC' }] },
        ],
      }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets).toEqual([]);
    expect(rec.last_crawl_error).toBeNull();
  });

  it('handles V1 flat accepts[] shape', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accepts: [{ scheme: 'exact', network: 'base', payTo: '0xV1A0000000000000000000000000000000000001' }],
      }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets).toEqual(['0xv1a0000000000000000000000000000000000001']);
  });

  it('records HTTP error when manifest fetch returns non-2xx', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('HTTP 404');
    expect(rec.pay_to_wallets).toEqual([]);
  });

  it('records exception when fetch throws', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network blew up'));
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('network blew up');
  });

  it('dedupes duplicate wallets across multiple accepts entries', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            accepts: [
              { scheme: 'exact', network: 'base', payTo: '0xDUP000000000000000000000000000000000DEAD' },
              { scheme: 'exact', network: 'eip155:8453', payTo: '0xdup000000000000000000000000000000000DEAD' },
            ],
          },
        ],
      }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets).toEqual(['0xdup000000000000000000000000000000000dead']);
  });
});
