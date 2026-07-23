/**
 * Suggested next calls (cross-sell hints).
 *
 * Every premium response carries a `suggested_next_calls` block
 * pointing to 1 to 3 other TF endpoints relevant to the just-served
 * query. The intent is to train agents to walk TF's catalog rather
 * than treat each call as isolated. Compounds with the free trial:
 * an agent burning through its 100 trial calls discovers more of the
 * surface area, deeper evaluation, more conversion paths.
 *
 * Design decisions:
 *  - Suggestions are STATIC by endpoint, not dynamically derived from
 *    the response body. Static is predictable, easy to maintain, and
 *    avoids parsing fragility. A v2 layer can add response-content
 *    extraction (e.g. CVE id detected -> suggest /api/security/cve/{id}).
 *  - When the request URL has a param the next-call also uses (e.g.
 *    a date), the suggestion URL inherits it so the agent can call
 *    the suggestion VERBATIM with no parameter rewriting.
 *  - Suggestions are signed into the AFTA receipt body so an agent
 *    can audit "what TF recommended at the time of this call".
 *  - Each suggestion ships with a credit cost (0 for free endpoints,
 *    1 for premium) so the agent can make a budget decision.
 *
 * What's deliberately NOT in v1:
 *  - Personalization based on agent history (no agent identity to
 *    work with at the trial stage)
 *  - Embedding-based "similar agents called these" (no traffic yet)
 *  - Affiliate/cross-MCP suggestions to non-TF sources (silent
 *    posture: TF's own surfaces only for now)
 */

const FREE = 0;
const ONE_CREDIT = 1;
const FIVE_CREDITS = 5;
const TEN_CREDITS = 10;

export interface NextCallSuggestion {
  url: string;
  method: 'GET' | 'POST';
  why: string;
  credits: number;
}

interface SuggestionTemplate {
  /** Path part WITHOUT origin. Origin gets prepended at render time. */
  path: string;
  method?: 'GET' | 'POST';
  /** Reason an agent would call this next. Agent-facing copy. */
  why: string;
  credits: number;
  /**
   * Param keys to inherit verbatim from the inbound URL when present.
   * Lets the suggestion be a copy-pasteable URL without the agent
   * having to plumb context across calls.
   */
  inheritParams?: string[];
  /**
   * Static query params merged in regardless of the inbound URL.
   * Useful for nudging the agent toward a sensible default
   * (e.g. min_sources=4 on the verified search).
   */
  defaultParams?: Record<string, string>;
}

/**
 * Endpoint-keyed static map. Keys match `url.pathname` exactly. Path
 * params (e.g. /api/premium/clean/cve/{id}) match the literal pattern
 * not the resolved id.
 */
