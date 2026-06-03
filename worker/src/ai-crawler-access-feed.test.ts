// worker/src/ai-crawler-access-feed.test.ts
import { describe, it, expect } from 'vitest';
import { computeStats, detectFlips, oldestCheckedAt, verdictsFromRobots, looksLikeJson, looksLikeText, isSafeCrawlTarget } from './ai-crawler-access-feed';
import type { DomainRecord } from './ai-crawler-access-feed';

describe('looksLikeJson', () => {
  it('accepts JSON objects and arrays', () => {
    expect(looksLikeJson('{"x402Version":2}')).toBe(true);
    expect(looksLikeJson('  [1,2,3] ')).toBe(true);
  });
  it('rejects HTML soft-404 bodies', () => {
    expect(looksLikeJson('<!doctype html><html>...')).toBe(false);
    expect(looksLikeJson('<html><body>Not Found</body></html>')).toBe(false);
  });
  it('rejects non-JSON, bare strings, empty, and null', () => {
    expect(looksLikeJson('hello')).toBe(false);
    expect(looksLikeJson('"just a string"')).toBe(false);
    expect(looksLikeJson('')).toBe(false);
    expect(looksLikeJson(null)).toBe(false);
  });
});

describe('looksLikeText', () => {
  it('accepts plain text and markdown', () => {
    expect(looksLikeText('# llms.txt\nSome guidance')).toBe(true);
    expect(looksLikeText('User-agent: *')).toBe(true);
  });
  it('rejects HTML and XML soft-404 bodies, empty, and null', () => {
    expect(looksLikeText('<!DOCTYPE html><html>...')).toBe(false);
    expect(looksLikeText('<?xml version="1.0"?>')).toBe(false);
    expect(looksLikeText('   ')).toBe(false);
    expect(looksLikeText(null)).toBe(false);
  });
});

describe('verdictsFromRobots', () => {
  it('parses a 2xx robots.txt body', () => {
    expect(verdictsFromRobots(200, 'User-agent: GPTBot\nDisallow: /').GPTBot).toBe('blocked');
  });
  it('treats a 404 (no robots.txt) as allowed per RFC 9309', () => {
    const v = verdictsFromRobots(404, null);
    expect(v.GPTBot).toBe('allowed');
    expect(v.ClaudeBot).toBe('allowed');
  });
  it('treats a 410 as allowed', () => {
    expect(verdictsFromRobots(410, null).GPTBot).toBe('allowed');
  });
  it('treats a 403 as unknown (ambiguous bot-block, not a readable policy)', () => {
    expect(verdictsFromRobots(403, null).GPTBot).toBe('unknown');
  });
  it('treats a 5xx as unknown', () => {
    expect(verdictsFromRobots(503, null).GPTBot).toBe('unknown');
  });
  it('treats a network failure (null status) as unknown', () => {
    expect(verdictsFromRobots(null, null).GPTBot).toBe('unknown');
  });
});

function rec(over: Partial<DomainRecord>): DomainRecord {
  return {
    domain: 'a.com', sector: 'saas', checkedAt: '2026-06-02T00:00:00Z',
    robotsStatus: 200, bots: { GPTBot: 'allowed', ClaudeBot: 'blocked' },
    hasLlmsTxt: false, hasAiTxt: false, llmsTxtBytes: null, ...over,
  };
}

describe('computeStats', () => {
  it('computes blocked/allowed percentages excluding unknown', () => {
    const byDomain = {
      'a.com': rec({ domain: 'a.com', bots: { GPTBot: 'allowed' } }),
      'b.com': rec({ domain: 'b.com', bots: { GPTBot: 'blocked' } }),
      'c.com': rec({ domain: 'c.com', bots: { GPTBot: 'unknown' } }),
    };
    const s = computeStats(byDomain, 14);
    expect(s.domainsWithData).toBe(3);
    // GPTBot known verdicts: 1 allowed, 1 blocked, unknown excluded => 50%
    expect(s.botBlockedPct.GPTBot).toBe(50);
    expect(s.botAllowedPct.GPTBot).toBe(50);
  });
  it('computes llms.txt adoption and per-sector rollup', () => {
    const byDomain = {
      'a.com': rec({ domain: 'a.com', sector: 'saas', hasLlmsTxt: true }),
      'b.com': rec({ domain: 'b.com', sector: 'saas', hasLlmsTxt: false }),
    };
    const s = computeStats(byDomain, 14);
    expect(s.llmsTxtAdoptionPct).toBe(50);
    expect(s.bySector.saas).toEqual({ domains: 2, llmsTxt: 1 });
  });
});

