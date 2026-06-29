import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRdapAgeDays } from './merchant-signals';

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
