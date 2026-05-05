/**
 * Shields.io-compatible uptime badges.
 *
 * Returns an SVG badge per provider showing the live 7-day uptime % from
 * the leaderboard counters. Self-contained — no dependency on shields.io
 * or any external rendering service. Aggressively edge-cached because
 * the underlying data only changes every 2 min and the badge URL is
 * embedded in third-party READMEs/docs (high traffic, low staleness
 * tolerance).
 *
 * Strategic value: every README/doc that embeds an uptime badge becomes
 * a permanent backlink + agent-discovery surface for tensorfeed.ai. This
 * is the highest-leverage SEO move in the whole status-monitoring stack
 * because the long tail compounds without any further work.
 */

import { Env } from './types';
import { computeLeaderboard, resolveLastNDays } from './status-leaderboard';

// Slug-to-provider-name map. Slugs are designed to match common search
// terms ("claude", "openai", "gemini") so the badge URLs are intuitive
// for embedders who don't want to guess our internal naming.
const SLUG_TO_PROVIDER: Record<string, string> = {
  claude: 'Claude API',
  anthropic: 'Claude API',
  openai: 'OpenAI API',
  chatgpt: 'OpenAI API',
  gemini: 'Google Gemini',
  google: 'Google Gemini',
  vertex: 'Google Gemini',
  copilot: 'GitHub Copilot',
  github: 'GitHub Copilot',
  perplexity: 'Perplexity',
  groq: 'Groq',
  huggingface: 'Hugging Face',
  hf: 'Hugging Face',
  replicate: 'Replicate',
  cohere: 'Cohere',
  mistral: 'Mistral',
  bedrock: 'AWS Bedrock',
  aws: 'AWS Bedrock',
  'aws-bedrock': 'AWS Bedrock',
  'azure-openai': 'Azure OpenAI',
  azure: 'Azure OpenAI',
  deepseek: 'DeepSeek',
  together: 'Together AI',
  'together-ai': 'Together AI',
  fireworks: 'Fireworks AI',
  'fireworks-ai': 'Fireworks AI',
  openrouter: 'OpenRouter',
  elevenlabs: 'ElevenLabs',
  stability: 'Stability AI',
  'stability-ai': 'Stability AI',
  runway: 'Runway',
  luma: 'Luma',
  'luma-ai': 'Luma',
};

export function resolveProviderSlug(slug: string): string | null {
  return SLUG_TO_PROVIDER[slug.toLowerCase()] ?? null;
}

// Verdana 11pt is what shields.io uses. Character widths approximated
// from Bravura/standard tables — close enough that our badges render
// proportionally in any context that displays SVG.
function approxTextWidth(s: string): number {
  let w = 0;
  for (const c of s) {
    if ('MW'.includes(c)) w += 9;
    else if ('mw'.includes(c)) w += 8;
    else if ('iljt|!.,:;'.includes(c)) w += 4;
    else if (c === ' ') w += 4;
    else if (c >= 'A' && c <= 'Z') w += 8; // Caps slightly wider
    else w += 7;
  }
  return w;
}

function uptimeBadgeColor(pct: number | null): string {
  if (pct === null) return '#9f9f9f'; // gray for no-data
  if (pct >= 99.9) return '#4c1'; // bright green
  if (pct >= 99) return '#97ca00'; // green
  if (pct >= 95) return '#dfb317'; // yellow
  if (pct >= 90) return '#fe7d37'; // orange
  return '#e05d44'; // red
}

/**
 * Generate a Shields.io-style flat badge SVG.
 * Two-section rounded-rect badge with gray label on the left and
 * colored value on the right. 20px tall, width auto-sized to content.
 */
export function generateBadgeSvg(label: string, value: string, color: string): string {
  const padding = 6;
  const labelTextW = approxTextWidth(label);
  const valueTextW = approxTextWidth(value);
  const labelW = labelTextW + padding * 2;
  const valueW = valueTextW + padding * 2;
  const totalW = labelW + valueW;

  // Text positions in 10x scale (we use scale(.1) on the text elements
  // for sub-pixel positioning, which is the shields.io convention).
  const labelTextX = (labelW / 2) * 10;
  const valueTextX = (labelW + valueW / 2) * 10;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="20" role="img" aria-label="${escapeXml(label)}: ${escapeXml(value)}"><title>${escapeXml(label)}: ${escapeXml(value)}</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${totalW}" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="${labelW}" height="20" fill="#555"/><rect x="${labelW}" width="${valueW}" height="20" fill="${color}"/><rect width="${totalW}" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="${labelTextX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${labelTextW * 10}">${escapeXml(label)}</text><text x="${labelTextX}" y="140" transform="scale(.1)" fill="#fff" textLength="${labelTextW * 10}">${escapeXml(label)}</text><text aria-hidden="true" x="${valueTextX}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${valueTextW * 10}">${escapeXml(value)}</text><text x="${valueTextX}" y="140" transform="scale(.1)" fill="#fff" textLength="${valueTextW * 10}">${escapeXml(value)}</text></g></svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate the SVG badge for a provider's 7-day uptime.
 * Returns the SVG string and the ETag (computed from the underlying
 * uptime % so we get cheap 304 responses when the value hasn't changed).
 */
export async function generateUptimeBadge(
  env: Env,
  providerSlug: string,
  customLabel?: string,
): Promise<{ svg: string; etag: string; status: number } | null> {
  const provider = resolveProviderSlug(providerSlug);
  if (!provider) return null;

  const { from, to } = resolveLastNDays(7);
  const result = await computeLeaderboard(env, from, to);

  let pct: number | null = null;
  if (result.ok) {
    const entry = result.entries.find((e) => e.provider === provider);
    if (entry) {
      const decisive = entry.operational_polls + entry.degraded_polls + entry.down_polls;
      pct = decisive > 0 ? entry.uptime_pct : null;
    }
  }

  const label = customLabel ?? `${provider.toLowerCase()} uptime`;
  const value = pct === null ? 'no data' : `${pct.toFixed(2)}%`;
  const color = uptimeBadgeColor(pct);
  const svg = generateBadgeSvg(label, value, color);
  const etag = `"${provider}-${pct === null ? 'nodata' : pct.toFixed(4)}"`;

  return { svg, etag, status: 200 };
}
