export interface IndexerCursor {
  block: number;
  ts: string;
  last_run_at: string;
}

export interface PublisherRecord {
  domain: string;
  manifest_url: string;
  pay_to_wallets: string[];
  first_seen: string;
  last_crawled: string;
  last_crawl_error: string | null;
  last_event_at: string | null;
  // How this publisher's wallets were discovered. 'manifest' (default) means a
  // /.well-known/x402.json crawl. 'manual' means a hand-seeded discovery-dark
  // publisher whose wallet came from its live 402 challenge, not a manifest.
  source?: 'manifest' | 'manual';
  // Free-text provenance, set for manually-seeded publishers so the public
  // /publishers endpoint can disclose that the attribution is observation-based.
  note?: string | null;
}

export interface DailyRollup {
  date: string;
  volume_usdc: string;
  count: number;
  top_publishers: Array<{
    domain: string;
    volume_usdc: string;
    count: number;
  }>;
}

export interface PublisherDailyRollup {
  date: string;
  domain: string;
  volume_usdc: string;
  count: number;
}

export interface SettlementEvent {
  tx_hash: string;
  block: number;
  ts: string;
  from_address: string;
  to_address: string;
  amount_usdc: string;
  publisher_domain: string;
  asset: 'USDC';
  chain: 'base';
}
