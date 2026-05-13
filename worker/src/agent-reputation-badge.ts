/**
 * Agent Reputation Bureau — embeddable SVG badge.
 *
 * v0 Week 2, step 8 of the spec at
 * C:\Users\rippe\Desktop\tensorfeed-agent-rep-bureau-spec.md.
 *
 * Pure-function SVG renderer. Hard-escapes every piece of agent-derived
 * text (display_name, operator_url) before insertion, allowlists
 * display_name characters, and emits a fixed 200x40 SVG. The route
 * handler in index.ts adds CSP + cache headers; everything inside the
 * SVG body is plain text + numbers, so the surface is small and
 * auditable.
 *
 * XSS posture: SVG renderers in browsers/feed-readers can execute
 * JavaScript embedded in event-handler attributes and inline scripts.
 * Defense:
 *   1. Whitelist display_name chars before render (alphanumerics +
 *      space + dot + dash + underscore). Drops every char outside the
 *      set, then truncates to 24 visible chars.
 *   2. Hard XML-escape every user-derived value before it's spliced
 *      into the template. Tested against the OWASP SVG-XSS payload
 *      set (script tags, javascript: URIs, mixed quotes, mixed entities,
 *      angle brackets) in agent-reputation-badge.test.ts.
 *   3. The template itself uses no event handlers, no foreignObject,
 *      no external references, no scripts.
 *   4. Response headers (set by the route) tighten the policy further:
 *      Content-Type: image/svg+xml + CSP default-src 'none'.
 */

import type { ReputationCard, ReputationRanks } from './agent-reputation';

const BADGE_WIDTH = 200;
const BADGE_HEIGHT = 40;
const MAX_DISPLAY_NAME_CHARS = 24;

const COLOR_BG = '#0a0a0a';
const COLOR_BRAND = '#0052FF'; // Base blue per the bureau spec
const COLOR_FG = '#ffffff';
const COLOR_MUTED = '#9ca3af';

const GRADE_COLOR: Record<string, string> = {
  A: '#00ff88',
  B: '#66ccff',
  C: '#ffaa33',
  D: '#ff6633',
  F: '#ff3333',
};

const TIER_GOLD = '#FFD700';
const TIER_SILVER = '#C0C0C0';
const TIER_BRONZE = '#CD7F32';

/**
 * Hard XML-escape every metacharacter that could close an attribute
 * or open a tag/entity inside SVG body text. Matches the OWASP
 * recommended set for XML contexts.
 */
export function escapeSvgText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Strict allowlist on display names before XML escape. Drops anything
 * not in [A-Za-z0-9 ._-], then trims and caps at 24 visible chars.
 * Returns null when the result would be empty so the renderer falls
 * back to the wallet/token short.
 */
export function sanitizeDisplayName(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.replace(/[^A-Za-z0-9 ._-]/g, '').trim();
  if (cleaned.length === 0) return null;
  return cleaned.slice(0, MAX_DISPLAY_NAME_CHARS);
}

/**
 * Short label fallback used when display_name is null. Format:
 *   wallet 0xABCD1234...EFGH5678 -> "0xABCD1234.EFGH5678"
 *   token  tf_live_18e54f47       -> "tf_live_18e54f47"
 */
export function shortIdentityLabel(card: ReputationCard): string {
  if (card.wallet && /^0x[0-9a-fA-F]{40}$/.test(card.wallet)) {
    return `${card.wallet.slice(0, 6)}…${card.wallet.slice(-4)}`.toLowerCase();
  }
  if (card.token_prefix) return card.token_prefix;
  return 'unknown';
}

/**
 * Tier color = top-3 in any rankable metric. Falls back to the trust
 * grade color when the agent is not in any top-3.
 */
export function pickBadgeColor(ranks: ReputationRanks, trust_grade: string): string {
  let bestRank = Number.MAX_SAFE_INTEGER;
  // Note: rank > 0 explicitly skips the noRank() sentinel (which is
  // rank=0). Without this guard, an unranked card would otherwise
  // accidentally be treated as tied-for-first and surface gold tier.
  for (const r of [ranks.reliability, ranks.spend, ranks.activity, ranks.streak, ranks.composite]) {
    if (r && r.rank > 0 && r.rank < bestRank) bestRank = r.rank;
  }
  if (bestRank === 1) return TIER_GOLD;
  if (bestRank === 2) return TIER_SILVER;
  if (bestRank === 3) return TIER_BRONZE;
  return GRADE_COLOR[trust_grade] ?? COLOR_MUTED;
}

