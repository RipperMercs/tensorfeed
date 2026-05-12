/**
 * AFTA Certified badge SVG generator.
 *
 * Publishers can embed a live badge that reflects their current AFTA
 * compliance score at https://tensorfeed.ai/verify?domain=X. The badge
 * is a shields.io-style SVG rendered at runtime; the score is fetched
 * from the existing AFTA cert endpoint with a 5-minute edge cache.
 *
 * Usage:
 *   <a href="https://tensorfeed.ai/verify?domain=example.com">
 *     <img src="https://tensorfeed.ai/api/afta/badge?domain=example.com" alt="AFTA score">
 *   </a>
 *
 * Why this is a moat: every embed is a permanent inbound backlink from
 * a third-party site, which compounds into agent-discovery + SEO over
 * time. The badge cannot easily be faked because the SVG is rendered
 * server-side from our actual score endpoint; a publisher can lie about
 * being certified by editing their site, but the badge will reflect
 * reality the next time the cache expires.
 *
 * Cost: one AFTA cert fetch per (domain, 5min). Already cheap.
 */

import type { Env } from './types';

const BADGE_CACHE_TTL_SECONDS = 300; // 5 min edge cache

interface AftaResult {
  ok: boolean;
  domain: string;
  score: number;
  max: number;
  verdict: 'certified-eligible' | 'almost-eligible' | 'not-yet-eligible';
  afta_certified: boolean;
}

interface BadgeStyle {
  bg: string;
  fg: string;
  rightLabel: string;
}

function styleForResult(r: AftaResult): BadgeStyle {
  if (r.afta_certified) return { bg: '#16C784', fg: '#FFFFFF', rightLabel: `Certified ${r.score}/${r.max}` };
  if (r.verdict === 'certified-eligible') return { bg: '#16C784', fg: '#FFFFFF', rightLabel: `Eligible ${r.score}/${r.max}` };
  if (r.verdict === 'almost-eligible') return { bg: '#F7B500', fg: '#1A1A1A', rightLabel: `${r.score}/${r.max}` };
  return { bg: '#9E9E9E', fg: '#FFFFFF', rightLabel: `${r.score}/${r.max}` };
}

function styleForError(): BadgeStyle {
  return { bg: '#9E9E9E', fg: '#FFFFFF', rightLabel: 'unavailable' };
}

/**
 * Estimate text width in SVG units for a given font size. Real shields.io
 * pre-renders text via a font-metric service; for our purposes a coarse
 * 7px-per-char heuristic for 11px sans-serif is close enough — badges
 * are not pixel-perfect documents, and any slight over-allocation just
 * adds harmless padding.
 */
function approxTextWidth(text: string, pxPerChar = 6.8): number {
  return Math.ceil(text.length * pxPerChar);
}

function renderBadge(leftLabel: string, rightLabel: string, bg: string, fg: string): string {
  const leftPad = 6;
  const rightPad = 6;
  const leftW = approxTextWidth(leftLabel) + leftPad * 2;
  const rightW = approxTextWidth(rightLabel) + rightPad * 2;
  const totalW = leftW + rightW;
  const height = 20;
  const radius = 3;
  // Escape ampersands/lt/gt in labels so the embedded text is XML-safe.
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${height}" role="img" aria-label="${esc(leftLabel)}: ${esc(rightLabel)}">
  <title>${esc(leftLabel)}: ${esc(rightLabel)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#FFF" stop-opacity=".10"/>
    <stop offset="1" stop-opacity=".10"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalW}" height="${height}" rx="${radius}" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftW}" height="${height}" fill="#555"/>
    <rect x="${leftW}" width="${rightW}" height="${height}" fill="${bg}"/>
    <rect width="${totalW}" height="${height}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${leftW / 2}" y="14" fill="#000" fill-opacity=".35">${esc(leftLabel)}</text>
    <text x="${leftW / 2}" y="13" fill="#fff">${esc(leftLabel)}</text>
    <text x="${leftW + rightW / 2}" y="14" fill="#000" fill-opacity=".35">${esc(rightLabel)}</text>
    <text x="${leftW + rightW / 2}" y="13" fill="${fg}">${esc(rightLabel)}</text>
  </g>
</svg>`;
}

/**
 * Public handler. Fetches the cached AFTA cert result for the domain
 * and renders the badge. Returns SVG with edge cache headers. On any
 * fetch/validate error renders an "unavailable" badge instead of an
 * HTTP error, so a publisher's embed never breaks visually.
 */
export async function handleAftaBadge(request: Request, env: Env, url: URL): Promise<Response> {
  const domain = url.searchParams.get('domain');
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain.trim())) {
    const svg = renderBadge('AFTA', 'invalid domain', '#9E9E9E', '#FFFFFF');
    return svgResponse(svg, 60);
  }
  const cleaned = domain.trim().toLowerCase();
  try {
    // Build the cert endpoint URL on the same origin so this works in
    // every environment without baking the hostname into the binary.
    const certUrl = `${url.origin}/api/afta-certify/check?domain=${encodeURIComponent(cleaned)}`;
    const res = await fetch(certUrl, {
      headers: { Accept: 'application/json' },
      cf: { cacheTtl: BADGE_CACHE_TTL_SECONDS, cacheEverything: true },
    });
    if (!res.ok) throw new Error(`cert_endpoint_${res.status}`);
    const result = (await res.json()) as AftaResult;
    const style = styleForResult(result);
    const svg = renderBadge('AFTA', style.rightLabel, style.bg, style.fg);
    return svgResponse(svg, BADGE_CACHE_TTL_SECONDS);
  } catch {
    const style = styleForError();
    const svg = renderBadge('AFTA', style.rightLabel, style.bg, style.fg);
    return svgResponse(svg, 60);
  }
}

function svgResponse(svg: string, maxAge: number): Response {
  return new Response(svg, {
    status: 200,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
      'access-control-allow-origin': '*',
    },
  });
}
