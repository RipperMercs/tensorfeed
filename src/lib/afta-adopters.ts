/**
 * TensorFeed's view of the AFTA adopter network.
 *
 * IMPORTANT: This is informational, not authoritative. The source of truth
 * for any adopter's status is their own /.well-known/agent-fair-trade.json
 * manifest. Removal from this file does NOT revoke an adopter's status,
 * and inclusion does NOT confer it. Per AFTA's GOVERNANCE.md (Section 1.1):
 * "Adoption is the certification."
 *
 * Anyone can run a directory like this. We welcome competing directories
 * at other URLs and other domains, since multiple non-authoritative views
 * is the structurally capture-resistant shape.
 *
 * To submit your adoption: open a PR adding a new entry below. The only
 * gate is whether you serve a conforming manifest at the URL listed in
 * `manifest`. We do not review your business model or content.
 *
 * Standard: https://github.com/RipperMercs/afta
 */

export interface AftaAdopter {
  /** Site identifier, typically the domain. */
  site: string;
  /** Site root URL. */
  url: string;
  /** Short label for the vertical the site serves. */
  vertical: string;
  /** 1-2 sentence description of what the site does. */
  description: string;
  /** Date the adopter first published a conforming manifest, ISO date. */
  adopted_at: string;
  /** URL of the adopter's /.well-known/agent-fair-trade.json. */
  manifest: string;
  /** URL of the adopter's human-readable manifesto page. */
  manifesto: string;
  /** URL of the adopter's published Ed25519 public JWK. */
  receipt_key: string;
  /** Role in the federation (if part of one): host, member, or standalone. */
  role: 'host' | 'member' | 'standalone';
  /** Optional free-form note about the adoption. */
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
