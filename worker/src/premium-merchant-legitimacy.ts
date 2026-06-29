// Merchant legitimacy verdict module. Pure deterministic rubric over five
// open-data signals: RDAP domain age, DoH DNS hygiene, crt.sh cert history,
// Majestic popularity rank, and Phishing.Database active list.

import type { Env } from './types';
import type { MerchantSignals } from './merchant-signals';
import { safePut } from './kill-switch';

const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export function normalizeDomain(raw: string): string | null {
  if (!raw) return null;
  let d = raw.trim().toLowerCase();
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, ''); // strip scheme
  d = d.split('/')[0].split('?')[0];             // strip path and query
  d = d.split('@').pop() as string;              // strip any userinfo
  d = d.split(':')[0];                           // strip port
  if (d.startsWith('www.')) d = d.slice(4);
  return DOMAIN_RE.test(d) ? d : null;
}

export type MerchantVerdict = 'proceed' | 'step_up' | 'block' | 'insufficient_data';

export interface MerchantLegitimacyResult {
  ok: true;
  capturedAt: string;
  domain: string;
  verdict: MerchantVerdict;
  score: number;
  signals: MerchantSignals;
  reasons: { signal: string; pull: 'positive' | 'negative' | 'neutral'; detail: string }[];
  recommendation: string;
  sources: { name: string; license: string }[];
}

export interface MerchantLegitimacyPreview {
  ok: true;
  preview: true;
  domain: string;
  verdict: MerchantVerdict;
  score_band: 'high' | 'medium' | 'low';
  capturedAt: string;
}

const SOURCES = [
  { name: 'RDAP', license: 'public domain' },
  { name: 'crt.sh / SSLMate CertSpotter', license: 'public' },
  { name: 'Cloudflare DNS over HTTPS', license: 'public' },
  { name: 'Majestic Million', license: 'CC-BY-3.0' },
  { name: 'Phishing.Database', license: 'MIT' },
];

export function buildMerchantLegitimacyVerdict(
  domain: string,
  s: MerchantSignals,
  capturedAt: string,
): MerchantLegitimacyResult {
  const reasons: MerchantLegitimacyResult['reasons'] = [];
  let score = 50;

  const add = (signal: string, delta: number, detail: string) => {
    if (delta !== 0) {
      score += delta;
      reasons.push({ signal, pull: delta > 0 ? 'positive' : 'negative', detail });
    } else {
      reasons.push({ signal, pull: 'neutral', detail });
    }
  };

  // Domain age signal
  const a = s.domainAgeDays;
  if (a === null) add('domain_age', 0, 'Registration date unavailable for this TLD');
  else if (a > 730) add('domain_age', 30, `Registered ${a} days ago`);
  else if (a >= 365) add('domain_age', 20, `Registered ${a} days ago`);
  else if (a >= 180) add('domain_age', 5, `Registered ${a} days ago`);
  else if (a >= 30) add('domain_age', -10, `Registered only ${a} days ago`);
  else add('domain_age', -30, `Registered ${a} days ago, very new`);

  // DNS hygiene signal
  const { mx, spf, dmarc } = s.dns;
  if (mx && spf && dmarc !== null) add('dns_hygiene', 15, `Full mail hygiene (MX, SPF, DMARC ${dmarc})`);
  else if (mx && (spf || dmarc !== null)) add('dns_hygiene', 5, 'Partial mail hygiene');
  else if (mx) add('dns_hygiene', 0, 'MX present, no SPF or DMARC');
  else add('dns_hygiene', -15, 'No MX record');

  // Majestic popularity signal
  if (s.majestic.rank !== null && s.majestic.rank <= 10000) {
    add('popularity', 25, `Top ${s.majestic.rank} on the popularity index`);
  } else if (s.majestic.rank !== null && s.majestic.rank <= 100000) {
    add('popularity', 15, `Ranked ${s.majestic.rank} on the popularity index`);
  } else {
    add('popularity', 0, 'Not in the top popularity index');
  }

  // Certificate history signal
  const c = s.certFirstSeenDays;
  if (c !== null && c >= 365) {
    add('cert_history', 5, `Certificate history spans ${c} days`);
  } else if (c !== null && c < 30 && a !== null && a < 30) {
    add('cert_history', -10, 'Fresh certificate on a brand-new domain');
  } else {
    add('cert_history', 0, 'Certificate history inconclusive');
  }

  score = Math.max(0, Math.min(100, score));

  let verdict: MerchantVerdict;

  // Phishing hit: hard override, score floored to 10
  if (s.phishingListed) {
    score = Math.min(score, 10);
    verdict = 'block';
    reasons.push({ signal: 'phishing', pull: 'negative', detail: 'Listed on an active phishing feed' });
  // Scam cluster: new domain, no mail, not indexed, fresh cert
  } else if (a !== null && a < 30 && !mx && !s.majestic.inIndex && c !== null && c < 30) {
    score = Math.min(score, 30);
    verdict = 'block';
  // No live signals resolved
  } else if (s.liveSignalsResolved === 0) {
    verdict = 'insufficient_data';
    score = Math.max(40, Math.min(score, 55));
  } else {
    verdict = score >= 70 ? 'proceed' : score >= 40 ? 'step_up' : 'block';
  }

  const recommendation =
    verdict === 'block'
      ? 'Do not transact; strong fraud signals.'
      : verdict === 'proceed'
        ? 'Established and clean; proceed.'
        : verdict === 'insufficient_data'
          ? 'Could not verify; treat as unverified and add escrow or identity checks.'
          : 'Mixed signals; verify before high-value transactions (escrow, identity, or an alternative).';

  return { ok: true, capturedAt, domain, verdict, score, signals: s, reasons, recommendation, sources: SOURCES };
}

export function redactMerchantLegitimacyForPreview(full: MerchantLegitimacyResult): MerchantLegitimacyPreview {
  const score_band: 'high' | 'medium' | 'low' = full.score >= 70 ? 'high' : full.score >= 40 ? 'medium' : 'low';
  return { ok: true, preview: true, domain: full.domain, verdict: full.verdict, score_band, capturedAt: full.capturedAt };
}

export async function checkMerchantLegitimacyPreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:merchant-legitimacy-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: max - count - 1, limit: max };
}