const SUGGESTION_MAP: Record<string, SuggestionTemplate[]> = {
  // === Decision-verified ===
  '/api/premium/news/decision-verified': [
    {
      path: '/api/history/news/clusters',
      why: 'Free discovery of cluster_ids for this same UTC date. Use to find more clusters to verify.',
      credits: FREE,
      inheritParams: ['date'],
    },
    {
      path: '/api/premium/news/decision-verified/search',
      why: 'Search recent days for clusters whose hero title matches a query, with the same verification scoring.',
      credits: ONE_CREDIT,
      defaultParams: { min_sources: '4' },
    },
    {
      path: '/api/premium/history/news/full',
      why: 'Pull the full untruncated articles for this date (free /api/news caps at recent only).',
      credits: ONE_CREDIT,
      inheritParams: ['date'],
    },
  ],
  '/api/premium/news/decision-verified/search': [
    {
      path: '/api/premium/news/decision-verified',
      why: 'Get the per-cluster verification card for any cluster_id surfaced in these search results.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/history/news/clusters',
      why: 'Free single-date enumeration of clusters (companion discovery surface).',
      credits: FREE,
    },
  ],

  // === Verified CVE (cross-database) ===
  '/api/premium/security/verified/{cve}': [
    {
      path: '/api/security/cve/{cve}',
      why: 'Just the MITRE record without cross-database verification (free).',
      credits: FREE,
    },
    {
      path: '/api/security/kev/{cve}',
      why: 'Just the CISA KEV entry, returns 404 if not on the catalog (free).',
      credits: FREE,
    },
    {
      path: '/api/security/epss/{cve}',
      why: 'Current EPSS exploitation-likelihood score for this CVE (free).',
      credits: FREE,
    },
  ],

  // === Premium research family ===
  '/api/premium/research/topic-search': [
    {
      path: '/api/premium/research/milestones',
      why: 'Filter the same corpus to is_milestone_candidate=true (recent papers flagged with quantified SOTA claims).',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/research/lab-productivity',
      why: 'Group the same corpus by normalized affiliation; top labs by paper count.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/research/emerging-keywords',
      why: 'Trending keywords across the corpus, recent vs baseline lift.',
      credits: ONE_CREDIT,
    },
  ],
  '/api/premium/research/milestones': [
    {
      path: '/api/premium/research/topic-search',
      why: 'Filter the same corpus by subfield_tag, methodology_bucket, or date range.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/research/emerging-keywords',
      why: 'Trending keywords across the corpus, leading indicator for next milestone candidates.',
      credits: ONE_CREDIT,
    },
  ],
  '/api/premium/research/lab-productivity': [
    {
      path: '/api/premium/research/topic-search',
      why: 'Drill into individual papers from any lab in the leaderboard.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/research/velocity',
      why: 'OpenAlex 30d-vs-baseline velocity ratio per institution.',
      credits: ONE_CREDIT,
    },
  ],
  '/api/premium/research/emerging-keywords': [
    {
      path: '/api/premium/research/topic-search',
      why: 'Filter the corpus to papers using any of the trending keywords.',
      credits: ONE_CREDIT,
    },
  ],

  // === Pricing / models ===
  '/api/premium/routing': [
    {
      path: '/api/premium/compare/models',
      why: 'Side-by-side comparison of any 2 to 5 models surfaced in routing recommendations.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/cost/projection',
      why: 'Project monthly spend across the recommended models for an expected workload.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/probe/series',
      why: 'TF-measured uptime / latency series for any provider in the routing list (90d max).',
      credits: FIVE_CREDITS,
    },
  ],
  '/api/premium/compare/models': [
    {
      path: '/api/premium/cost/projection',
      why: 'Project monthly spend across the same model set with your token-usage assumptions.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/whats-new',
      why: 'Pricing changes, new/removed models, status incidents in the last 7 days.',
      credits: ONE_CREDIT,
    },
  ],
  '/api/premium/cost/projection': [
    {
      path: '/api/premium/routing',
      why: 'Top-N model recommendations for a task with quality + cost + latency tradeoff scoring.',
      credits: ONE_CREDIT,
    },
  ],

  // === News / history ===
  '/api/premium/history/news/full': [
    {
      path: '/api/premium/history/news/clusters/full',
      why: 'Story-level cross-source clusters for the same date instead of flat article list.',
      credits: ONE_CREDIT,
      inheritParams: ['date', 'from', 'to'],
    },
    {
      path: '/api/premium/news/search',
      why: 'Full-text search the corpus with date and provider filters.',
      credits: ONE_CREDIT,
    },
  ],
  '/api/premium/history/news/clusters/full': [
    {
      path: '/api/premium/news/decision-verified',
      why: 'Per-cluster verification scoring (tier, source diversity, time-span analysis).',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/history/news/verified',
      why: 'Filter the same date to clusters with N or more independent sources.',
      credits: ONE_CREDIT,
      inheritParams: ['date', 'from', 'to'],
    },
  ],
  '/api/premium/news/search': [
    {
      path: '/api/premium/news/decision-verified/search',
      why: 'Same query but returns clusters with verification scores instead of raw articles.',
      credits: ONE_CREDIT,
      inheritParams: ['q'],
    },
  ],


  // === Agents directory ===
  '/api/premium/agents/directory': [
    {
      path: '/api/premium/whats-new',
      why: 'Last 7 days of pricing/model/status changes across the same provider set.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/probe/series',
      why: 'TF-measured uptime/latency for any provider listed in the directory.',
      credits: FIVE_CREDITS,
    },
  ],

  // === Daily brief family (2026-07-02: whats-new is the top converter;
  // its buyers were leaving with no pointer to the rest of the catalog) ===
  '/api/premium/whats-new': [
    {
      path: '/api/premium/whats-new/pro',
      why: 'Analyst layer on this same brief: synthesis summary, cited takeaways, and recommended actions per agent class.',
      credits: TEN_CREDITS,
    },
    {
      path: '/api/premium/inference-providers/arbitrage',
      why: 'Act on the pricing deltas above: current cheapest live provider per model with spread magnitudes.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/watches',
      method: 'POST',
      why: 'Stop polling: register a standing watch and get a webhook when the next change matching your filter lands.',
      credits: ONE_CREDIT,
    },
  ],
  '/api/premium/whats-new/pro': [
    {
      path: '/api/premium/watches',
      method: 'POST',
      why: 'Turn any takeaway into a standing watch so the next relevant change finds you without polling.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/model-deprecations/timeline',
      why: 'Deprecation and sunset dates for models referenced in the brief, for migration planning.',
      credits: ONE_CREDIT,
    },
  ],
  '/api/premium/watches': [
    {
      path: '/api/premium/whats-new',
      why: 'One-call catch-up on the last 24h of pricing, model, and status changes while your watches cover the future.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/failover-verdict',
      why: 'Signed primary-vs-fallback provider verdict, useful when a watch fires on a status incident.',
      credits: ONE_CREDIT,
    },
  ],
  '/api/premium/model-deprecations/timeline': [
    {
      path: '/api/premium/compare/models',
      why: 'Side-by-side comparison of a deprecated model against its candidate replacements.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/whats-new',
      why: 'Last 24h of pricing/model/status changes, including newly announced deprecations.',
      credits: ONE_CREDIT,
    },
  ],

  // === Policy / compliance ===
  '/api/premium/policy/timeline': [
    {
      path: '/api/premium/compliance/restricted-party',
      why: 'Screen a counterparty name against the US Consolidated Screening List with official citations.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/whats-new',
      why: 'The policy beat in context: last 24h of AI industry changes including regulatory headlines.',
      credits: ONE_CREDIT,
    },
  ],

  // === Provider economics ===
  '/api/premium/inference-providers/arbitrage': [
    {
      path: '/api/premium/routing',
      why: 'Task-aware model recommendations that weigh the same price data against quality and latency.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/cost/projection',
      why: 'Project monthly spend if you moved the workload to the cheapest provider surfaced here.',
      credits: ONE_CREDIT,
    },
  ],

  // === Package ecosystem ===
  '/api/premium/packages/pypi/momentum': [
    {
      path: '/api/premium/packages/releases/velocity',
      why: 'Release cadence per package over time, the maintenance-health signal behind the momentum score.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/ai-safety/packages/security/radar',
      why: 'Per-package security risk score over the OSV advisory snapshot for the same AI package set.',
      credits: ONE_CREDIT,
    },
  ],
  '/api/premium/packages/releases/velocity': [
    {
      path: '/api/premium/packages/pypi/momentum',
      why: 'Download-momentum ranking across the curated AI PyPI set, the demand side of release velocity.',
      credits: FIVE_CREDITS,
    },
    {
      path: '/api/premium/ai-cves/ai-stack-cves',
      why: 'Open CVEs affecting the AI stack packages you just checked.',
      credits: ONE_CREDIT,
    },
  ],

  // === Security ===
  '/api/premium/ai-safety/packages/security/radar': [
    {
      path: '/api/premium/ai-cves/ai-stack-cves',
      why: 'The CVE detail behind any hot or critical package in the radar.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/packages/releases/velocity',
      why: 'Whether risky packages are actively maintained (release cadence over time).',
      credits: ONE_CREDIT,
    },
  ],
  '/api/premium/ai-cves/ai-stack-cves': [
    {
      path: '/api/premium/ai-safety/packages/security/radar',
      why: 'Per-package 0-100 risk score and risk-band rollup across the curated AI package set.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/security/kev/full',
      why: 'CISA known-exploited-vulnerabilities catalog, cleaned and queryable, for exploitation-in-the-wild checks.',
      credits: ONE_CREDIT,
    },
  ],

  // === Commerce trust and settlement ===
  '/api/premium/counterparty/trust-verdict': [
    {
      path: '/api/premium/merchant/legitimacy',
      why: 'Domain-level legitimacy verdict (proceed/step_up/block) for the merchant behind the wallet.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/compliance/restricted-party',
      why: 'Name-based restricted-party screen against the US Consolidated Screening List.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/settlement/rail-verdict',
      why: 'Signed cheapest-and-fastest settlement rail recommendation for the payment you are about to make.',
      credits: ONE_CREDIT,
    },
  ],
  '/api/premium/merchant/legitimacy': [
    {
      path: '/api/premium/counterparty/trust-verdict',
      why: 'Wallet-level trust verdict for the same counterparty, on-chain history plus sanctions screen.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/compliance/restricted-party',
      why: 'Name-based restricted-party screen to complete the compliance picture.',
      credits: ONE_CREDIT,
    },
  ],
  '/api/premium/compliance/restricted-party': [
    {
      path: '/api/premium/counterparty/trust-verdict',
      why: 'Wallet-level trust verdict when you also hold a wallet address for the screened party.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/merchant/legitimacy',
      why: 'Domain-level legitimacy verdict when the screened party operates a storefront.',
      credits: ONE_CREDIT,
    },
  ],
  '/api/premium/settlement/rail-verdict': [
    {
      path: '/api/premium/counterparty/trust-verdict',
      why: 'Trust-check the counterparty wallet before settling on the recommended rail.',
      credits: ONE_CREDIT,
    },
  ],

  // === API ecosystem ===
  '/api/premium/apis-guru/ai-feed': [
    {
      path: '/api/premium/agents/directory',
      why: 'Curated agent and provider directory with status and capability filters.',
      credits: ONE_CREDIT,
    },
    {
      path: '/api/premium/whats-new',
      why: 'Last 24h of AI API pricing, model, and status changes in one call.',
      credits: ONE_CREDIT,
    },
  ],
};

