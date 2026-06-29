import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRdapAgeDays, fetchDnsHygiene } from './merchant-signals';

const NOW = Date.parse('2026-06-29T00:00:00Z');
beforeEach(() => vi.restoreAllMocks());

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
