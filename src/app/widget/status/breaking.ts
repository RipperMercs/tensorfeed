// Breaking-news strip for the widget. Pure decision logic (widgetBreaking)
// is unit-tested; fetchBreaking is the I/O sibling, kept out of the unit
// test the same way fetchFeed is in feed.ts. Reuses the already-tested
// isSafeHref guard so the embed never renders an offsite or scheme link.

import { isSafeHref } from '../../../lib/alert-bar-logic';

const BREAKING_URL = 'https://tensorfeed.ai/api/breaking';
const SITE_BASE = 'https://tensorfeed.ai';

// The server already filters /api/breaking to the single active alert or
// null, so the widget trusts (or ignores) it verbatim. We only read the
// fields the strip needs.
export interface RawBreaking {
  id?: unknown;
  headline?: unknown;
  href?: unknown;
}

export interface WidgetBreaking {
  headline: string;
  // Absolute article URL (the embed is cross-origin, so it must be
  // absolute and open top-level). null when the href is unsafe: the
  // headline still shows, just without a link, so a malformed href can
  // never produce an offsite or javascript: link inside an iframe.
  url: string | null;
}

export function widgetBreaking(
  alert: RawBreaking | null,
  opts: { demo: boolean },
): WidgetBreaking | null {
  // Demo mode previews status states only; never fabricate a news event.
  if (opts.demo || !alert) return null;
  const headline = typeof alert.headline === 'string' ? alert.headline.trim() : '';
  if (!headline) return null;
  const href = typeof alert.href === 'string' ? alert.href : '';
  const url = isSafeHref(href) ? `${SITE_BASE}${href}` : null;
  return { headline, url };
}

export async function fetchBreaking(): Promise<RawBreaking | null> {
  try {
    const res = await fetch(BREAKING_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; alert?: RawBreaking | null };
    return json && json.ok && json.alert ? json.alert : null;
  } catch {
    return null;
  }
}