/**
 * Render a 200x40 SVG. Output is deterministic given input: no Date.now(),
 * no randomness, so the badge is edge-cacheable and content-addressed.
 *
 * Body content (in render order):
 *   1. Black background with rounded corners
 *   2. Base-blue left strip with the "TF" wordmark
 *   3. Display name (or short identity) on the right, top line
 *   4. Composite rank + trust grade on the right, bottom line, colored
 *      by tier (gold/silver/bronze) or by trust grade
 *   5. Reliability % at the far right
 */
export function renderBadgeSvg(card: ReputationCard): string {
  const safeDisplay = sanitizeDisplayName(card.display_name) ?? shortIdentityLabel(card);
  const escDisplay = escapeSvgText(safeDisplay);
  const composite = card.ranks.composite;
  const rankLine = composite && composite.rank > 0
    ? `#${composite.rank}/${composite.total}`
    : '#-';
  const escRankLine = escapeSvgText(rankLine);
  const grade = ['A', 'B', 'C', 'D', 'F'].includes(card.trust_grade) ? card.trust_grade : 'D';
  const reliability = Number.isFinite(card.metrics.reliability_pct)
    ? Math.round(card.metrics.reliability_pct)
    : 0;
  const reliabilityText = `${Math.max(0, Math.min(100, reliability))}%`;
  const tierColor = pickBadgeColor(card.ranks, grade);

  // ARIA label for screen readers + accessibility-tool indexing.
  const ariaLabel = escapeSvgText(
    `TensorFeed agent ${safeDisplay}, composite rank ${rankLine}, trust grade ${grade}, reliability ${reliabilityText}`,
  );

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" viewBox="0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}" role="img" aria-label="${ariaLabel}">`,
    `<rect width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" rx="4" fill="${COLOR_BG}"/>`,
    `<rect width="44" height="${BADGE_HEIGHT}" rx="4" fill="${COLOR_BRAND}"/>`,
    `<rect x="40" width="4" height="${BADGE_HEIGHT}" fill="${COLOR_BRAND}"/>`,
    `<text x="22" y="25" text-anchor="middle" fill="${COLOR_FG}" font-family="JetBrains Mono,Menlo,monospace" font-size="13" font-weight="700">TF</text>`,
    `<text x="50" y="16" fill="${COLOR_FG}" font-family="JetBrains Mono,Menlo,monospace" font-size="10">${escDisplay}</text>`,
    `<text x="50" y="31" fill="${tierColor}" font-family="JetBrains Mono,Menlo,monospace" font-size="11" font-weight="700">${escRankLine} ${grade}</text>`,
    `<text x="${BADGE_WIDTH - 6}" y="31" text-anchor="end" fill="${COLOR_MUTED}" font-family="JetBrains Mono,Menlo,monospace" font-size="9">${escapeSvgText(reliabilityText)}</text>`,
    `</svg>`,
  ].join('');
}

/**
 * Render a minimal "no record" badge for an identity we have not yet
 * indexed. Returned instead of 404 so an operator's embed stays
 * visually intact and the source of the missing record is debuggable
 * from the SVG body itself.
 */
export function renderUnknownBadgeSvg(identityShort: string): string {
  const safe = sanitizeDisplayName(identityShort) ?? 'unknown';
  const esc = escapeSvgText(safe);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" viewBox="0 0 ${BADGE_WIDTH} ${BADGE_HEIGHT}" role="img" aria-label="TensorFeed agent ${esc}, no reputation record">`,
    `<rect width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}" rx="4" fill="${COLOR_BG}"/>`,
    `<rect width="44" height="${BADGE_HEIGHT}" rx="4" fill="${COLOR_BRAND}"/>`,
    `<rect x="40" width="4" height="${BADGE_HEIGHT}" fill="${COLOR_BRAND}"/>`,
    `<text x="22" y="25" text-anchor="middle" fill="${COLOR_FG}" font-family="JetBrains Mono,Menlo,monospace" font-size="13" font-weight="700">TF</text>`,
    `<text x="50" y="16" fill="${COLOR_FG}" font-family="JetBrains Mono,Menlo,monospace" font-size="10">${esc}</text>`,
    `<text x="50" y="31" fill="${COLOR_MUTED}" font-family="JetBrains Mono,Menlo,monospace" font-size="10">no record yet</text>`,
    `</svg>`,
  ].join('');
}

/**
 * Stable Content-Security-Policy for the badge response. Disallows
 * scripts, inline event handlers, iframes, and any external resource.
 * The badge body uses no inline styles either, so style-src can stay
 * locked down.
 */
export const BADGE_CSP = "default-src 'none'; style-src 'none'; script-src 'none'; img-src data: 'self'";