describe('detectFlips', () => {
  it('returns empty when no prior record', () => {
    expect(detectFlips(undefined, rec({}), '2026-06-02T00:00:00Z')).toEqual([]);
  });
  it('records a bot verdict change', () => {
    const prev = rec({ bots: { ClaudeBot: 'blocked' } });
    const next = rec({ bots: { ClaudeBot: 'allowed' } });
    const flips = detectFlips(prev, next, '2026-06-02T01:00:00Z');
    expect(flips).toContainEqual({ domain: 'a.com', field: 'ClaudeBot', from: 'blocked', to: 'allowed', at: '2026-06-02T01:00:00Z' });
  });
  it('records llms.txt appearing', () => {
    const flips = detectFlips(rec({ hasLlmsTxt: false }), rec({ hasLlmsTxt: true }), '2026-06-02T01:00:00Z');
    expect(flips).toContainEqual({ domain: 'a.com', field: 'llms.txt', from: 'absent', to: 'present', at: '2026-06-02T01:00:00Z' });
  });
});

describe('oldestCheckedAt', () => {
  it('returns the minimum ISO timestamp', () => {
    const byDomain = {
      'a.com': rec({ domain: 'a.com', checkedAt: '2026-06-02T05:00:00Z' }),
      'b.com': rec({ domain: 'b.com', checkedAt: '2026-05-30T05:00:00Z' }),
    };
    expect(oldestCheckedAt(byDomain)).toBe('2026-05-30T05:00:00Z');
  });
});

describe('isSafeCrawlTarget (crawler SSRF guard)', () => {
  it('allows ordinary https public hosts and their redirect targets', () => {
    expect(isSafeCrawlTarget('https://openai.com/robots.txt')).toBe(true);
    expect(isSafeCrawlTarget('https://www.anthropic.com/llms.txt')).toBe(true);
    expect(isSafeCrawlTarget('https://api.example.co.uk/.well-known/x402.json')).toBe(true);
  });

  it('does NOT block public domains that merely start with fc / fd', () => {
    // Regression guard: the IPv6 unique-local prefix check (fc00::/7) must only
    // fire on bracketed IPv6 literals, never on hostnames like these.
    expect(isSafeCrawlTarget('https://fcbarcelona.com/robots.txt')).toBe(true);
    expect(isSafeCrawlTarget('https://fd-example.com/robots.txt')).toBe(true);
    expect(isSafeCrawlTarget('https://feedly.com/ai.txt')).toBe(true);
  });

  it('blocks the https-to-http downgrade and exotic schemes', () => {
    expect(isSafeCrawlTarget('http://example.com/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('ftp://example.com/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('file:///etc/passwd')).toBe(false);
  });

  it('blocks localhost and loopback', () => {
    expect(isSafeCrawlTarget('https://localhost/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://api.localhost/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://127.0.0.1/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://127.99.4.1/robots.txt')).toBe(false);
  });

  it('blocks the trailing-dot FQDN-root form of internal names', () => {
    // Regression: "localhost." resolves to loopback but escapes the bare-name
    // guards without trailing-dot normalization (adversarial audit, 2026-06).
    expect(isSafeCrawlTarget('https://localhost./robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://localhost../robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://api.localhost./robots.txt')).toBe(false);
    // A legit public host with a trailing dot stays allowed (no over-block).
    expect(isSafeCrawlTarget('https://example.com./robots.txt')).toBe(true);
  });

  it('blocks RFC1918 private, CGNAT, and reserved IPv4 literals', () => {
    expect(isSafeCrawlTarget('https://10.0.0.1/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://172.16.5.9/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://172.31.255.255/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://192.168.1.1/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://100.64.0.1/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://0.0.0.0/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://239.0.0.1/robots.txt')).toBe(false);
  });

  it('does NOT over-block public IPv4 adjacent to private ranges', () => {
    expect(isSafeCrawlTarget('https://172.15.0.1/robots.txt')).toBe(true); // just below 172.16/12
    expect(isSafeCrawlTarget('https://172.32.0.1/robots.txt')).toBe(true); // just above 172.16/12
    expect(isSafeCrawlTarget('https://100.63.0.1/robots.txt')).toBe(true); // just below CGNAT
    expect(isSafeCrawlTarget('https://8.8.8.8/robots.txt')).toBe(true);
  });

  it('blocks the cloud metadata link-local address', () => {
    expect(isSafeCrawlTarget('https://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(isSafeCrawlTarget('https://169.254.0.1/robots.txt')).toBe(false);
  });

  it('blocks integer / hex obfuscated IPv4 (new URL normalizes to dotted-quad)', () => {
    expect(isSafeCrawlTarget('https://2130706433/robots.txt')).toBe(false); // 127.0.0.1
    expect(isSafeCrawlTarget('https://0x7f000001/robots.txt')).toBe(false); // 127.0.0.1
  });

  it('blocks private / loopback / link-local IPv6 literals but allows global IPv6', () => {
    expect(isSafeCrawlTarget('https://[::1]/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://[::]/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://[fe80::1]/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://[fc00::1]/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://[fd12:3456::1]/robots.txt')).toBe(false);
    expect(isSafeCrawlTarget('https://[::ffff:127.0.0.1]/robots.txt')).toBe(false); // v4-mapped
    expect(isSafeCrawlTarget('https://[2606:4700::1]/robots.txt')).toBe(true); // global
  });

  it('rejects unparseable input', () => {
    expect(isSafeCrawlTarget('not a url')).toBe(false);
    expect(isSafeCrawlTarget('')).toBe(false);
  });
});
