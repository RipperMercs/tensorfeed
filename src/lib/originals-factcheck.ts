import type { OriginalArticle } from './originals-directory';

const DAY_MS = 86_400_000;

/**
 * True if dateStr (an originals-directory date such as "June 4, 2026") is no older
 * than `days` days before todayMs. Future-dated and same-day articles count as
 * in-window so a just-published piece is always checked; anything older is out.
 */
export function withinWindow(dateStr: string, todayMs: number, days: number): boolean {
  const t = Date.parse(dateStr);
  if (Number.isNaN(t)) return false;
  // Compare in calendar days, not raw milliseconds, so a DST fall-back hour cannot
  // push an exactly-N-day-old article out of the window when run in a local timezone.
  return Math.floor((todayMs - t) / DAY_MS) <= days;
}

export function selectWeeklyTargets(
  entries: OriginalArticle[],
  todayMs: number,
  days: number,
): OriginalArticle[] {
  return entries.filter((e) => withinWindow(e.date, todayMs, days));
}

/**
 * Given changed file paths, return the originals slugs among them. Matches
 * src/app/originals/<slug>/page.tsx with either path separator. Deduped and sorted.
 */
export function extractChangedSlugs(changedPaths: string[]): string[] {
  const re = /(?:^|\/)src\/app\/originals\/([a-z0-9-]+)\/page\.tsx$/;
  const slugs = new Set<string>();
  for (const raw of changedPaths) {
    const m = raw.trim().replace(/\\/g, '/').match(re);
    if (m) slugs.add(m[1]);
  }
  return Array.from(slugs).sort();
}
