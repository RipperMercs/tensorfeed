import type { Env } from './types';

export interface MerchantSignals {
  domainAgeDays: number | null;
  dns: { mx: boolean; spf: boolean; dmarc: 'none' | 'quarantine' | 'reject' | null };
  certFirstSeenDays: number | null;
  majestic: { inIndex: boolean; rank: number | null };
  phishingListed: boolean;
  listSnapshots: { majestic: string | null; phishing: string | null };
  liveSignalsResolved: number;
}

const DAY_MS = 86_400_000;

export async function fetchRdapAgeDays(domain: string, nowMs: number): Promise<number | null> {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { accept: 'application/rdap+json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { events?: { eventAction?: string; eventDate?: string }[] };
    const reg = body.events?.find((e) => e.eventAction === 'registration')?.eventDate;
    if (!reg) return null;
    const regMs = Date.parse(reg);
    if (Number.isNaN(regMs)) return null;
    return Math.max(0, Math.floor((nowMs - regMs) / DAY_MS));
  } catch {
    return null;
  }
}

void (0 as unknown as Env);
