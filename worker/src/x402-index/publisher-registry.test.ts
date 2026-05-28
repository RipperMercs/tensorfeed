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

  it('rejects CRLF / tab / null-byte / whitespace smuggling that the URL parser would strip', () => {
    expect(isValidPublisherDomain('evil.com\r\n.example.com')).toBe(false);
    expect(isValidPublisherDomain('evil.com\n.example.com')).toBe(false);
    expect(isValidPublisherDomain('evil.com\t.example.com')).toBe(false);
    expect(isValidPublisherDomain('evil.com ')).toBe(false);
    expect(isValidPublisherDomain('evil.com\x00.com')).toBe(false);
  });

  it('rejects IDN / Unicode homograph attempts (Cyrillic look-alikes)', () => {
    // Cyrillic small letter ie (U+0435) looks like Latin 'e'
    expect(isValidPublisherDomain('еxample.com')).toBe(false);
    // Fullwidth dot (U+3002) looks like ASCII '.'
    expect(isValidPublisherDomain('127。0。0。1')).toBe(false);
  });

  it('rejects alternate IP encodings that URL parser canonicalizes to private ranges', () => {
    expect(isValidPublisherDomain('2130706433')).toBe(false);     // decimal form of 127.0.0.1
    expect(isValidPublisherDomain('0x7f000001')).toBe(false);     // hex form of 127.0.0.1
    expect(isValidPublisherDomain('127.1')).toBe(false);          // shorthand IPv4
    expect(isValidPublisherDomain('0177.0.0.1')).toBe(false);     // octal form
  });

  it('rejects empty / oversized DNS labels', () => {
    expect(isValidPublisherDomain('..example.com')).toBe(false);
    expect(isValidPublisherDomain('.example.com')).toBe(false);
    expect(isValidPublisherDomain('example..com')).toBe(false);
    expect(isValidPublisherDomain('a'.repeat(64) + '.com')).toBe(false); // label > 63
  });
});

describe('crawlPublisherManifest SSRF integration', () => {
  it('returns invalid_domain error for SSRF-blocked input without making any HTTP call', async () => {
    const mockFetch = vi.fn();
    const rec = await crawlPublisherManifest('127.0.0.1', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('invalid_domain');
    expect(rec.pay_to_wallets).toEqual([]);
    expect(rec.domain).toBe('');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does NOT construct a manifest_url from unvalidated input (log-injection guard)', async () => {
    const mockFetch = vi.fn();
    const rec = await crawlPublisherManifest('http://evil.com/path?x=1', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('invalid_domain');
    expect(rec.manifest_url).toBe('');
    expect(rec.domain).toBe('');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('treats a 3xx redirect response as an error rather than following it', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 302,
      headers: { get: () => null },
      text: async () => '',
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('redirect_302');
    expect(rec.pay_to_wallets).toEqual([]);
  });
});

describe('crawlPublisherManifest', () => {
  it('extracts payTo wallets from a V2 manifest items[].accepts[]', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      text: async () => JSON.stringify({
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
      headers: { get: () => null },
      text: async () => JSON.stringify({
        items: [
          { accepts: [{ scheme: 'exact', network: 'solana', payTo: '0xabc0000000000000000000000000000000000001' }] },
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
      headers: { get: () => null },
      text: async () => JSON.stringify({
        accepts: [{ scheme: 'exact', network: 'base', payTo: '0xa1a0000000000000000000000000000000000001' }],
      }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets).toEqual(['0xa1a0000000000000000000000000000000000001']);
  });

  it('records HTTP error when manifest fetch returns non-2xx', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => null },
      text: async () => '',
    });
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
      headers: { get: () => null },
      text: async () => JSON.stringify({
        items: [
          {
            accepts: [
              { scheme: 'exact', network: 'base', payTo: '0xd00000000000000000000000000000000000dead' },
              { scheme: 'exact', network: 'eip155:8453', payTo: '0xD00000000000000000000000000000000000DEAD' },
            ],
          },
        ],
      }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets).toEqual(['0xd00000000000000000000000000000000000dead']);
  });
});

describe('crawlPublisherManifest record-storage hardening', () => {
  it('stores the normalized hostname on the record, not the raw domain argument', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      text: async () => JSON.stringify({ items: [{ accepts: [{ scheme: 'exact', network: 'base', payTo: '0xABC0000000000000000000000000000000000001' }] }] }),
    });
    // Valid input but with mixed case + trailing dot
    const rec = await crawlPublisherManifest('TENSORFEED.AI.', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.domain).toBe('tensorfeed.ai');
    expect(rec.manifest_url).toBe('https://tensorfeed.ai/.well-known/x402.json');
  });

  it('returns empty domain (not the raw input) for SSRF-rejected input', async () => {
    const mockFetch = vi.fn();
    const rec = await crawlPublisherManifest('evil.com\r\n[FAKE_LOG]', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.domain).toBe('');
    expect(rec.manifest_url).toBe('');
    expect(rec.last_crawl_error).toBe('invalid_domain');
  });
});

describe('crawlPublisherManifest manifest-content hardening', () => {
  it('rejects manifests over 1 MB via Content-Length header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (k: string) => (k.toLowerCase() === 'content-length' ? '2000000' : null) },
      text: async () => '',
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('manifest_too_large');
  });

  it('rejects manifests over 1 MB via response body size', async () => {
    const huge = 'x'.repeat(1_000_001);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      text: async () => huge,
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('manifest_too_large');
  });

  it('handles JSON parse errors gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      text: async () => 'not json {{{',
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('manifest_parse_error');
  });

  it('skips payTo values that do not match the Ethereum address regex', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      text: async () => JSON.stringify({
        items: [{
          accepts: [
            { scheme: 'exact', network: 'base', payTo: '<script>alert(1)</script>' },
            { scheme: 'exact', network: 'base', payTo: '0xABC0000000000000000000000000000000000001' },
            { scheme: 'exact', network: 'base', payTo: 'not-an-address' },
          ],
        }],
      }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets).toEqual(['0xabc0000000000000000000000000000000000001']);
  });

  it('caps pay_to_wallets at 100 entries even for absurd accepts arrays', async () => {
    const accepts = Array.from({ length: 250 }, (_, i) => ({
      scheme: 'exact',
      network: 'base',
      payTo: '0x' + i.toString(16).padStart(40, '0'),
    }));
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      text: async () => JSON.stringify({ items: [{ accepts }] }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets.length).toBe(100);
  });

  it('only counts accepts with scheme=exact', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      text: async () => JSON.stringify({
        items: [{
          accepts: [
            { scheme: 'streaming', network: 'base', payTo: '0xABC0000000000000000000000000000000000001' },
            { scheme: 'exact', network: 'base', payTo: '0xABC0000000000000000000000000000000000002' },
          ],
        }],
      }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets).toEqual(['0xabc0000000000000000000000000000000000002']);
  });
});
