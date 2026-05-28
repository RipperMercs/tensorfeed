import type { PublisherRecord } from './types';
import type { Env } from '../types';
import { KV_KEY_PUBLISHERS, kvKeyPublisher, SEED_PUBLISHERS } from './constants';

interface X402ManifestAccept {
  scheme?: string;
  network?: string;
  payTo?: string;
}

interface X402Manifest {
  items?: Array<{ accepts?: X402ManifestAccept[] }>;
  accepts?: X402ManifestAccept[];
}

const BASE_NETWORK_TAGS = new Set(['base', 'base-mainnet', 'eip155:8453']);
const MAX_MANIFEST_BYTES = 1_000_000;
const MAX_WALLETS = 100;

export function isValidPublisherDomain(domain: string): boolean {
  if (!domain || domain.length === 0 || domain.length > 253) return false;
  if (domain.includes('://') || domain.includes('/') || domain.includes('?') || domain.includes('#')) return false;
  if (domain.includes('@')) return false;

  // Strict allowlist of characters legal in a hostname per RFC 1123 + dots.
  // Catches CRLF/tab/space/Unicode/null-byte smuggling that the WHATWG URL
  // parser would silently strip or normalize.
  if (!/^[a-zA-Z0-9.\-]+$/.test(domain)) return false;

  let url: URL;
  try {
    url = new URL('https://' + domain);
  } catch {
    return false;
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, '');

  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (host.endsWith('.local')) return false;
  if (host.endsWith('.internal')) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  if (host.includes(':') || host.startsWith('[')) return false;
  if (!host.includes('.')) return false;

  // DNS labels: each label must be 1 to 63 chars (RFC 1035). Reject empty
  // labels (which would come from ".example.com" or "example..com") and any
  // label exceeding 63 characters.
  if (host.split('.').some((label) => label.length === 0 || label.length > 63)) return false;

  return true;
}

/**
 * Crawl a publisher's /.well-known/x402.json manifest and return a PublisherRecord.
 *
 * IMPORTANT: callers are responsible for preserving `first_seen` across re-crawls.
 * This function always sets first_seen to the current timestamp because it has no
 * access to any prior PublisherRecord. The cron caller MUST merge with the existing
 * KV record (if any) to keep first_seen stable after initial discovery.
 *
 * The returned `domain` field is the validated + normalized hostname (lowercased,
 * IDN-punycoded, trailing-dot stripped), NOT the raw input. This is intentional:
 * it prevents log injection and homograph attacks from propagating into KV.
 *
 * SSRF guards: rejects localhost, loopback, RFC1918, link-local, .local, .internal,
 * IP literals (IPv4 + IPv6), single-label hostnames, userinfo smuggling, and any
 * non-alphanumeric character in the raw input. Uses redirect: 'manual' and treats
 * 3xx as error.
 *
 * Body size: capped at 1 MB. Manifest accepts arrays capped at 100 wallets. Each
 * payTo must match /^0x[a-f0-9]{40}$/; others are silently skipped.
 */
export async function crawlPublisherManifest(
  domain: string,
  now: () => string = () => new Date().toISOString(),
  fetchFn: typeof fetch = fetch,
): Promise<PublisherRecord> {
  const nowStr = now();

  if (!isValidPublisherDomain(domain)) {
    // manifest_url and domain both left empty: do not propagate unvalidated input
    // into KV or any downstream display surface.
    return baseRecord('', '', nowStr, 'invalid_domain');
  }

  // Re-parse to derive the normalized hostname. The URL constructor is cheap
  // and this keeps isValidPublisherDomain as a pure boolean predicate.
  const parsed = new URL('https://' + domain);
  const safeDomain = parsed.hostname.toLowerCase().replace(/\.$/, '');
  const manifestUrl = `https://${safeDomain}/.well-known/x402.json`;

  try {
    const res = await fetchFn(manifestUrl, {
      headers: { 'User-Agent': 'tensorfeed-x402-indexer/1.0' },
      signal: AbortSignal.timeout(10_000),
      redirect: 'manual',
    });

    if (res.status >= 300 && res.status < 400) {
      return baseRecord(safeDomain, manifestUrl, nowStr, `redirect_${res.status}`);
    }

    if (!res.ok) {
      return baseRecord(safeDomain, manifestUrl, nowStr, `HTTP ${res.status}`);
    }

    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > MAX_MANIFEST_BYTES) {
      return baseRecord(safeDomain, manifestUrl, nowStr, 'manifest_too_large');
    }

    const text = await res.text();
    if (text.length > MAX_MANIFEST_BYTES) {
      return baseRecord(safeDomain, manifestUrl, nowStr, 'manifest_too_large');
    }

    let manifest: X402Manifest;
    try {
      manifest = JSON.parse(text) as X402Manifest;
    } catch {
      return baseRecord(safeDomain, manifestUrl, nowStr, 'manifest_parse_error');
    }

    const wallets = extractBaseWallets(manifest);

    return {
      domain: safeDomain,
      manifest_url: manifestUrl,
      pay_to_wallets: wallets,
      first_seen: nowStr,
      last_crawled: nowStr,
      last_crawl_error: null,
      last_event_at: null,
    };
  } catch (e) {
    return baseRecord(safeDomain, manifestUrl, nowStr, e instanceof Error ? e.message : 'unknown');
  }
}