/**
 * Generic fallback when a premium endpoint has no specific suggestion
 * map entry. Surfaces the discovery surfaces so an agent always has
 * a "where else can I look" hook even when the cross-sell graph
 * hasn't been hand-curated for that endpoint yet.
 */
const FALLBACK_SUGGESTIONS: SuggestionTemplate[] = [
  {
    path: '/api/meta',
    why: 'Full machine-readable catalog of TF endpoints (free, no auth).',
    credits: FREE,
  },
  {
    path: '/api/free-tier/status',
    why: 'Check your remaining free premium-trial calls for today (no auth).',
    credits: FREE,
  },
];

/**
 * Resolve a path-param template like /api/security/verified/{cve}
 * against the actual inbound pathname. Returns the inbound pathname
 * with the {cve} (or other named placeholder) replaced by the value
 * from the inbound URL, so the suggestion link is callable verbatim.
 *
 * If the template has no placeholders, returns the path unchanged.
 * If the inbound URL doesn't supply a value for a placeholder, the
 * placeholder is left in place (suggestion is informational, not
 * directly callable).
 */
function resolveTemplatePath(template: string, inboundPath: string): string {
  if (!template.includes('{')) return template;
  const inboundSegs = inboundPath.split('/').filter(Boolean);
  const templateSegs = template.split('/').filter(Boolean);
  // Only substitute when the inbound path has at least as many
  // segments as the template AND aligning from the right gives a
  // sensible match. lookupSuggestions only returns this template
  // when the segment counts match, so the common path here is
  // length-equal; the length check is defensive against direct
  // callers (renderSuggestion, exposed for tests).
  if (inboundSegs.length < templateSegs.length) return template;
  const result: string[] = [];
  for (let i = 0; i < templateSegs.length; i += 1) {
    const tSeg = templateSegs[i]!;
    if (tSeg.startsWith('{') && tSeg.endsWith('}')) {
      const offsetFromEnd = templateSegs.length - 1 - i;
      const inboundIdx = inboundSegs.length - 1 - offsetFromEnd;
      result.push(inboundSegs[inboundIdx] ?? tSeg);
    } else {
      result.push(tSeg);
    }
  }
  return '/' + result.join('/');
}

