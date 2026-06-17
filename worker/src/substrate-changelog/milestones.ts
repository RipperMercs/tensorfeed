/**
 * Agent-commerce and protocol-governance milestone registry.
 *
 * Source-of-truth list of discrete, non-recurring milestones in the substrate
 * agents transact on: payment-protocol governance moves, agent-account launches,
 * and infrastructure that turns ordinary publishers into agent-paying merchants.
 * These are NOT auto-detected (unlike model pricing, deprecations, spec tags, and
 * framework releases). They are curated by hand from the primary announcement and
 * each carries a sourceUrl so a consumer can verify the claim upstream.
 *
 * Why a separate registry and not the spec_version poller: a spec_version event
 * is a bare `vN` tag cut in a repo. A governance move (x402 spinning out under the
 * Linux Foundation) or a commerce launch (AWS CloudFront accepting agent payments)
 * never shows up as a tag, yet it is exactly the kind of substrate shift this feed
 * exists to record. The set is small and intentional, so surfacing it IS the
 * point: a null prior emits the whole registry once (see diffMilestones), then the
 * feed is forward-only and only a brand new id emits.
 *
 * Date semantics: `date` is the real-world event date and is written into the
 * detail string for the reader. The emitted event's `at` field is the feed's
 * uniform detection day (same as every other event type), so the timeline clock
 * stays consistent; the true date lives in the prose.
 *
 * Maintenance:
 *   - Append a new entry when a real agent-commerce / protocol-governance
 *     milestone lands. Pick a stable, descriptive id; it becomes the event id
 *     `protocol_milestone:${id}` and is what dedups the forward-only feed.
 *   - Never reuse or renumber an id.
 *   - Keep every detail string plain ASCII: no em dashes, no en dashes, no
 *     double hyphens. Single hyphens in compound words are fine.
 *   - Bump PROTOCOL_MILESTONES_LAST_UPDATED whenever the file changes.
 *
 * Public surfaces:
 *   - GET /api/substrate-changelog/recent (free; protocol_milestone events)
 *   - GET /api/premium/substrate-changelog/history?event_type=protocol_milestone
 *   - /substrate (human-readable timeline)
 */

export interface ProtocolMilestone {
  /** Stable slug. Becomes the event id `protocol_milestone:${id}`. Never reuse. */
  id: string;
  /** Who or what the milestone is about (shown as the event subject). */
  subject: string;
  /** Real-world event date, YYYY-MM-DD. Surfaced in the detail, not as `at`. */
  date: string;
  /** One-line plain-ASCII summary. No em dashes, no double hyphens. */
  detail: string;
  /** Authoritative primary-source URL for the claim. */
  sourceUrl: string;
  /** Optional provider tag if the milestone belongs to one vendor. */
  provider?: string | null;
  /** Optional version/tag string if the milestone names one. */
  version?: string | null;
}

export const PROTOCOL_MILESTONES: ProtocolMilestone[] = [
  {
    id: 'coinbase-base-mcp',
    subject: 'Base',
    date: '2026-05-26',
    detail:
      'Coinbase shipped a Base MCP that lets agents in Claude and Cursor transact on the Base network, including trading and lending, pulling Base into the standard agent tool surface.',
    sourceUrl:
      'https://fortune.com/2026/05/26/coinbase-pushes-further-into-ai-payments-with-new-mcp-for-base-network/',
  },
  {
    id: 'coinbase-for-agents',
    subject: 'Coinbase',
    date: '2026-06-11',
    detail:
      'Coinbase for Agents connects an AI agent to a Coinbase account to trade and spend under user-set guardrails, shipped as an MCP for web harnesses and a CLI skill for terminal agents like Claude Code and Codex. x402 payments for premium data and APIs are arriving soon, with KYT compliance built in.',
    sourceUrl:
      'https://www.cnbc.com/2026/06/11/coinbase-launches-tool-to-let-ai-agents-manage-trading-and-payments.html',
  },
  {
    id: 'x402-linux-foundation',
    subject: 'x402',
    date: '2026-06-15',
    detail:
      'Coinbase spun x402 out as an independent foundation under the Linux Foundation. Governance is now vendor-neutral, with founding members spanning more than 20 companies across cloud, AI, and financial services, including AWS and Cloudflare, so no single company controls the agent payment standard.',
    sourceUrl: 'https://www.linuxfoundation.org/x402foundation',
  },
  {
    id: 'aws-cloudfront-waf-x402',
    subject: 'AWS CloudFront and WAF',
    date: '2026-06-15',
    detail:
      'AWS and Coinbase let publishers and API providers on CloudFront and WAF accept AI agents as paying customers via x402, toggled on from existing AWS config. The Coinbase x402 Facilitator verifies and settles USDC on Base in the same request, extending agent monetization to roughly a quarter of the internet.',
    sourceUrl:
      'https://aws.amazon.com/blogs/aws/aws-waf-adds-ai-traffic-monetization-capability-to-help-content-owners-charge-ai-bots-for-content-access/',
  },
];

export const PROTOCOL_MILESTONES_LAST_UPDATED = '2026-06-17';
