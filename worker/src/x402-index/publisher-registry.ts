import type { PublisherRecord } from './types';

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

export function isValidPublisherDomain(domain: string): boolean {
  if (!domain || domain.length === 0 || domain.length > 253) return false;
  if (domain.includes('://') || domain.includes('/') || domain.includes('?') || domain.includes('#')) return false;
  if (domain.includes('@')) return false;

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

  return true;
}

export async function crawlPublisherManifest(
  domain: string,
  now: () => string = () => new Date().toISOString(),
  fetchFn: typeof fetch = fetch,
): Promise<PublisherRecord> {
  const manifestUrl = `https://${domain}/.well-known/x402.json`;
  const nowStr = now();

  if (!isValidPublisherDomain(domain)) {
    return baseRecord(domain, manifestUrl, nowStr, 'invalid_domain');
  }

  try {
    const res = await fetchFn(manifestUrl, {
      headers: { 'User-Agent': 'tensorfeed-x402-indexer/1.0' },
      signal: AbortSignal.timeout(10_000),
      redirect: 'manual',
    });

    if (res.status >= 300 && res.status < 400) {
      return baseRecord(domain, manifestUrl, nowStr, `redirect_${res.status}`);
    }

    if (!res.ok) {
      return baseRecord(domain, manifestUrl, nowStr, `HTTP ${res.status}`);
    }

    const manifest = (await res.json()) as X402Manifest;
    const wallets = extractBaseWallets(manifest);

    return {
      domain,
      manifest_url: manifestUrl,
      pay_to_wallets: wallets,
      first_seen: nowStr,
      last_crawled: nowStr,
      last_crawl_error: null,
      last_event_at: null,
    };
  } catch (e) {
    return baseRecord(domain, manifestUrl, nowStr, e instanceof Error ? e.message : 'unknown');
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
  for (const item of items) {
    for (const accept of item.accepts ?? []) {
      if (isBaseNetwork(accept.network) && accept.payTo) {
        wallets.add(normalizeAddress(accept.payTo));
      }
    }
  }
  for (const accept of manifest.accepts ?? []) {
    if (isBaseNetwork(accept.network) && accept.payTo) {
      wallets.add(normalizeAddress(accept.payTo));
    }
  }
  return Array.from(wallets);
}

function isBaseNetwork(network: string | undefined): boolean {
  if (!network) return false;
  return BASE_NETWORK_TAGS.has(network.toLowerCase());
}

function normalizeAddress(addr: string): string {
  return addr.toLowerCase();
}
