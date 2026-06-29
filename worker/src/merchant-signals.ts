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

async function doh(name: string, type: 'MX' | 'TXT'): Promise<{ type: number; data: string }[]> {
  const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
    headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { Answer?: { type: number; data: string }[] };
  return body.Answer ?? [];
}

function txtValues(answers: { type: number; data: string }[]): string[] {
  return answers.filter((a) => a.type === 16).map((a) => a.data.replace(/^"|"$/g, '').replace(/" "/g, ''));
}

export async function fetchDnsHygiene(domain: string): Promise<MerchantSignals['dns']> {
  try {
    const [mxA, txtA, dmarcA] = await Promise.all([doh(domain, 'MX'), doh(domain, 'TXT'), doh(`_dmarc.${domain}`, 'TXT')]);
    const mx = mxA.some((a) => a.type === 15);
    const spf = txtValues(txtA).some((t) => t.toLowerCase().startsWith('v=spf1'));
    const dmarcTxt = txtValues(dmarcA).find((t) => t.toLowerCase().startsWith('v=dmarc1'));
    let dmarc: MerchantSignals['dns']['dmarc'] = null;
    if (dmarcTxt) {
      const p = /p\s*=\s*(none|quarantine|reject)/i.exec(dmarcTxt)?.[1]?.toLowerCase();
      dmarc = (p as MerchantSignals['dns']['dmarc']) ?? 'none';
    }
    return { mx, spf, dmarc };
  } catch {
    return { mx: false, spf: false, dmarc: null };
  }
}

void (0 as unknown as Env);
