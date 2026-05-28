import { describe, it, expect, vi } from 'vitest';
import { crawlPublisherManifest, isValidPublisherDomain } from './publisher-registry';

describe('isValidPublisherDomain (SSRF guard)', () => {
  it('rejects localhost and loopback hostnames', () => {
    expect(isValidPublisherDomain('localhost')).toBe(false);
    expect(isValidPublisherDomain('app.localhost')).toBe(false);
  });

  it('rejects all IPv4 literals (public and private alike), since a publisher domain should always be a hostname', () => {
    expect(isValidPublisherDomain('127.0.0.1')).toBe(false);
    expect(isValidPublisherDomain('0.0.0.0')).toBe(false);
    expect(isValidPublisherDomain('10.0.0.1')).toBe(false);
    expect(isValidPublisherDomain('172.16.0.1')).toBe(false);
    expect(isValidPublisherDomain('192.168.1.1')).toBe(false);
    expect(isValidPublisherDomain('169.254.169.254')).toBe(false);
    expect(isValidPublisherDomain('8.8.8.8')).toBe(false);
    expect(isValidPublisherDomain('1.1.1.1')).toBe(false);
  });

  it('rejects IPv6 literals (loopback and global alike)', () => {
    expect(isValidPublisherDomain('[::1]')).toBe(false);
    expect(isValidPublisherDomain('[2001:db8::1]')).toBe(false);
    expect(isValidPublisherDomain('[fe80::1]')).toBe(false);
  });

  it('rejects mDNS and internal TLDs', () => {
    expect(isValidPublisherDomain('printer.local')).toBe(false);
    expect(isValidPublisherDomain('vault.internal')).toBe(false);
  });

  it('rejects userinfo, scheme, path, and query smuggling', () => {
    expect(isValidPublisherDomain('attacker.com@victim.com')).toBe(false);
    expect(isValidPublisherDomain('https://evil.com')).toBe(false);
    expect(isValidPublisherDomain('evil.com/path')).toBe(false);
    expect(isValidPublisherDomain('evil.com?q=1')).toBe(false);
    expect(isValidPublisherDomain('evil.com#frag')).toBe(false);
  });

  it('rejects single-label hostnames and empty input', () => {
    expect(isValidPublisherDomain('mailhost')).toBe(false);
    expect(isValidPublisherDomain('')).toBe(false);
    expect(isValidPublisherDomain('a'.repeat(254))).toBe(false);
  });

  it('accepts well-formed public domains', () => {
    expect(isValidPublisherDomain('tensorfeed.ai')).toBe(true);
    expect(isValidPublisherDomain('terminalfeed.io')).toBe(true);
    expect(isValidPublisherDomain('api.example.co.uk')).toBe(true);
  });
});

describe('crawlPublisherManifest SSRF integration', () => {
  it('returns invalid_domain error for SSRF-blocked input without making any HTTP call', async () => {
    const mockFetch = vi.fn();
    const rec = await crawlPublisherManifest('127.0.0.1', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('invalid_domain');
    expect(rec.pay_to_wallets).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does NOT construct a manifest_url from unvalidated input (log-injection guard)', async () => {
    const mockFetch = vi.fn();
    const rec = await crawlPublisherManifest('http://evil.com/path?x=1', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('invalid_domain');
    expect(rec.manifest_url).toBe('');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('treats a 3xx redirect response as an error rather than following it', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 302, json: async () => ({}) });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('redirect_302');
    expect(rec.pay_to_wallets).toEqual([]);
  });
});

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
