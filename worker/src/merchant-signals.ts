import type { Env } from './types';
import * as _m from './merchant-signals';

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

function toUtcMs(ts: string): number {
  const norm = /[zZ]|[+-]\d{2}:?\d{2}$/.test(ts) ? ts : `${ts}Z`;
  return Date.parse(norm);
}

function earliestNotBefore(rows: { not_before?: string }[], nowMs: number): number | null {
  const times = rows.map((r) => (r.not_before ? toUtcMs(r.not_before) : NaN)).filter((n) => !Number.isNaN(n));
  if (!times.length) return null;
  return Math.max(0, Math.floor((nowMs - Math.min(...times)) / DAY_MS));
}

export async function fetchCertFirstSeenDays(domain: string, nowMs: number): Promise<number | null> {
  try {
    const res = await fetch(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`, {
      headers: { 'user-agent': 'tensorfeed-merchant-verdict/1.0' }, signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const rows = (await res.json()) as { not_before?: string }[];
      const v = earliestNotBefore(rows, nowMs);
      if (v !== null) return v;
    }
  } catch { /* fall through to CertSpotter */ }
  try {
    const res = await fetch(`https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(domain)}&include_subdomains=true&expand=dns_names`, {
      headers: { 'user-agent': 'tensorfeed-merchant-verdict/1.0' }, signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as { not_before?: string }[];
    return earliestNotBefore(rows, nowMs);
  } catch {
    return null;
  }
}

export async function lookupMajestic(
  env: Env,
  domain: string,
): Promise<{ inIndex: boolean; rank: number | null; snapshot: string | null }> {
  try {
    const blob = (await env.TENSORFEED_CACHE.get('merchant:majestic-topn', 'json')) as {
      captured_at: string;
      ranks: Record<string, number>;
    } | null;
    if (!blob) return { inIndex: false, rank: null, snapshot: null };
    const rank = blob.ranks[domain];
    return { inIndex: rank !== undefined, rank: rank ?? null, snapshot: blob.captured_at };
  } catch {
    return { inIndex: false, rank: null, snapshot: null };
  }
}

let phishCache: { snapshot: string; set: Set<string> } | null = null;

export async function lookupPhishing(
  env: Env,
  domain: string,
): Promise<{ listed: boolean; snapshot: string | null }> {
  try {
    const blob = (await env.TENSORFEED_CACHE.get('merchant:phishing-active', 'json')) as {
      captured_at: string;
      domains: string[];
    } | null;
    if (!blob) return { listed: false, snapshot: null };
    if (!phishCache || phishCache.snapshot !== blob.captured_at) {
      phishCache = { snapshot: blob.captured_at, set: new Set(blob.domains) };
    }
    return { listed: phishCache.set.has(domain), snapshot: blob.captured_at };
  } catch {
    return { listed: false, snapshot: null };
  }
}

export async function fetchMerchantSignals(env: Env, domain: string, nowMs: number): Promise<MerchantSignals> {
  const [age, dns, cert, maj, phish] = await Promise.all([
    _m.fetchRdapAgeDays(domain, nowMs),
    _m.fetchDnsHygiene(domain),
    _m.fetchCertFirstSeenDays(domain, nowMs),
    _m.lookupMajestic(env, domain),
    _m.lookupPhishing(env, domain),
  ]);
  const dnsResolved = dns.mx || dns.spf || dns.dmarc !== null;
  return {
    domainAgeDays: age,
    dns,
    certFirstSeenDays: cert,
    majestic: { inIndex: maj.inIndex, rank: maj.rank },
    phishingListed: phish.listed,
    listSnapshots: { majestic: maj.snapshot, phishing: phish.snapshot },
    liveSignalsResolved: (age !== null ? 1 : 0) + (cert !== null ? 1 : 0) + (dnsResolved ? 1 : 0),
  };
}
