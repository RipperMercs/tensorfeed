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
 * events by the derived canonical key so all variants resolve to the
 * same bucket. The original `company_normalized` field stays on each
 * event for the audit trail.
 *
 * Two layers:
 *   1. companyCanonicalKey: conservative, mechanical. Lowercase,
 *      strip punctuation + known legal-entity suffixes + trailing
 *      "and"/"&". No alias logic. Safe everywhere.
 *   2. canonicalKeyWithAliases: applies a curated parent/subsidiary
 *      alias map on top. Used by the rollup + query layer where we
 *      WANT subsidiaries to roll up to their parent's timeline.
 *
 * The batch 2 audit (jobs 25-28, 664 events, 2026-05-13) surfaced
 * 23 cross-batch drift pairs that the base function only handles
 * for ~8 of them. The alias map closes the remaining 15.
 *
 * Idempotent: alias map targets are themselves canonical (never appear
 * as source keys), so applying canonicalKeyWithAliases twice == once.
 * Safe for DataPal-side application at extraction time AND Worker-side
 * application at rollup time without double-collapse risk.
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
 * Curated parent/subsidiary alias map.
 *
 * Source: TF batch 2 FDA audit, 2026-05-13. FDA-context-specific:
 * "cook" inside the FDA recall corpus almost always means Cook
 * Medical, so we collapse it. Outside the FDA module this would be
 * unsafe; do not import this map elsewhere without thinking through
 * context. Keys are post-base-canonicalization strings (lowercased,
 * suffix-stripped). Values are the canonical target.
 *
 * Hand-curated only: never add aliases via heuristic or LLM-suggestion.
 * Each entry is a deliberate collapse of legally distinct entities
 * into a single timeline bucket.
 */
const FIRM_ALIAS_MAP: Readonly<Record<string, string>> = {
  // Olympus: Japanese subsidiary -> global parent
  'aizu olympus': 'olympus',

  // Medtronic: insulin-pump subsidiary -> parent
  'medtronic minimed': 'medtronic',

  // Zimmer Biomet: pre-merger name + operating divisions -> current parent
  'zimmer': 'zimmer biomet',
  'zimmer surgical': 'zimmer biomet',

  // Philips: divisional and regional variants -> parent brand
  'philips medical systems': 'philips',
  'philips medical systems nederland': 'philips',
  'philips medical systems dmc': 'philips',
  'philips north america': 'philips',

  // Siemens Healthineers: legacy "Siemens Medical Solutions" name + USA arm
  'siemens medical solutions': 'siemens healthineers',
  'siemens medical solutions usa': 'siemens healthineers',

  // CareFusion: numbered legal entity -> brand
  'carefusion 303': 'carefusion',

  // Fresenius Kabi: USA arm -> global brand
  'fresenius kabi usa': 'fresenius kabi',

  // Alcon: research division -> parent
  'alcon research': 'alcon',

  // Mindray: USA legal entity + DBA -> primary brand
  'mindray ds usa': 'mindray medical',
  'mindray north america': 'mindray medical',

  // Cook Medical: legacy "Cook Incorporated" + variant
  // FDA-context-specific: see module doc.
  'cook': 'cook medical',
};

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
 *   6. After suffix stripping, also strip a trailing standalone
 *      "and" or "&" (handles "Becton, Dickinson and Company" which
 *      after "company" removal leaves a dangling "and")
 *   7. Trim again
 *
 * Returns an empty string for null/empty inputs (caller should treat
 * as a non-key and skip indexing rather than aggregating empties).
 */
export function companyCanonicalKey(s: string | null | undefined): string {
  if (!s || typeof s !== 'string') return '';
  let normalized = s.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
  let changed = true;
  let safety = 5;
  while (changed && safety > 0) {
    changed = false;
    safety -= 1;
    for (const suffix of LEGAL_ENTITY_SUFFIXES) {
      const pattern = new RegExp(`\\s+${suffix}$`);
      if (pattern.test(normalized)) {
        normalized = normalized.replace(pattern, '').trim();
        changed = true;
        break;
      }
    }
  }
  // Strip trailing dangling "and" or "&" left behind by removing a
  // suffix like "and Company" or "& Co". Up to two passes to handle
  // "and &" or similar edge oddities.
  for (let pass = 0; pass < 2; pass += 1) {
    if (/\s+(and|&)$/.test(normalized)) {
      normalized = normalized.replace(/\s+(and|&)$/, '').trim();
    } else {
      break;
    }
  }
  return normalized;
}

/**
 * Apply the curated alias map on top of the mechanical canonical key.
 *
 * Used by the rollup + query layer where we want subsidiaries to roll
 * up to their parent's timeline. Idempotent: alias targets never
 * appear as source keys.
 */
export function canonicalKeyWithAliases(s: string | null | undefined): string {
  const base = companyCanonicalKey(s);
  if (!base) return '';
  const aliased = FIRM_ALIAS_MAP[base];
  return aliased ?? base;
}

/**
 * Build a canonical-key -> event-list index from an iterable of
 * events. Designed to be called at rollup time over the merged
 * fda-actions corpus. Events whose canonical key is empty (null
 * normalized name) are bucketed under '__unknown__' so they remain
 * inspectable but don't pollute named-firm buckets.
 *
 * Uses canonicalKeyWithAliases so subsidiaries roll up to their
 * parent's timeline. Pass `useAliases: false` to opt out (e.g. for
 * audit views where you want the un-collapsed buckets).
 */
export function buildCanonicalIndex<T extends { event_id: string; company_normalized?: string | null }>(
  events: Iterable<T>,
  opts: { useAliases?: boolean } = {},
): Map<string, string[]> {
  const useAliases = opts.useAliases ?? true;
  const keyFn = useAliases ? canonicalKeyWithAliases : companyCanonicalKey;
  const index = new Map<string, string[]>();
  for (const e of events) {
    const key = keyFn(e.company_normalized) || '__unknown__';
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
 * endpoint should look up. Uses the alias-aware function so a query
 * for "Aizu Olympus" hits the "olympus" bucket.
 */
export function canonicalKeyForQuery(query: string): string {
  return canonicalKeyWithAliases(query);
}

/**
 * Read-only snapshot of the alias map for inspection (e.g. an admin
 * endpoint that surfaces how the rollup is collapsing names).
 */
export function getFirmAliasMap(): Readonly<Record<string, string>> {
  return FIRM_ALIAS_MAP;
}
