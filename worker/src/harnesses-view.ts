/**
 * Federation overlay for /api/harnesses.
 *
 * Lays the live TerminalFeed coding-harness snapshot onto TF's editorial
 * harness scaffold. Per-harness source: a harness the federation board
 * covers is served from the live snapshot (fresh scores plus current model
 * names); a harness the federation does not cover keeps TF's static rows.
 * The benchmark columns and harness defs stay TF's own editorial data.
 *
 * Benchmark alignment: the federation board and TF share three benchmark
 * columns (SWE-bench Verified, Terminal-Bench, Aider Polyglot). SWE-Lancer
 * is a TF column the federation board no longer publishes, so federation
 * rows carry null there. METR HCAST is a federation column TF does not
 * show, so it is ignored.
 *
 * This module is pure (no I/O); the handler decides snapshot-vs-fallback
 * and computes freshness.
 */

import type { HarnessesData, HarnessResult } from './harnesses';
import type { HarnessSnapshot } from './terminalfeed-harnesses-fetcher';

// The federation board labels harnesses by display name; TF keys them by
// editorial slug. A couple of labels differ from TF's def name, so they get
// an explicit alias (TerminalFeed says "Cursor", TF's def is "Cursor Agent").
const HARNESS_NAME_ALIASES: Record<string, string> = {
  cursor: 'cursor-agent',
  windsurf: 'windsurf-cascade',
};

// TF benchmark ids the federation board can fill. The other TF column
// (swe_lancer) is no longer published by the board, and the board's own
// extra column (metr_hcast) is not part of TF's set.
const FEDERATION_FED_BENCHMARKS = new Set(['swe_bench_verified', 'terminal_bench', 'aider_polyglot']);

function normName(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Build a normalized-display-name to TF-slug map from the static harness
 * defs, plus the explicit aliases above.
 */
export function buildNameToSlug(staticData: HarnessesData): Record<string, string> {
  const map: Record<string, string> = {};
  for (const h of staticData.harnesses) map[normName(h.name)] = h.id;
  for (const [k, v] of Object.entries(HARNESS_NAME_ALIASES)) map[k] = v;
  return map;
}

/**
 * Overlay the federation snapshot onto the static editorial data. Returns a
 * HarnessesData with the same benchmark columns and harness defs, results
 * sourced per-harness (federation where covered, static otherwise), and
 * lastUpdated set to the federation board date.
 */
export function buildHarnessesView(snapshot: HarnessSnapshot, staticData: HarnessesData): HarnessesData {
  const nameToSlug = buildNameToSlug(staticData);
  const tfBenchmarkIds = staticData.benchmarks.map((b) => b.id);

  // Accumulate federation rows keyed by slug::model so multiple benchmark
  // results for the same (harness, model) land in one row.
  const fedRows = new Map<string, HarnessResult>();
  const coveredSlugs = new Set<string>();

  for (const bench of snapshot.benchmarks) {
    if (!FEDERATION_FED_BENCHMARKS.has(bench.id)) continue; // ignore metr_hcast and any future board-only column
    if (!tfBenchmarkIds.includes(bench.id)) continue;
    for (const r of bench.results) {
      const slug = nameToSlug[normName(r.harness)];
      if (!slug) continue; // federation harness with no TF editorial def (e.g. SWE-Agent): drop
      coveredSlugs.add(slug);
      const key = `${slug}::${r.model}`;
      let row = fedRows.get(key);
      if (!row) {
        const scores: Record<string, number | null> = {};
        for (const id of tfBenchmarkIds) scores[id] = null; // every TF column present, null until filled
        row = { harness: slug, model: r.model, scores };
        fedRows.set(key, row);
      }
      row.scores[bench.id] = r.score;
    }
  }

  const results: HarnessResult[] = [];
  for (const row of fedRows.values()) results.push(row);
  // Harnesses the federation board does not cover keep their static rows.
  for (const r of staticData.results) {
    if (!coveredSlugs.has(r.harness)) results.push(r);
  }

  const boardDate = snapshot.upstream_generated_at || snapshot.capturedAt.slice(0, 10);

  return {
    lastUpdated: boardDate,
    note: 'Live agentic-coding scores for the major harnesses come from the TerminalFeed federation board, with a per-result source_url to the upstream benchmark. Harnesses the board does not cover keep TensorFeed editorial scores. SWE-Lancer is no longer published by the federation board.',
    benchmarks: staticData.benchmarks,
    harnesses: staticData.harnesses,
    results,
  };
}
