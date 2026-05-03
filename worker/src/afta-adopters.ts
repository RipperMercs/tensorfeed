/**
 * Worker-side mirror of src/lib/afta-adopters.ts.
 *
 * Why duplicated: the site lib runs in the Next.js build, the Worker runs
 * separately. With ~2-10 adopters expected near-term, hand-syncing is
 * cheaper than wiring up shared imports across two TS configs. When a new
 * adopter is added, update BOTH files in the same commit.
 *
 * This file is consumed only by the /api/afta/adopters route handler.
 * Page rendering uses src/lib/afta-adopters.ts.
 */

export interface AftaAdopter {
  site: string;
  url: string;
  vertical: string;
  description: string;
  adopted_at: string;
  manifest: string;
  manifesto: string;
  receipt_key: string;
  role: 'host' | 'member' | 'standalone';
  notes?: string;
}

export const AFTA_ADOPTERS: AftaAdopter[] = [
  {
    site: 'tensorfeed.ai',
    url: 'https://tensorfeed.ai',
    vertical: 'AI infrastructure & news',
    description:
      'Real-time AI news aggregator, model + pricing tracker, infra status monitor, and agent registry. Host of the first AFTA federation credit ledger.',
    adopted_at: '2026-04-30',
    manifest: 'https://tensorfeed.ai/.well-known/agent-fair-trade.json',
    manifesto: 'https://tensorfeed.ai/agent-fair-trade',
    receipt_key: 'https://tensorfeed.ai/.well-known/tensorfeed-receipt-key.json',
    role: 'host',
    notes: 'Hosts the federated credit ledger; bearer tokens minted here are accepted by federation members.',
  },
  {
    site: 'terminalfeed.io',
    url: 'https://terminalfeed.io',
    vertical: 'Real-time data dashboards',
    description:
      'Live dashboards for finance, weather, transit, network status, and other real-time signals. Federation member sharing the host credit ledger.',
    adopted_at: '2026-04-30',
    manifest: 'https://terminalfeed.io/.well-known/agent-fair-trade.json',
    manifesto: 'https://terminalfeed.io/agent-fair-trade',
    receipt_key: 'https://terminalfeed.io/.well-known/terminalfeed-receipt-key.json',
    role: 'member',
    notes: 'A bearer token minted on tensorfeed.ai works on terminalfeed.io with no re-auth.',
  },
];