function baseRecord(domain: string, manifestUrl: string, nowStr: string, err: string): PublisherRecord {
  return {
    domain,
    manifest_url: manifestUrl,
    pay_to_wallets: [],
    first_seen: nowStr,
    last_crawled: nowStr,
    last_crawl_error: err,
    last_event_at: null,
  };
}

function extractBaseWallets(manifest: X402Manifest): string[] {
  const wallets = new Set<string>();
  const items = manifest.items ?? [];
  outer: for (const item of items) {
    for (const accept of item.accepts ?? []) {
      if (accept.scheme !== 'exact') continue;
      if (isBaseNetwork(accept.network) && accept.payTo) {
        const normalized = normalizeAddress(accept.payTo);
        if (normalized) {
          wallets.add(normalized);
          if (wallets.size >= MAX_WALLETS) break outer;
        }
      }
    }
  }
  if (wallets.size < MAX_WALLETS) {
    for (const accept of manifest.accepts ?? []) {
      if (accept.scheme !== 'exact') continue;
      if (isBaseNetwork(accept.network) && accept.payTo) {
        const normalized = normalizeAddress(accept.payTo);
        if (normalized) {
          wallets.add(normalized);
          if (wallets.size >= MAX_WALLETS) break;
        }
      }
    }
  }
  return Array.from(wallets);
}

function isBaseNetwork(network: string | undefined): boolean {
  if (!network) return false;
  return BASE_NETWORK_TAGS.has(network.toLowerCase());
}

function normalizeAddress(addr: string): string | null {
  const lower = addr.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(lower)) return null;
  return lower;
}

/**
 * Refresh all publisher manifests and write the wallet allowlist plus per-publisher
 * records to KV. Preserves `first_seen` across re-crawls by merging with the
 * existing KV record if one exists.
 *
 * Called by the daily 06:30 UTC cron. Safe to call repeatedly.
 */
export async function refreshAllPublishers(
  env: Env,
  domains: string[] = SEED_PUBLISHERS,
  now: () => string = () => new Date().toISOString(),
  fetchFn: typeof fetch = fetch,
): Promise<{ count: number; errors: number }> {
  const records: PublisherRecord[] = [];
  let errors = 0;

  for (const domain of domains) {
    const existing = (await env.TENSORFEED_CACHE.get(kvKeyPublisher(domain), 'json')) as PublisherRecord | null;
    const fresh = await crawlPublisherManifest(domain, now, fetchFn);

    // Merge: preserve first_seen from the existing record if one was already
    // stored. crawlPublisherManifest always sets first_seen to nowStr because
    // it cannot know prior discovery time; we restore it here.
    const merged: PublisherRecord = existing
      ? { ...fresh, first_seen: existing.first_seen, last_event_at: existing.last_event_at }
      : fresh;

    records.push(merged);
    if (merged.last_crawl_error !== null) errors++;
    await env.TENSORFEED_CACHE.put(kvKeyPublisher(domain), JSON.stringify(merged));
  }

  const walletMap: Record<string, string> = {};
  for (const rec of records) {
    if (rec.last_crawl_error !== null) continue;
    for (const wallet of rec.pay_to_wallets) {
      walletMap[wallet] = rec.domain;
    }
  }

  await env.TENSORFEED_CACHE.put(KV_KEY_PUBLISHERS, JSON.stringify(walletMap));

  return { count: records.length, errors };
}
