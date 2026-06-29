import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRdapAgeDays, fetchDnsHygiene, fetchCertFirstSeenDays, lookupMajestic, lookupPhishing } from './merchant-signals';

const NOW = Date.parse('2026-06-29T00:00:00Z');
beforeEach(() => { vi.restoreAllMocks(); });

describe('fetchRdapAgeDays', () => {
  it('parses the registration event into an age in days', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      events: [
        { eventAction: 'registration', eventDate: '2024-06-29T00:00:00Z' },
        { eventAction: 'last changed', eventDate: '2026-01-01T00:00:00Z' },
      ],
    }), { status: 200 }));
    expect(await fetchRdapAgeDays('example.com', NOW)).toBe(730);
  });
  it('returns null on a 404 (missing-TLD bootstrap)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not found', { status: 404 }));
    expect(await fetchRdapAgeDays('shop.io', NOW)).toBeNull();
  });
  it('returns null on a fetch throw, never raises', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('boom'));
    expect(await fetchRdapAgeDays('example.com', NOW)).toBeNull();
  });
});

describe('fetchDnsHygiene', () => {
  it('detects MX, SPF, and a DMARC reject policy', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const u = new URL(String(input));
      const name = u.searchParams.get('name'); const type = u.searchParams.get('type');
      if (type === 'MX') return new Response(JSON.stringify({ Status: 0, Answer: [{ type: 15, data: '5 mx.example.com.' }] }));
      if (name === 'example.com') return new Response(JSON.stringify({ Status: 0, Answer: [{ type: 16, data: '"v=spf1 include:_spf.example.com ~all"' }] }));
      if (name === '_dmarc.example.com') return new Response(JSON.stringify({ Status: 0, Answer: [{ type: 16, data: '"v=DMARC1; p=reject"' }] }));
      return new Response(JSON.stringify({ Status: 0 }));
    });
    expect(await fetchDnsHygiene('example.com')).toEqual({ mx: true, spf: true, dmarc: 'reject' });
  });
  it('returns all-absent on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('boom'));
    expect(await fetchDnsHygiene('example.com')).toEqual({ mx: false, spf: false, dmarc: null });
  });
});

describe('fetchCertFirstSeenDays', () => {
  it('parses crt.sh, coercing the Z-less timestamp to UTC', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([
      { not_before: '2026-03-28T00:00:00' }, { not_before: '2026-06-16T05:06:10' },
    ]), { status: 200 }));
    expect(await fetchCertFirstSeenDays('example.com', Date.parse('2026-06-29T00:00:00Z'))).toBe(93);
  });
  it('falls back to CertSpotter on a crt.sh 502', async () => {
    let call = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      call += 1;
      if (call === 1) return new Response('bad gateway', { status: 502 });
      return new Response(JSON.stringify([{ not_before: '2025-06-29T00:00:00Z' }]), { status: 200 });
    });
    expect(await fetchCertFirstSeenDays('example.com', Date.parse('2026-06-29T00:00:00Z'))).toBe(365);
  });
});

function envWith(map: Record<string, unknown>) {
  return { TENSORFEED_CACHE: { get: async (k: string) => map[k] ?? null } } as unknown as Parameters<typeof lookupMajestic>[0];
}

describe('KV list lookups', () => {
  it('returns rank when present and null when absent', async () => {
    const env = envWith({ 'merchant:majestic-topn': { captured_at: 'S', ranks: { 'example.com': 42 } } });
    expect(await lookupMajestic(env, 'example.com')).toEqual({ inIndex: true, rank: 42, snapshot: 'S' });
    expect(await lookupMajestic(env, 'nope.com')).toEqual({ inIndex: false, rank: null, snapshot: 'S' });
  });
  it('flags a phishing domain', async () => {
    const env = envWith({ 'merchant:phishing-active': { captured_at: 'S', domains: ['bad.com'] } });
    expect((await lookupPhishing(env, 'bad.com')).listed).toBe(true);
    expect((await lookupPhishing(env, 'ok.com')).listed).toBe(false);
  });
  it('degrades gracefully when KV is empty', async () => {
    const env = envWith({});
    expect(await lookupMajestic(env, 'example.com')).toEqual({ inIndex: false, rank: null, snapshot: null });
    expect(await lookupPhishing(env, 'bad.com')).toEqual({ listed: false, snapshot: null });
  });
});
