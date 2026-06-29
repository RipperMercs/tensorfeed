import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as signals from './merchant-signals';

beforeEach(() => { vi.restoreAllMocks(); });

describe('fetchMerchantSignals', () => {
  it('assembles all five signals and counts resolved live ones', async () => {
    vi.spyOn(signals, 'fetchRdapAgeDays').mockResolvedValue(800);
    vi.spyOn(signals, 'fetchDnsHygiene').mockResolvedValue({ mx: true, spf: true, dmarc: 'reject' });
    vi.spyOn(signals, 'fetchCertFirstSeenDays').mockResolvedValue(790);
    vi.spyOn(signals, 'lookupMajestic').mockResolvedValue({ inIndex: true, rank: 5000, snapshot: 'M' });
    vi.spyOn(signals, 'lookupPhishing').mockResolvedValue({ listed: false, snapshot: 'P' });
    const env = {} as never;
    const r = await signals.fetchMerchantSignals(env, 'example.com', Date.parse('2026-06-29T00:00:00Z'));
    expect(r.domainAgeDays).toBe(800);
    expect(r.majestic).toEqual({ inIndex: true, rank: 5000 });
    expect(r.listSnapshots).toEqual({ majestic: 'M', phishing: 'P' });
    expect(r.liveSignalsResolved).toBe(3);
  });
});
