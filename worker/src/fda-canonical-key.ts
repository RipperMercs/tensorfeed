/**
 * FDA company canonical-key indexer.
 *
 * Background: Qwen-extracted `company_normalized` fields drift across
 * chunks for the same firm. The 30-batch (job #22) audit found:
 *   - "Medline Industries, LP" / "Medline Industries" / "Medline
 *     Industries LP" all returned for the same raw input
 *   - "Arrow International, LLC" vs "Arrow International LLC"
 *   - "Foundation Medicine, Inc." vs "Foundation Medicine Inc."
 *
 * The fix is at the consumer layer, not the extraction layer
 * (asking Qwen to be perfectly consistent on punctuation across
 * 200+ chunks is not reliable). The eventual
 * /api/premium/fda/enforcement-timeline?company= endpoint will index
 * events by the derived `companyCanonicalKey` so all variants resolve
 * to the same bucket. The original `company_normalized` field stays
 * on each event for the audit trail.
 *
 * Conservative on purpose: only strips punctuation and known legal-
 * entity suffixes. Does NOT case-fold beyond lowercase, does NOT
 * collapse "International" / "Intl", does NOT do fuzzy substring
 * matching. Each of those would broaden the bucket and risk
 * collapsing genuinely distinct firms (e.g. "Apollo Group" vs
 * "Apollo Hospitals" must remain distinct).
 */

const LEGAL_ENTITY_SUFFIXES: ReadonlyArray<string> = [
  'inc',
  'incorporated',
  'llc',
  'lp',
  'llp',
  'pllc',
  'plc',
  'ltd',
  'limited',
  'corp',
  'corporation',
  'company',
  'co',
  'gmbh',
  'ag',
  'sa',
  'srl',
  'bv',
  'nv',
  'pty',
];

/**
 * Derive a canonical lookup key from a `company_normalized` value.
 *
 * Pipeline:
 *   1. Lowercase
 *   2. Strip commas and periods (covers "Inc." vs "Inc," vs "Inc")
 *   3. Collapse whitespace runs to single spaces
 *   4. Trim
 *   5. If the trailing token matches a known legal-entity suffix,
 *      strip it. ITERATE: a firm may have multiple suffixes
 *      (e.g. "Foo Inc Ltd" -> "foo")
 *   6. Trim again
 *
 * Returns an empty string for null/empty inputs (caller should treat
 * as a non-key and skip indexing rather than aggregating empties).
 */
export function companyCanonicalKey(s: string | null | undefined): string {
  if (!s || typeof s !== 'string') return '';
  let normalized = s.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
  // Iteratively strip known suffixes from the END.
  // Bounded to a few passes; in practice 1-2 is enough.
  let changed = true;
  let safety = 5;
  while (changed && safety > 0) {
    changed = false;
    safety -= 1;
    for (const suffix of LEGAL_ENTITY_SUFFIXES) {
      // Match the suffix as the trailing whole word.
      const pattern = new RegExp(`\\s+${suffix}$`);
      if (pattern.test(normalized)) {
        normalized = normalized.replace(pattern, '').trim();
        changed = true;
        break;
      }
    }
  }
  return normalized;
}

/**
 * Build a canonical-key -> event-list index from an iterable of
 * events. Designed to be called at rollup time over the merged
 * fda-actions corpus. Events whose canonical key is empty (null
 * normalized name) are bucketed under '__unknown__' so they remain
 * inspectable but don't pollute named-firm buckets.
 *
 * The index value is just an array of event_ids (strings); the
 * caller hydrates the full event records from KV when serving the
 * timeline endpoint. Keeps the index payload small and KV-friendly.
 */
export function buildCanonicalIndex<T extends { event_id: string; company_normalized?: string | null }>(
  events: Iterable<T>,
): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const e of events) {
    const key = companyCanonicalKey(e.company_normalized) || '__unknown__';
    let bucket = index.get(key);
    if (!bucket) {
      bucket = [];
      index.set(key, bucket);
    }
    bucket.push(e.event_id);
  }
  return index;
}

/**
 * Convenience for the API surface: given a user-supplied
 * ?company=... query string, return the canonical key the timeline
 * endpoint should look up. Equivalent to companyCanonicalKey but
 * named for the API call site.
 */
export function canonicalKeyForQuery(query: string): string {
  return companyCanonicalKey(query);
}