/**
 * Pick the suggestion-map key that matches the inbound pathname.
 * Tries exact match first, then template patterns containing
 * {placeholders}.
 */
function lookupSuggestions(inboundPath: string): SuggestionTemplate[] | null {
  if (SUGGESTION_MAP[inboundPath]) return SUGGESTION_MAP[inboundPath]!;
  for (const [tmpl, suggestions] of Object.entries(SUGGESTION_MAP)) {
    if (!tmpl.includes('{')) continue;
    const tmplSegs = tmpl.split('/').filter(Boolean);
    const inSegs = inboundPath.split('/').filter(Boolean);
    if (tmplSegs.length !== inSegs.length) continue;
    let match = true;
    for (let i = 0; i < tmplSegs.length; i += 1) {
      const t = tmplSegs[i]!;
      const s = inSegs[i]!;
      if (t.startsWith('{') && t.endsWith('}')) continue;
      if (t !== s) {
        match = false;
        break;
      }
    }
    if (match) return suggestions;
  }
  return null;
}

/**
 * Render a SuggestionTemplate into a callable NextCallSuggestion for
 * the response body. Inherits requested params, applies defaults,
 * resolves path placeholders.
 */
function renderSuggestion(
  template: SuggestionTemplate,
  origin: string,
  inboundUrl: URL,
): NextCallSuggestion {
  const resolvedPath = resolveTemplatePath(template.path, inboundUrl.pathname);
  const params = new URLSearchParams();
  if (template.inheritParams) {
    for (const key of template.inheritParams) {
      const v = inboundUrl.searchParams.get(key);
      if (v !== null) params.set(key, v);
    }
  }
  if (template.defaultParams) {
    for (const [k, v] of Object.entries(template.defaultParams)) {
      if (!params.has(k)) params.set(k, v);
    }
  }
  const qs = params.toString();
  const url = `${origin}${resolvedPath}${qs ? '?' + qs : ''}`;
  return {
    url,
    method: template.method ?? 'GET',
    why: template.why,
    credits: template.credits,
  };
}

/**
 * Public API: given an inbound Request, return the cross-sell
 * suggestions for the response body. Capped at 3 entries so we never
 * push back a wall of suggestions that obscures the actual response.
 */
export function buildSuggestedNextCalls(request: Request): NextCallSuggestion[] {
  let inboundUrl: URL;
  try {
    inboundUrl = new URL(request.url);
  } catch {
    return [];
  }
  const templates = lookupSuggestions(inboundUrl.pathname) ?? FALLBACK_SUGGESTIONS;
  return templates.slice(0, 3).map((t) => renderSuggestion(t, inboundUrl.origin, inboundUrl));
}

// Test-only export: lets unit tests inspect the lookup behavior without
// having to construct a Request object.
export const __test = {
  lookupSuggestions,
  resolveTemplatePath,
  renderSuggestion,
  SUGGESTION_MAP,
  FALLBACK_SUGGESTIONS,
};
