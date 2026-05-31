/**
 * Bazaar pilot registry.
 *
 * The subset of TF premium endpoints that route X-PAYMENT settlement through
 * Coinbase's hosted CDP facilitator (worker/src/cdp-facilitator.ts) instead
 * of our self-broadcast facilitator (worker/src/x402-facilitator.ts).
 *
 * Routing through CDP triggers automatic Bazaar catalog indexing on first
 * successful settle. Endpoints not in this list keep using the self-broadcast
 * facilitator and remain uncataloged.
 *
 * Pilot strategy (see project_bazaar_migration memory):
 *   - Wave 0 (this file at first commit): /api/premium/whats-new only
 *   - Wave 1 (post-pilot, flat-schema GET): ~15 more endpoints
 *   - Wave 2 (parametric routes): ~8 endpoints, each adding routeTemplate
 *   - Wave 3 (POST): /api/premium/watches
 *
 * Per-pilot metadata below feeds two places at request time:
 *   1. The 402 PaymentRequired response body: `resource.description` and
 *      `extensions.bazaar` are read by CDP when cataloging the endpoint.
 *   2. The CDP /settle request: clients echo the extension back in their
 *      PaymentPayload, and CDP validates the `info` against `schema` (AJV
 *      JSON Schema 2020-12). Validation failure = endpoint not cataloged.
 *
 * Bazaar extension shape spec (from coinbase/x402 typescript/packages/extensions):
 *   {
 *     info: { input: { type: "http", method, queryParams?, pathParams?, headers? },
 *             output?: { type: "json", example } },
 *     schema: { json schema validating `info` },
 *     routeTemplate?: "/path/with/:param/syntax"  // optional, for parametric routes
 *   }
 */

export interface BazaarPilotConfig {
  /** Bazaar-facing endpoint description; replaces the generic "TensorFeed premium API" in the 402 resource block. */
  description: string;
  /** The bazaar extension object placed under `extensions.bazaar` in the 402 response. */
  extension: Record<string, unknown>;
}

/**
 * The /api/premium/whats-new bazaar extension. Documented input + output
 * shapes match worker/src/whats-new.ts WhatsNewResult. The example below
 * mirrors a realistic 24-hour brief; CDP ranks endpoints with concrete
 * examples + semantic descriptions higher than bare metadata.
 */
const WHATS_NEW_PILOT: BazaarPilotConfig = {
  description:
    'Agent morning brief. One paid call returns the last 24 hours of AI pricing changes, new and removed models, service-status incidents, and top news headlines. The endpoint an agent calls on boot.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { days: 1, news_limit: 10 },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            window: { from: '2026-05-13', to: '2026-05-14', days: 1 },
            computed_at: '2026-05-14T08:00:00Z',
            summary: {
              total_pricing_changes: 3,
              new_models: 1,
              removed_models: 0,
              incidents: 2,
              news_articles: 10,
            },
            pricing: {
              changes: [
                {
                  model: 'Claude Opus 4.7',
                  provider: 'anthropic',
                  field: 'inputPrice',
                  from: 15,
                  to: 14,
                  delta_pct: -6.6667,
                },
              ],
              new_models: [
                {
                  model: 'Sonnet 4.7',
                  provider: 'anthropic',
                  input_per_1m: 3,
                  output_per_1m: 15,
                  tier: 'mid',
                },
              ],
              removed_models: [],
            },
            status: {
              incidents: [
                {
                  service: 'API',
                  provider: 'openai',
                  severity: 'minor',
                  title: 'Elevated latency for ChatGPT',
                  started_at: '2026-05-13T18:00:00Z',
                  resolved_at: '2026-05-13T19:30:00Z',
                  duration_minutes: 90,
                },
              ],
              currently_operational: 12,
              currently_degraded: 1,
              currently_down: 0,
              currently_unknown: 0,
            },
            news: [
              {
                title: 'Anthropic announces Claude Opus 4.8',
                url: 'https://anthropic.com/news/opus-4-8',
                source: 'Anthropic',
                published_at: '2026-05-13T15:00:00Z',
              },
            ],
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  days: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 7,
                    description: 'Window length in days back from now. Default 1, max 7.',
                  },
                  news_limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 25,
                    description: 'Max news headlines to return. Default 10, max 25.',
                  },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              example: { type: 'object' },
            },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/routing: top-N model recommendation joining live pricing,
 * benchmarks, status, and per-component composite scoring. Replaces several
 * fan-out calls + the agent's own ranking logic. The "I would pay $0.02 for
 * this" call per Kimi K2.6's external analysis of TF (2026-05-14).
 */
const ROUTING_PILOT: BazaarPilotConfig = {
  description:
    'Top-N AI model recommendation for a task. Joins live pricing, benchmarks, provider status, and latency into a single composite score so an agent gets a ranked answer in one call instead of stitching three free endpoints together.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { task: 'code', budget: 5.0, min_quality: 0.7, top_n: 3 },
        },
        output: {
          type: 'json',
          example: {
            task: 'code',
            recommendations: [
              {
                rank: 1,
                model: { name: 'Claude Opus 4.7', provider: 'anthropic' },
                pricing: {
                  input: 15,
                  output: 75,
                  currency: 'USD',
                  unit: 'per 1M tokens',
                },
                status: 'operational',
                composite_score: 0.87,
                components: {
                  quality: 0.94,
                  availability: 1.0,
                  cost: 0.65,
                  latency: 0.5,
                },
              },
            ],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  task: {
                    type: 'string',
                    enum: ['code', 'reasoning', 'creative', 'general'],
                    description: 'Task family the model needs to be good at.',
                  },
                  budget: {
                    type: 'number',
                    description: 'Max blended USD per 1M tokens.',
                  },
                  min_quality: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                    description: 'Minimum acceptable quality score (0 to 1).',
                  },
                  top_n: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10,
                    description: 'How many models to return ranked, default 3.',
                  },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              example: { type: 'object' },
            },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/compare/models: side-by-side comparison of 2-5 models with
 * pricing, benchmarks (normalized to union-of-keys, nulls intentional),
 * status, recent news mentions, and computed rankings (cheapest blended,
 * widest context, per-benchmark leaderboard). One agent call replaces
 * stitching /api/models + /api/benchmarks + /api/status + /api/news per
 * candidate.
 */
const COMPARE_MODELS_PILOT: BazaarPilotConfig = {
  description:
    'Side-by-side comparison of 2-5 AI models. Returns pricing, benchmarks normalized to union-of-keys with explicit nulls, live provider status, recent news mentions, and per-benchmark rankings in one ready-to-rank payload.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { ids: 'opus-4-7,gpt-5-5,gemini-3' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            models: [
              {
                id: 'opus-4-7',
                name: 'Claude Opus 4.7',
                provider: 'anthropic',
                pricing: { input: 15, output: 75, blended: 25 },
                benchmarks: {
                  swe_bench: 0.74,
                  mmlu_pro: 0.83,
                  gpqa_diamond: 0.68,
                  math: null,
                  human_eval: 0.94,
                },
                status: 'operational',
                news_count_30d: 12,
                context_window: 200000,
              },
            ],
            rankings: {
              cheapest_blended: ['gpt-5-5', 'gemini-3', 'opus-4-7'],
              widest_context: ['gemini-3', 'opus-4-7', 'gpt-5-5'],
              per_benchmark: {
                swe_bench: ['opus-4-7', 'gpt-5-5', 'gemini-3'],
              },
            },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  ids: {
                    type: 'string',
                    description:
                      'Comma-separated list of 2 to 5 model ids or display names (e.g. "opus-4-7,gpt-5-5,gemini-3").',
                  },
                },
                required: ['ids'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              example: { type: 'object' },
            },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/cost/projection: project a token-usage workload across 1-10
 * models. Returns daily/weekly/monthly/yearly totals per model plus a ranking
 * by cheapest monthly. Eliminates the need for agents to maintain pricing
 * tables locally.
 */
const COST_PROJECTION_PILOT: BazaarPilotConfig = {
  description:
    'Project the cost of a token-usage workload across 1-10 AI models. Returns daily, weekly, monthly, and yearly totals per model plus a ranking by cheapest monthly. The canonical "given my workload, what would each model cost me" call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: {
            model: 'opus-4-7,gpt-5-5',
            input_tokens_per_day: 1000000,
            output_tokens_per_day: 200000,
            horizon: 'monthly',
          },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            workload: {
              input_tokens_per_day: 1000000,
              output_tokens_per_day: 200000,
            },
            primary_horizon: 'monthly',
            projections: [
              {
                model: 'Claude Opus 4.7',
                provider: 'anthropic',
                matched: true,
                rates: {
                  input_per_1m: 15,
                  output_per_1m: 75,
                  blended_per_1m: 25,
                },
                daily: { input_cost: 15, output_cost: 15, total: 30 },
                weekly_total: 210,
                monthly_total: 900,
                yearly_total: 10950,
              },
            ],
            ranking_by_monthly_cheapest: ['gpt-5-5', 'opus-4-7'],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  model: {
                    type: 'string',
                    description:
                      'Comma-separated list of 1 to 10 model ids or display names.',
                  },
                  input_tokens_per_day: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Input tokens per day for the workload.',
                  },
                  output_tokens_per_day: {
                    type: 'integer',
                    minimum: 0,
                    description: 'Output tokens per day for the workload.',
                  },
                  horizon: {
                    type: 'string',
                    enum: ['daily', 'weekly', 'monthly', 'yearly'],
                    description:
                      'Primary horizon for the ranking (other horizons are still returned). Default monthly.',
                  },
                },
                required: ['model', 'input_tokens_per_day', 'output_tokens_per_day'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              example: { type: 'object' },
            },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * Wave 2 helper: minimal schema for endpoints that take no query params.
 * The schema still enforces the canonical HTTP GET input shape; queryParams
 * is allowed but not required, which lets the example carry an empty object.
 */
function flatGetSchema(): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      input: {
        type: 'object',
        properties: {
          type: { type: 'string', const: 'http' },
          method: { type: 'string', enum: ['GET'] },
          queryParams: { type: 'object' },
        },
        required: ['type', 'method'],
        additionalProperties: false,
      },
      output: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          example: { type: 'object' },
        },
        required: ['type'],
      },
    },
    required: ['input'],
  };
}

/**
 * /api/premium/agents/directory: enriched AI agents directory. Joins the
 * static catalog with live status, recent news, agent-traffic activity, and
 * sample pricing, returning a trending-score-ranked list in one paid call.
 * Replaces fan-out of /api/agents/directory + /api/status + /api/news.
 */
const AGENTS_DIRECTORY_PILOT: BazaarPilotConfig = {
  description:
    'Enriched AI agents directory. One paid call returns the catalog joined with live provider status, recent news mentions, 24h agent traffic, and sample model pricing, ranked by a derived trending score. The agent-discovers-agent feed.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: {
            category: 'coding',
            status: 'operational',
            open_source: false,
            sort: 'trending',
            limit: 25,
          },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            count: 25,
            agents: [
              {
                id: 'claude-code',
                name: 'Claude Code',
                provider: 'anthropic',
                category: 'coding',
                live_status: 'operational',
                trending_score: 87,
                recent_news_count: 4,
                agent_traffic_24h: 312,
                sample_pricing: { model: 'Claude Opus 4.7', blended_per_1m: 25 },
                url: 'https://claude.com/code',
              },
            ],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  category: { type: 'string', description: 'Filter by category id (coding, search, voice, etc).' },
                  status: { type: 'string', enum: ['operational', 'degraded', 'down', 'unknown'] },
                  open_source: { type: 'boolean' },
                  capability: { type: 'string', description: 'Filter to agents declaring this capability.' },
                  sort: { type: 'string', enum: ['trending', 'name', 'recent_news', 'agent_traffic'] },
                  limit: { type: 'integer', minimum: 1, maximum: 100 },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/funding/exposure: derived metrics over the free AI funding
 * portfolio. Charges 3 credits (tier 3) reflecting the heavier compute:
 * silicon-vendor concentration shares, per-investor circular-loop
 * classification, co-investor pairs, top recipients.
 */
const FUNDING_EXPOSURE_PILOT: BazaarPilotConfig = {
  description:
    'Derived structural metrics over the AI funding portfolio. Silicon-vendor concentration shares per investor, circular-loop classification (fully-circular / partial-loop / agnostic), co-investor pairs holding the same recipient, top recipients by inbound capital. The "who is funding whose silicon" call.',
  extension: {
    bazaar: {
      info: {
        input: { type: 'http', method: 'GET', queryParams: {} },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-23T05:00:00Z',
            silicon_concentration: [
              { vendor: 'Nvidia', total_usd: 12500000000, recipient_count: 18 },
              { vendor: 'AMD', total_usd: 3100000000, recipient_count: 6 },
            ],
            investor_loops: [
              { investor: 'Microsoft', classification: 'fully-circular', silicon_exposure_pct: 78 },
              { investor: 'Andreessen Horowitz', classification: 'agnostic', silicon_exposure_pct: 0 },
            ],
            top_recipients: [
              { name: 'OpenAI', inbound_usd: 13000000000, investor_count: 4 },
            ],
            co_investor_pairs: [
              { a: 'Microsoft', b: 'Nvidia', shared_recipients: ['OpenAI', 'Mistral'] },
            ],
            billing: { credits_charged: 3, credits_remaining: 47 },
          },
        },
      },
      schema: flatGetSchema(),
    },
  },
};

/**
 * /api/premium/packages/pypi/momentum: per-package momentum + velocity
 * over the AI/ML PyPI trending snapshot. Direction classification + notable
 * movers + by-category counts in one call.
 */
const PYPI_MOMENTUM_PILOT: BazaarPilotConfig = {
  description:
    'AI/ML PyPI package momentum and velocity. Per-package week-over-week change, direction classification (accelerating / steady / declining), notable movers, and by-category counts. The "what AI packages are heating up" feed.',
  extension: {
    bazaar: {
      info: {
        input: { type: 'http', method: 'GET', queryParams: {} },
        output: {
          type: 'json',
          example: {
            ok: true,
            window: { window_days: 7 },
            packages: [
              {
                name: 'langchain',
                category: 'orchestration',
                downloads_current: 5400000,
                downloads_prior: 4900000,
                velocity_ratio: 1.102,
                direction: 'accelerating',
              },
            ],
            notable_movers: { gainers: ['langchain', 'instructor'], decliners: ['old-llm-lib'] },
            by_category: { orchestration: 12, embeddings: 8, evaluation: 5 },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: flatGetSchema(),
    },
  },
};

/**
 * /api/premium/research/velocity: per-institution AI publication velocity
 * over the OpenAlex 365-day baseline + fresh 30-day window. Direction
 * classification + by-country and by-type breakdowns.
 */
const RESEARCH_VELOCITY_PILOT: BazaarPilotConfig = {
  description:
    'Per-institution AI research publication velocity. 30-day window vs 365-day baseline with direction classification, notable movers, plus by-country and by-affiliation-type breakdowns. OpenAlex CC0. The "which AI labs are accelerating" feed.',
  extension: {
    bazaar: {
      info: {
        input: { type: 'http', method: 'GET', queryParams: {} },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-23T06:00:00Z',
            institutions: [
              {
                openalex_id: 'I1294671590',
                display_name: 'Google DeepMind',
                country_code: 'GB',
                works_last_30d: 92,
                works_baseline_30d_avg: 71,
                velocity_ratio: 1.296,
                direction: 'accelerating',
              },
            ],
            notable_movers: { gainers: ['DeepMind', 'Anthropic'], decliners: [] },
            by_country: { US: 412, CN: 178, GB: 96 },
            by_type: { industry: 213, academia: 489 },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: flatGetSchema(),
    },
  },
};

/**
 * /api/premium/research/authors: top 100 AI authors by trailing-365d
 * publication volume, enriched with h_index, ORCID, affiliation. OpenAlex.
 */
const RESEARCH_AUTHORS_PILOT: BazaarPilotConfig = {
  description:
    'Top 100 AI researchers ranked by AI publication volume in the trailing 365 days, enriched with h-index, i10-index, total citation count, primary affiliation (institution + country), ORCID, and derived AI-share-of-total. OpenAlex CC0. Daily refresh.',
  extension: {
    bazaar: {
      info: {
        input: { type: 'http', method: 'GET', queryParams: {} },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-23T06:00:00Z',
            window_days: 365,
            concept: { id: 'C154945302', name: 'Artificial intelligence' },
            authors: [
              {
                rank: 1,
                openalex_id: 'A5023888391',
                display_name: 'Yoshua Bengio',
                orcid: 'https://orcid.org/0000-0002-9322-3515',
                primary_affiliation: {
                  openalex_id: 'I70931966',
                  display_name: 'Université de Montréal',
                  country_code: 'CA',
                },
                ai_works_last_year: 87,
                total_works_count: 821,
                cited_by_count: 412000,
                h_index: 168,
                i10_index: 632,
                ai_share_pct: 0.74,
              },
            ],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: flatGetSchema(),
    },
  },
};

/**
 * /api/premium/research/citation-velocity: recent AI papers ranked by
 * share of total citations earned in the most recent calendar year.
 */
const RESEARCH_CITATION_VELOCITY_PILOT: BazaarPilotConfig = {
  description:
    'Top 100 recent AI papers ranked by the share of their total citations earned in the most recent calendar year. Papers published in the last 2 years with 3+ citations. Surfaces papers that are still gaining traction now. OpenAlex CC0.',
  extension: {
    bazaar: {
      info: {
        input: { type: 'http', method: 'GET', queryParams: {} },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-23T06:00:00Z',
            papers: [
              {
                rank: 1,
                openalex_id: 'W4400000000',
                doi: '10.48550/arXiv.2503.00000',
                title: 'Scaling Test-Time Compute Beyond Chain-of-Thought',
                year: 2025,
                total_citations: 412,
                latest_year_citations: 318,
                latest_year_share: 0.772,
                venue: 'arXiv',
                authors: ['First Author', 'Second Author', 'Third Author'],
                primary_affiliation: { display_name: 'Anthropic', country_code: 'US' },
              },
            ],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: flatGetSchema(),
    },
  },
};

/**
 * /api/premium/research/milestones: Qwen-flagged milestone arXiv papers
 * from the last 30 days with structured reasoning per paper.
 */
const RESEARCH_MILESTONES_PILOT: BazaarPilotConfig = {
  description:
    'Last 30 days of arXiv preprints flagged as milestone candidates by an offline Qwen 3.6 27B per-paper extraction pass. Each paper carries structured reasoning naming the benchmark + quantified delta, model release, or novel architecture justification. Conservative; false positives are worse than false negatives.',
  extension: {
    bazaar: {
      info: {
        input: { type: 'http', method: 'GET', queryParams: {} },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-23T06:00:00Z',
            window_days: 30,
            papers: [
              {
                arxiv_id: '2505.12345',
                title: 'A Reasoning Model That Wins Math Olympiad Gold',
                published_at: '2026-05-14',
                is_milestone_candidate: true,
                reasoning: 'Reports 84.7% on AIME 2024 (prior SOTA 63.1%), +21.6pp absolute. Names a new MoE-of-Experts routing scheme; reproducible config.',
                category: 'benchmark_delta',
                arxiv_url: 'https://arxiv.org/abs/2505.12345',
              },
            ],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: flatGetSchema(),
    },
  },
};

/**
 * /api/premium/research/emerging-keywords: top-50 keyphrases by recent vs
 * baseline lift across arXiv abstracts, with example arxiv_ids.
 */
const RESEARCH_EMERGING_KEYWORDS_PILOT: BazaarPilotConfig = {
  description:
    'Top 50 multi-word keyphrases across recent arXiv AI abstracts ranked by recent-vs-baseline lift (last 30 days frequency over prior 90 days, smoothed). Each keyphrase carries 2-5 example arxiv_ids so an agent can drill into the underlying work. The trend-spotter feed for AI research vocabulary.',
  extension: {
    bazaar: {
      info: {
        input: { type: 'http', method: 'GET', queryParams: {} },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-23T06:00:00Z',
            window: { recent_days: 30, baseline_days: 90 },
            keywords: [
              {
                rank: 1,
                phrase: 'test-time compute scaling',
                recent_frequency: 47,
                baseline_frequency: 6,
                lift: 7.83,
                example_arxiv_ids: ['2505.12345', '2505.23456', '2505.34567'],
              },
            ],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: flatGetSchema(),
    },
  },
};

/**
 * /api/premium/economy/recession-watch: composite recession-risk signal
 * across yield curve + Sahm rule. red/yellow/green classification.
 */
const RECESSION_WATCH_PILOT: BazaarPilotConfig = {
  description:
    'Composite recession-risk signal. Yield-curve inversion (10Y minus 2Y) and Sahm-rule unemployment trigger, each classified red / yellow / green with an explanation, plus a composite verdict and brief synthesis. BLS + FRED public-domain data; TensorFeed-derived classification.',
  extension: {
    bazaar: {
      info: {
        input: { type: 'http', method: 'GET', queryParams: {} },
        output: {
          type: 'json',
          example: {
            ok: true,
            computed_at: '2026-05-23T12:00:00Z',
            data_freshness: {
              bls_captured_at: '2026-05-23T05:00:00Z',
              fred_captured_at: '2026-05-23T05:30:00Z',
            },
            yield_curve: {
              spread_10y_2y: -0.18,
              level: 'yellow',
              explanation: '10Y-2Y spread at -0.18pp: mildly inverted. Watching for sustained inversion.',
            },
            sahm_rule: {
              unemp_3mo_avg: 4.2,
              unemp_12mo_low: 3.8,
              sahm_value: 0.4,
              threshold_pp: 0.5,
              level: 'yellow',
              explanation: 'Sahm value 0.40pp: approaching the 0.5pp Sahm threshold. Watch.',
            },
            composite: {
              level: 'yellow',
              score: 50,
              explanation: 'Mixed signals. At least one indicator is in the watch zone but neither has fully triggered.',
            },
            brief: 'Watch zone: at least one indicator is in transition.',
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: flatGetSchema(),
    },
  },
};

/**
 * /api/premium/policy/timeline: forward + backward calendar over the AI
 * policy registry. Optional ?days_back=, ?days_forward=, ?jurisdiction= with
 * sane defaults.
 */
const POLICY_TIMELINE_PILOT: BazaarPilotConfig = {
  description:
    'Forward and backward calendar over the AI policy registry. Each entry classified relative to now (past / active / upcoming), days-until-effective, with next-3-milestones for upcoming items. Filter by jurisdiction (EU, US, UK, etc) and time window. The "what AI rules are about to bite" feed.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { days_back: 90, days_forward: 365, jurisdiction: 'EU' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-23T07:00:00Z',
            window: { days_back: 90, days_forward: 365, jurisdiction: 'EU' },
            entries: [
              {
                id: 'eu-ai-act-gpai-codes',
                title: 'EU AI Act: General-Purpose AI codes of practice',
                jurisdiction: 'EU',
                effective_date: '2026-08-02',
                relative_to_now: 'upcoming',
                days_until_effective: 71,
                next_milestones: [
                  { name: 'Codes finalized', date: '2026-07-01' },
                  { name: 'Enforcement begins', date: '2026-08-02' },
                ],
                source_url: 'https://artificialintelligenceact.eu',
              },
            ],
            counts: { past: 12, active: 4, upcoming: 9 },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  days_back: { type: 'integer', minimum: 0, maximum: 3650 },
                  days_forward: { type: 'integer', minimum: 0, maximum: 3650 },
                  jurisdiction: { type: 'string', description: 'ISO country/region code or known bloc (EU, US, UK, CN, etc).' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/apis-guru/ai-feed: AI-relevant APIs from the APIs.guru
 * directory of 2400+ OpenAPI specs, with per-entry first_seen_at + a
 * separate newly_added_last_7d cohort.
 */
const APIS_GURU_AI_PILOT: BazaarPilotConfig = {
  description:
    'AI-relevant APIs from the APIs.guru directory of 2400+ OpenAPI specs, filtered via curated keyword matching. Per-entry first_seen_at against TensorFeed snapshot history so an agent can answer "what new AI APIs appeared in the last 7 days": a diff APIs.guru itself cannot provide. CC-BY-SA 4.0; source links preserved.',
  extension: {
    bazaar: {
      info: {
        input: { type: 'http', method: 'GET', queryParams: {} },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-23T08:00:00Z',
            count: 142,
            by_provider: { 'openai.com': 3, 'anthropic.com': 1, 'replicate.com': 2 },
            entries: [
              {
                api_id: 'openai.com',
                provider: 'openai.com',
                title: 'OpenAI API',
                description: 'The OpenAI REST API providing access to GPT-5, embeddings, vision, audio, and more.',
                openapi_url: 'https://api.apis.guru/v2/specs/openai.com/2.3.0/openapi.yaml',
                service_url: 'https://api.openai.com',
                logo_url: 'https://api.apis.guru/v2/cache/logo/openai.com.png',
                first_seen_at: '2025-09-12',
                latest_updated_at: '2026-05-20',
                matched_keywords: ['gpt', 'openai'],
                newly_added_last_7d: false,
              },
            ],
            newly_added_last_7d: [],
            attribution: { source: 'APIs.guru', license: 'CC-BY-SA 4.0' },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: flatGetSchema(),
    },
  },
};

/**
 * /api/premium/model-deprecations/timeline: Wave 3 pilot (2026-05-24).
 * Window-centered timeline over the model-deprecation registry, enriched
 * with urgency_band, days_until_sunset, days_since_sunset, and a resolved
 * migration_chain hop sequence per entry. Premium-shaped because the
 * derived metrics + migration_chains are computed server-side; the free
 * sibling at /api/model-deprecations returns the raw registry only.
 */
const MODEL_DEPRECATIONS_TIMELINE_PILOT: BazaarPilotConfig = {
  description:
    'Model deprecation timeline with migration intelligence. Each entry enriched with urgency_band (within_7d / within_30d / within_60d / within_90d / past), days_until_sunset, days_since_sunset, and a resolved migration_chain hop sequence to the first still-active replacement. Optional within_days window centered on now; optional provider filter. The "is my model affected and what should I migrate to" call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { within_days: 90, provider: 'openai' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-24T12:00:00Z',
            filter: { within_days: 90, provider: 'openai' },
            total_in_registry: 12,
            returned_count: 1,
            entries: [
              {
                id: 'openai-gpt-4-32k',
                provider: 'OpenAI',
                model: 'gpt-4-32k-0613',
                status: 'sunsetted',
                announcedDate: '2024-06-06',
                deprecationDate: '2025-06-06',
                sunsetDate: '2025-06-06',
                replacement: 'gpt-4-turbo',
                sourceUrl: 'https://platform.openai.com/docs/deprecations',
                days_until_deprecation: -351,
                days_until_sunset: -351,
                days_since_sunset: 351,
                urgency_band: 'past',
                migration_chain: ['gpt-4-32k-0613', 'gpt-4-turbo'],
              },
            ],
            summary: {
              by_provider: { OpenAI: 1 },
              by_urgency_band: {
                past: 1, within_7d: 0, within_30d: 0, within_60d: 0,
                within_90d: 0, within_180d: 0, within_365d: 0,
                future: 0, no_date: 0,
              },
            },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  within_days: {
                    type: 'integer',
                    minimum: 7,
                    maximum: 730,
                    description: 'Window centered on now in days. Entries are included when |days_until_sunset| <= within_days. Omit for full registry.',
                  },
                  provider: {
                    type: 'string',
                    description: 'Case-insensitive substring match against provider (OpenAI, Anthropic, Google, Cohere, ...).',
                  },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/inference-providers/arbitrage: Wave 4 pilot (2026-05-24).
 * Cross-provider price-spread analytics over the curated inference-providers
 * matrix. Surfaces per-model cheapest/most-expensive/spread/savings_pct and
 * per-provider value_score. Free /api/inference-providers serves the raw
 * matrix; this is the agent-decision-ready derivative.
 */
const INFERENCE_ARBITRAGE_PILOT: BazaarPilotConfig = {
  description:
    'Cross-provider arbitrage analytics for hosted inference. Per-model: cheapest_paid, most_expensive_paid, spread_usd, savings_pct, median_paid_blended, fastest_tps, cheapest_with_tps, free_tier_offers. Plus provider_rollup (cheapest_count, top_tps_count, value_score 0-100) and top_arbitrage models sorted by savings_pct desc. Pairs with the free /api/inference-providers matrix. The "where to migrate workloads" call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { family: 'Meta', min_savings_pct: 20 },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-24T12:00:00Z',
            filter: { family: 'Meta', min_savings_pct: 20 },
            matrix_last_updated: '2026-05-24',
            models_in_matrix: 3,
            tracked_providers: ['Together AI', 'Fireworks', 'DeepInfra', 'Groq', 'OpenRouter', 'Replicate', 'Anyscale', 'DeepSeek', 'GitHub Models'],
            models: [
              {
                modelId: 'llama-4-scout',
                modelName: 'Llama 4 Scout',
                family: 'Meta',
                paramsB: 109,
                offer_count_paid: 6,
                free_tier_offers: [],
                cheapest_paid: { provider: 'DeepInfra', blendedPrice: 0.355 },
                most_expensive_paid: { provider: 'Replicate', blendedPrice: 0.425 },
                median_paid_blended: 0.385,
                spread_usd: 0.07,
                savings_pct: 16.47,
                fastest_tps: { provider: 'Groq', outputTPS: 950 },
                cheapest_with_tps: { provider: 'DeepInfra', blendedPrice: 0.355, outputTPS: 170 },
              },
            ],
            top_arbitrage: [],
            provider_rollup: [
              { provider: 'DeepInfra', appearances_paid: 5, cheapest_count: 3, top_tps_count: 0, free_tier_count: 0, value_score: 100 },
              { provider: 'Groq', appearances_paid: 3, cheapest_count: 0, top_tps_count: 2, free_tier_count: 0, value_score: 33 },
            ],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  family: {
                    type: 'string',
                    description: 'Case-insensitive substring filter on model family (Meta, DeepSeek, Mistral, Alibaba, Microsoft, ...).',
                  },
                  min_savings_pct: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                    description: 'Minimum savings_pct to include a model in the top_arbitrage array. Default 20.',
                  },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/ai-safety/incidents/exposure: Wave 5 pilot (2026-05-24).
 * Vendor exposure rollups over the daily-refreshed AVID snapshot.
 * Per-developer + per-deployer incident counts with recency-weighted
 * exposure_score, risk_domain + sep_view distributions, top affected
 * artifacts. Premium-shaped because the rollup + recency weighting
 * happen server-side; free /api/ai-safety/incidents/avid serves the
 * raw snapshot only.
 */
const AI_SAFETY_EXPOSURE_PILOT: BazaarPilotConfig = {
  description:
    'AI safety incident exposure analytics. Per-developer and per-deployer incident counts with recency-weighted exposure_score (1.0 last 30d, 0.5 days 31-90, 0.25 older), risk_domain and SEP-view (Security/Ethics/Performance) distributions, top affected artifacts. Derived over the AVID (avidml/avid-db, MIT) snapshot refreshed daily. The "which AI vendors have the most recent reported safety incidents" call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { vendor: 'OpenAI', risk_domain: 'Security', within_days: 90 },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-24T12:00:00Z',
            snapshot_captured_at: '2026-05-24T03:00:00Z',
            source: 'avidml/avid-db',
            source_license: 'MIT',
            filter: { vendor: 'OpenAI', risk_domain: 'Security', within_days: 90 },
            window: { window_days: 90, cutoff_date: '2026-02-23' },
            entries_count: 12,
            developers: [
              {
                vendor: 'OpenAI',
                role: 'developer',
                incident_count: 8,
                recent_count_30d: 2,
                exposure_score: 5.5,
                risk_domains: ['Ethics', 'Security'],
                latest_report_id: 'AVID-2026-R0481',
                latest_reported_date: '2026-05-18',
              },
            ],
            deployers: [],
            risk_domains: [
              { risk_domain: 'Security', incident_count: 8, recent_count_30d: 2 },
            ],
            sep_view: [
              { sep_view: 'S0403: Adversarial Example', incident_count: 4 },
            ],
            top_artifacts: [
              { name: 'gpt-4o', type: 'Model', incident_count: 3, developers: ['OpenAI'] },
            ],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  vendor: {
                    type: 'string',
                    description: 'Case-insensitive substring match against developer + deployer + artifact name.',
                  },
                  risk_domain: {
                    type: 'string',
                    description: 'Case-insensitive substring match against AVID risk_domains (Security, Ethics, Performance, ...).',
                  },
                  within_days: {
                    type: 'integer',
                    minimum: 7,
                    maximum: 730,
                    description: 'Restrict to incidents reported in the last N days. Omit for full snapshot.',
                  },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/ai-safety/packages/security/radar: Wave 6 pilot (2026-05-24).
 * Per-package risk scoring + breaking-change radar over the daily-refreshed
 * OSV snapshot of the curated AI/ML package lists. Risk_score (0-100) from
 * a weighted sum of recent critical/high counts plus open advisory count
 * and a 7d-freshness bonus. Bands: calm/watch/hot/critical.
 */
const AI_PKG_SECURITY_RADAR_PILOT: BazaarPilotConfig = {
  description:
    'AI-package security radar. Per-package risk_score (0-100) over the daily OSV snapshot of curated AI/ML PyPI + npm packages: critical_count_30d * 25 + high_30d * 12 + critical_90d * 6 + high_90d * 3 + min(open_count, 20) + 5 if any advisory in last 7d, saturated to 100. Risk_band classifications (calm <10 / watch 10-25 / hot 25-50 / critical 50+) plus notable_movers (top-5 by_critical_30d, by_risk_score, new_in_last_7d). The "which AI deps should I be worried about right now" call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { ecosystem: 'PyPI', category: 'agent-framework', min_risk_score: 10 },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-24T12:00:00Z',
            snapshot_captured_at: '2026-05-24T05:45:00Z',
            source: 'osv.dev',
            filter: { ecosystem: 'PyPI', category: 'agent-framework', min_risk_score: 10, package: null },
            packages_in_snapshot: 8,
            rows: [
              {
                package: 'langchain',
                ecosystem: 'PyPI',
                category: 'agent-framework',
                homepage: 'https://langchain.com',
                open_count: 3,
                critical_count_30d: 1,
                high_count_30d: 0,
                critical_count_90d: 1,
                high_count_90d: 2,
                latest_advisory_id: 'GHSA-xxxx-xxxx-2026',
                latest_published: '2026-05-20',
                days_since_latest: 4,
                risk_score: 39,
                risk_band: 'hot',
                recent_advisories: [],
              },
            ],
            notable_movers: { by_critical_30d: [], by_risk_score: [], new_in_last_7d: [] },
            summary: {
              by_band: { calm: 5, watch: 2, hot: 1, critical: 0 },
              by_ecosystem: { PyPI: 8, npm: 0 },
              total_open_advisories: 12,
            },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  ecosystem: { type: 'string', enum: ['PyPI', 'npm'] },
                  category: { type: 'string', description: 'Case-insensitive substring match against curated category (llm-sdk, agent-framework, rag, ...).' },
                  package: { type: 'string', description: 'Case-insensitive substring match against package name.' },
                  min_risk_score: { type: 'number', minimum: 0, maximum: 100, description: 'Minimum risk_score to include in the headline rows array. Default 10.' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/packages/releases/velocity: Wave 7 pilot (2026-05-24).
 * Per-package release velocity + breaking-change radar over the 6-hourly
 * PyPI + npm snapshot. Premium-shaped because the bump classification
 * (semver-aware, pre-1.0 minor = major) and 24h/7d/30d windowing run
 * server-side; free /api/packages/releases just serves raw versions.
 */
const PKG_RELEASES_VELOCITY_PILOT: BazaarPilotConfig = {
  description:
    'AI-package release velocity. Per-package releases_24h / releases_7d / releases_30d, latest bump classification (major/minor/patch/prerelease, pre-1.0 minor counts as major per semver), is_breaking_recent flag (major bump within 30 days). Notable movers: recent_major_bumps, most_releases_7d, fastest_cadence_30d. Filter by ecosystem (PyPI/npm), category (llm-sdk, agent-framework, etc), or package substring. The "what AI deps just changed and is it breaking" call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { ecosystem: 'PyPI', category: 'agent-framework', min_releases_7d: 1 },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-24T18:35:00Z',
            snapshot_captured_at: '2026-05-24T18:35:00Z',
            filter: { ecosystem: 'PyPI', category: 'agent-framework', package: null, min_releases_7d: 1 },
            packages_in_snapshot: 12,
            rows: [
              {
                package: 'langchain',
                ecosystem: 'PyPI',
                category: 'agent-framework',
                homepage: 'https://langchain.com',
                latest_version: '0.4.0',
                latest_published_at: '2026-05-23T19:14:11Z',
                days_since_latest: 1,
                releases_24h: 1,
                releases_7d: 3,
                releases_30d: 9,
                versions_known_total: 412,
                latest_bump_kind: 'major',
                previous_version: '0.3.27',
                is_breaking_recent: true,
              },
            ],
            notable_movers: { recent_major_bumps: [], most_releases_7d: [], fastest_cadence_30d: [] },
            summary: {
              by_ecosystem: { PyPI: 12, npm: 0 },
              by_category: { 'agent-framework': 12 },
              by_bump_kind: { major: 1, minor: 4, patch: 5, prerelease: 1, sideways: 0, unknown: 1 },
              total_releases_7d: 18,
              total_releases_30d: 47,
              breaking_changes_30d: 2,
            },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  ecosystem: { type: 'string', enum: ['PyPI', 'npm'] },
                  category: { type: 'string', description: 'Case-insensitive substring match against curated category (llm-sdk, agent-framework, rag, ...).' },
                  package: { type: 'string', description: 'Case-insensitive substring match against package name.' },
                  min_releases_7d: { type: 'integer', minimum: 0, maximum: 100, description: 'Minimum releases-in-window for the headline rows array. Default 1.' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/ai-velocity: Wave 8 pilot (2026-05-24).
 * First AFTA federation cross-call: TF pulls TerminalFeed's HF + GitHub
 * trending leaderboards, filters each to AI-relevant entries, derives
 * traction scoring + cross-pollination. The "what AI project is rising
 * on both HuggingFace AND GitHub right now" call.
 */
const AI_VELOCITY_PILOT: BazaarPilotConfig = {
  description:
    'AI velocity cross-surface signal. First AFTA federation cross-call: TensorFeed derives an AI cohort from TerminalFeed\'s HF + GitHub trending leaderboards with per-entry traction_score, cross-pollination (names appearing on BOTH leaderboards = higher confidence), and rollups by HF pipeline + GitHub language. Filters: pipeline, language, min_traction, cross_only.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { pipeline: 'text-generation', language: 'Python', min_traction: 50, cross_only: false },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-24T18:00:00Z',
            snapshot_captured_at: '2026-05-24T17:42:00Z',
            source: 'terminalfeed.io federation cross-call',
            filter: { pipeline: 'text-generation', language: 'Python', min_traction: 50, cross_only: false },
            cohort_size: { hf: 15, github: 15, cross_pollinated: 3 },
            hf_top: [
              {
                id: 'meta-llama/Llama-4-8B',
                author: 'meta-llama',
                name: 'Llama-4-8B',
                likes: 4120,
                downloads: 2840000,
                pipeline: 'text-generation',
                url: 'https://huggingface.co/meta-llama/Llama-4-8B',
                updated: '2026-05-22',
                normalized_name: 'llama-4-8b',
                traction_score: 12424.5,
                on_both: true,
              },
            ],
            github_top: [
              {
                name: 'llama.cpp',
                fullName: 'ggerganov/llama.cpp',
                description: 'LLM inference in C/C++',
                language: 'C++',
                stars: 78420,
                url: 'https://github.com/ggerganov/llama.cpp',
                matched_markers: ['llm', 'inference engine'],
                normalized_name: 'llama.cpp',
                traction_score: 146.9,
                on_both: false,
              },
            ],
            cross_pollinated: [
              {
                normalized_name: 'llama-4-8b',
                hf: { id: 'meta-llama/Llama-4-8B', name: 'Llama-4-8B', likes: 4120, downloads: 2840000, url: 'https://huggingface.co/meta-llama/Llama-4-8B' },
                github: { fullName: 'meta-llama/Llama-4-8B', stars: 5200, language: 'Python', url: 'https://github.com/meta-llama/Llama-4-8B' },
                combined_traction: 12537.2,
              },
            ],
            summary: {
              hf_by_pipeline: { 'text-generation': 12, 'image-text-to-text': 3 },
              github_by_language: { Python: 9, 'C++': 3, TypeScript: 3 },
              total_hf_likes: 18500,
              total_github_stars: 245000,
            },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  pipeline: { type: 'string', description: 'Case-insensitive substring match against HuggingFace pipeline tag.' },
                  language: { type: 'string', description: 'Case-insensitive substring match against GitHub repo primary language.' },
                  min_traction: { type: 'number', minimum: 0, maximum: 10000, description: 'Minimum traction_score to include in headline arrays. Default 0.' },
                  cross_only: { type: 'boolean', description: 'When true, return only items with on_both=true. Default false.' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/ai-crypto-pulse: Wave 9 pilot (2026-05-24).
 * Second AFTA federation cross-call: TF joins TerminalFeed's crypto-movers
 * + funding-rates streams over an AI-thesis token cohort, classifies each
 * position as squeeze/chase/coiled/neutral based on the funding-rate vs
 * price-move signal. The "what AI tokens are about to move and why" call.
 */
const AI_CRYPTO_PULSE_PILOT: BazaarPilotConfig = {
  description:
    'AI-thesis token pulse: joins price moves with venue-weighted perp funding-rate skew. Per-token setup classification (squeeze_up = rising + negative funding = shorts trapped; chase_up = rising + positive funding = leverage mean-reversion risk; squeeze_down; chase_down; coiled = flat + extreme funding). Notable movers cohort + breadth + median change summary. Filters: token substring, setup kind, min_abs_change_pct.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { token: 'TAO', setup: 'squeeze_up', min_abs_change_pct: 1 },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-24T18:00:00Z',
            snapshot_captured_at: '2026-05-24T17:57:00Z',
            source: 'terminalfeed.io federation cross-call',
            filter: { token: 'TAO', setup: 'squeeze_up', min_abs_change_pct: 1 },
            cohort: { cohort_size: 1, movers_seen: 6, funding_seen: 4, failed_venues: [] },
            rows: [
              {
                symbol: 'TAO',
                display_name: 'Bittensor',
                thesis: 'decentralized ML training network',
                price_usd: 412.5,
                change_24h_percent: 8.4,
                market_cap: 3700000000,
                funding_venue_count: 3,
                funding_median_annualized_pct: -28.5,
                funding_venue_spread_pct: 6.2,
                funding_by_venue: [
                  { venue: 'binance', annualized_pct: -25.4, period_rate: -0.000232, mark_price: 412.4 },
                  { venue: 'bybit', annualized_pct: -28.5, period_rate: -0.000261, mark_price: 412.5 },
                  { venue: 'hyperliquid', annualized_pct: -31.6, period_rate: -0.000289, mark_price: 412.6 },
                ],
                setup: 'squeeze_up',
              },
            ],
            notable_movers: {
              squeezes_up: [],
              squeezes_down: [],
              coiled: [],
              top_gainers: [],
              top_losers: [],
            },
            summary: { by_setup: { squeeze_up: 1, chase_up: 0, squeeze_down: 0, chase_down: 0, coiled: 0, neutral: 0 }, breadth_pct_positive: 100, median_change_24h_pct: 8.4 },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  token: { type: 'string', description: 'Case-insensitive substring match against symbol or display_name (TAO, Bittensor, etc).' },
                  setup: { type: 'string', enum: ['squeeze_up', 'chase_up', 'squeeze_down', 'chase_down', 'coiled', 'neutral'] },
                  min_abs_change_pct: { type: 'number', minimum: 0, maximum: 1000, description: 'Minimum |change_24h_percent| to include in rows. Default 0.' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/coding-harnesses/weekly-deltas: Wave 10 pilot (2026-05-24).
 * Third AFTA federation cross-call. Compares two daily TerminalFeed
 * harness snapshots to surface score + rank deltas, entered/exited
 * combinations, biggest movers, and per-benchmark leader churn.
 */
const HARNESS_DELTAS_PILOT: BazaarPilotConfig = {
  description:
    'Agentic-coding harness weekly deltas. Compares current TerminalFeed harness leaderboard snapshot (SWE-bench Verified, Terminal-Bench, Aider Polyglot, etc) to a prior snapshot. Per-(benchmark, harness, model) score + rank deltas with change_kind classification (gained / regressed / entered / exited / unchanged). Notable movers (biggest_gainers, biggest_regressions, entered, exited), per-benchmark leader_cards with leader_changed flag, summary rollups. Filters: days_back (1-90, default 7), harness, benchmark, model, min_abs_delta.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { days_back: 7, harness: 'Claude Code', benchmark: 'swe-bench-verified', min_abs_delta: 1 },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-24T18:00:00Z',
            current_captured_at: '2026-05-24T05:25:00Z',
            prior_captured_at: '2026-05-17T05:25:00Z',
            days_between_snapshots: 7,
            source: 'terminalfeed.io federation cross-call',
            filter: { days_back: 7, harness: 'Claude Code', benchmark: 'swe-bench-verified', model: null, min_abs_delta: 1 },
            cohort: { rows_total: 84, rows_filtered: 6, benchmarks_in_window: 4 },
            rows: [
              {
                benchmark: 'swe-bench-verified',
                harness: 'Claude Code',
                model: 'Claude Opus 4.7',
                current_score: 74.2,
                prior_score: 72.1,
                delta: 2.1,
                current_rank: 1,
                prior_rank: 1,
                rank_delta: 0,
                change_kind: 'gained',
              },
            ],
            notable_movers: { biggest_gainers: [], biggest_regressions: [], entered: [], exited: [] },
            leader_cards: [
              {
                benchmark: 'swe-bench-verified',
                current_leader: { harness: 'Claude Code', model: 'Claude Opus 4.7', score: 74.2 },
                prior_leader: { harness: 'Claude Code', model: 'Claude Opus 4.7', score: 72.1 },
                leader_changed: false,
              },
            ],
            summary: { by_change_kind: { unchanged: 0, gained: 6, regressed: 0, entered: 0, exited: 0 }, benchmarks_with_new_leader: 0 },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  days_back: { type: 'integer', minimum: 1, maximum: 90, description: 'Days back to fetch the comparison snapshot. Default 7.' },
                  harness: { type: 'string', description: 'Case-insensitive substring match against harness name.' },
                  benchmark: { type: 'string', description: 'Case-insensitive substring match against benchmark id.' },
                  model: { type: 'string', description: 'Case-insensitive substring match against model name.' },
                  min_abs_delta: { type: 'number', minimum: 0, maximum: 100, description: 'Minimum |score delta| for the headline rows array. Default 0; entered/exited rows always included.' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/news/action-cards: Wave 11 pilot (2026-05-24).
 * First Haiku-derived premium endpoint. Per-article structured action
 * cards over the daily news feed. Per-article 7-day cache means
 * marginal compute is near-zero for repeat-coverage articles.
 */
const NEWS_ACTION_CARDS_PILOT: BazaarPilotConfig = {
  description:
    'AI news action cards. For each article in the daily TF news feed, Haiku 4.5 produces a structured agent action card answering "what should an AI agent or operator DO in response to this." Per card: action_summary (1-2 sentences), migration_recommendation (string or null), affected_capability (model / pricing / safety / framework / infrastructure / tooling / policy / ecosystem), cost_impact, security_impact, urgency. Filters: capability + urgency exact-match, min_cost_impact + min_security_impact threshold, title/source query. Sort priority: urgency > security > cost > recency.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { capability: 'model', urgency: 'immediate', min_cost_impact: 'medium' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-24T18:00:00Z',
            snapshot_captured_at: '2026-05-24T08:00:00Z',
            source: 'tensorfeed.ai news + Claude Haiku 4.5',
            filter: { capability: 'model', min_cost_impact: 'medium', min_security_impact: 'none', urgency: 'immediate', query: null },
            cohort: { articles_considered: 50, cards_in_snapshot: 47, cards_filtered: 3 },
            cards: [
              {
                article_id: 'a1b2c3',
                article_title: 'Anthropic deprecates Claude 3 Sonnet effective July 21',
                article_url: 'https://example.com/claude-3-sonnet-deprecated',
                article_source: 'Anthropic',
                article_published_at: '2026-05-23T15:00:00Z',
                action_summary: 'Migrate any agent still on claude-3-sonnet-20240229 to claude-haiku-4-5 or claude-opus-4-7 before July 21 to avoid silent 410 responses.',
                migration_recommendation: 'claude-haiku-4-5-20251001 for cost-sensitive paths; claude-opus-4-7 for quality-critical paths',
                affected_capability: 'model',
                cost_impact: 'high',
                security_impact: 'low',
                urgency: 'immediate',
                generated_at: '2026-05-24T08:00:00Z',
              },
            ],
            summary: {
              by_capability: { pricing: 0, model: 3, safety: 0, framework: 0, infrastructure: 0, tooling: 0, policy: 0, ecosystem: 0 },
              by_urgency: { immediate: 3, this_week: 0, fyi: 0 },
              by_cost_impact: { none: 0, low: 0, medium: 1, high: 2 },
              by_security_impact: { none: 0, low: 3, medium: 0, high: 0 },
              cards_with_migration_recommendation: 2,
            },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  capability: { type: 'string', enum: ['pricing', 'model', 'safety', 'framework', 'infrastructure', 'tooling', 'policy', 'ecosystem'] },
                  urgency: { type: 'string', enum: ['immediate', 'this_week', 'fyi'] },
                  min_cost_impact: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
                  min_security_impact: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
                  query: { type: 'string', description: 'Case-insensitive substring match against article_title and article_source.' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/status/incidents/triage: Wave 12 pilot (2026-05-24).
 * Second Haiku-derived premium endpoint. Per-incident triage cards over
 * AI provider status feed with impact classification + recommended
 * action. Per-incident KV cache keeps Haiku spend near-zero.
 */
const INCIDENT_TRIAGE_PILOT: BazaarPilotConfig = {
  description:
    'AI provider incident triage. For each open or recently-resolved incident across Anthropic, OpenAI, Google, Mistral, Cohere, etc., Haiku 4.5 produces a structured triage card. Per card: triage_summary (1-2 sentences), impact_classification (informational / minor / major / critical), affected_capabilities (inference / training / embeddings / console / billing / fine-tuning / api-keys / tooling), recommended_action (no_action / monitor / retry_later / failover_now / escalate). Filters: provider substring, impact + recommended_action + capability exact-match, ongoing_only.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { provider: 'OpenAI', ongoing_only: true, impact: 'major' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-24T18:15:00Z',
            snapshot_captured_at: '2026-05-24T18:15:00Z',
            source: 'tensorfeed.ai status incidents + Claude Haiku 4.5',
            filter: { provider: 'OpenAI', impact: 'major', recommended_action: null, capability: null, ongoing_only: true },
            cohort: { incidents_considered: 14, cards_in_snapshot: 12, cards_filtered: 1, ongoing_in_filtered: 1 },
            cards: [
              {
                incident_id: 'openai-2026-05-24-001',
                provider: 'openai',
                service: 'API',
                title: 'Elevated latency for ChatGPT and GPT-4 Turbo',
                severity: 'major',
                started_at: '2026-05-24T17:42:00Z',
                resolved_at: null,
                ongoing: true,
                triage_summary: 'OpenAI API experiencing 5% elevated latency for ChatGPT and GPT-4 Turbo; Assistants API and Files unaffected.',
                impact_classification: 'major',
                affected_capabilities: ['inference'],
                recommended_action: 'retry_later',
                generated_at: '2026-05-24T18:15:00Z',
              },
            ],
            summary: {
              by_provider: { openai: 1 },
              by_impact: { informational: 0, minor: 0, major: 1, critical: 0 },
              by_recommended_action: { no_action: 0, monitor: 0, retry_later: 1, failover_now: 0, escalate: 0 },
              by_capability: { inference: 1, training: 0, embeddings: 0, console: 0, billing: 0, 'fine-tuning': 0, 'api-keys': 0, tooling: 0 },
              cards_with_failover_action: 0,
            },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  provider: { type: 'string', description: 'Case-insensitive substring match against provider name.' },
                  impact: { type: 'string', enum: ['informational', 'minor', 'major', 'critical'] },
                  recommended_action: { type: 'string', enum: ['no_action', 'monitor', 'retry_later', 'failover_now', 'escalate'] },
                  capability: { type: 'string', enum: ['inference', 'training', 'embeddings', 'console', 'billing', 'fine-tuning', 'api-keys', 'tooling'] },
                  ongoing_only: { type: 'boolean', description: 'When true, exclude resolved incidents. Default false.' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/status/{provider}/incidents/triage: Wave 16 (2026-05-26).
 *
 * AgentMail scoped+flat duplication pattern translated. Five distinct paths
 * (openai, anthropic, google, aws, azure) each backed by the Wave 12 Haiku
 * triage snapshot, pre-scoped by URL path. Each gets its own Bazaar pilot
 * config (intentionally NOT a routeTemplate, which CDP consolidates to one
 * catalog row) so agents can discover/subscribe per provider.
 *
 * Factory returns a config customized for the provider's display name and
 * substring. All five share the same schema; only descriptions and example
 * payloads vary so the cataloged page reads naturally per provider.
 */
function makeProviderTriagePilot(provider: string, displayName: string): BazaarPilotConfig {
  return {
    description:
      `Per-provider incident triage scoped to ${displayName}. Same Haiku 4.5 cohort + filters + rollups as /api/premium/status/incidents/triage, pre-scoped to ${displayName}. The single-call lookup an agent makes when it needs to know whether ${displayName} is currently affecting its workload and what to do about it. Optional filters: impact, recommended_action, capability, ongoing_only.`,
    extension: {
      bazaar: {
        info: {
          input: {
            type: 'http',
            method: 'GET',
            queryParams: { ongoing_only: true, impact: 'major' },
          },
          output: {
            type: 'json',
            example: {
              ok: true,
              snapshot_captured_at: '2026-05-26T08:15:00Z',
              filter: { provider, impact: 'major', recommended_action: null, capability: null, ongoing_only: true },
              cohort: { incidents_considered: 14, cards_in_snapshot: 12, cards_filtered: 1, ongoing_in_filtered: 1 },
              cards: [
                {
                  provider,
                  service: 'API',
                  title: `Elevated latency on ${displayName} inference endpoints`,
                  severity: 'major',
                  started_at: '2026-05-26T07:42:00Z',
                  ongoing: true,
                  triage_summary: `${displayName} inference layer showing 5% elevated latency on completion endpoints; other capabilities unaffected.`,
                  impact_classification: 'major',
                  affected_capabilities: ['inference'],
                  recommended_action: 'retry_later',
                },
              ],
              summary: {
                by_provider: { [provider]: 1 },
                by_impact: { informational: 0, minor: 0, major: 1, critical: 0 },
                by_recommended_action: { no_action: 0, monitor: 0, retry_later: 1, failover_now: 0, escalate: 0 },
                cards_with_failover_action: 0,
              },
            },
          },
        },
        schema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            input: {
              type: 'object',
              properties: {
                type: { type: 'string', const: 'http' },
                method: { type: 'string', enum: ['GET'] },
                queryParams: {
                  type: 'object',
                  properties: {
                    impact: { type: 'string', enum: ['informational', 'minor', 'major', 'critical'] },
                    recommended_action: { type: 'string', enum: ['no_action', 'monitor', 'retry_later', 'failover_now', 'escalate'] },
                    capability: { type: 'string', enum: ['inference', 'training', 'embeddings', 'console', 'billing', 'fine-tuning', 'api-keys', 'tooling'] },
                    ongoing_only: { type: 'boolean', description: 'When true, exclude resolved incidents. Default false.' },
                  },
                },
              },
              required: ['type', 'method'],
              additionalProperties: false,
            },
            output: {
              type: 'object',
              properties: { type: { type: 'string' }, example: { type: 'object' } },
              required: ['type'],
            },
          },
          required: ['input'],
        },
      },
    },
  };
}

/**
 * /api/premium/whats-new/pro: Wave 18 (2026-05-26).
 *
 * Tier-ladder variant of the existing /api/premium/whats-new endpoint
 * (Parallel.ai-style pattern). Same 24-hour delta payload plus Haiku 4.5
 * generated analyst summary, cited key takeaways, and recommended
 * actions targeted by agent class. Every claim cites by stable
 * data_ids ID; citations are server-side validated.
 *
 * Priced at 10 credits to sit above base at 1 credit. Distinct catalog
 * row from the base pilot so agents see the choice.
 */
const WHATS_NEW_PRO_PILOT: BazaarPilotConfig = {
  description:
    'Pro tier of the agent morning brief. Returns the same 24-hour delta as /api/premium/whats-new plus Claude Haiku 4.5 generated analyst synthesis: a narrative summary, 1-5 key takeaways, and 1-3 recommended actions targeted by agent class (inference-bound, training-bound, security-watchful, cost-bound, compliance-watchful). Every claim cites back to a stable basis ID assigned server-side BEFORE the model sees the data. Citations that do not resolve are rejected at validation, so the agent never sees a hallucinated reference. 10 credits vs base at 1 credit.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { days: 1, news_limit: 10 },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            tier: 'pro',
            window: { from: '2026-05-13', to: '2026-05-14', days: 1 },
            computed_at: '2026-05-14T08:00:00Z',
            summary: {
              total_pricing_changes: 1,
              new_models: 1,
              removed_models: 0,
              incidents: 1,
              news_articles: 1,
            },
            pricing: {
              changes: [
                {
                  model: 'Claude Opus 4.7',
                  provider: 'anthropic',
                  field: 'inputPrice',
                  from: 15,
                  to: 14,
                  delta_pct: -6.6667,
                },
              ],
              new_models: [
                {
                  model: 'Sonnet 4.7',
                  provider: 'anthropic',
                  input_per_1m: 3,
                  output_per_1m: 15,
                  tier: 'mid',
                },
              ],
              removed_models: [],
            },
            status: {
              incidents: [
                {
                  service: 'API',
                  provider: 'openai',
                  severity: 'minor',
                  title: 'Elevated latency for ChatGPT',
                  started_at: '2026-05-13T18:00:00Z',
                  resolved_at: '2026-05-13T19:30:00Z',
                  duration_minutes: 90,
                },
              ],
              currently_operational: 12,
              currently_degraded: 1,
              currently_down: 0,
              currently_unknown: 0,
            },
            news: [
              {
                title: 'Anthropic announces Claude Opus 4.8',
                url: 'https://anthropic.com/news/opus-4-8',
                source: 'Anthropic',
                published_at: '2026-05-13T15:00:00Z',
              },
            ],
            data_ids: {
              pricing_changes: { c1: 'Claude Opus 4.7|anthropic|inputPrice' },
              new_models: { m1: 'Sonnet 4.7|anthropic' },
              removed_models: {},
              incidents: { i1: 'openai|Elevated latency for ChatGPT|2026-05-13T18:00:00Z' },
              news: { n1: 'https://anthropic.com/news/opus-4-8' },
            },
            pro: {
              generated_by: 'claude-haiku-4-5-20251001',
              generated_at: '2026-05-14T08:00:00Z',
              analyst_summary: 'Anthropic cut Claude Opus 4.7 input pricing by 7 percent to 14 USD per million tokens in the window, the latest in a sequence of cohort price reductions. OpenAI experienced a minor 90 minute latency event on the ChatGPT API; no other carrier grade incidents. Cohort wide inference cost continues to trend down.',
              key_takeaways: [
                {
                  claim: 'Anthropic cut Claude Opus 4.7 input pricing by 7 percent',
                  basis: ['c1'],
                  confidence: 0.98,
                },
                {
                  claim: 'Anthropic announced a new Sonnet 4.7 mid tier model',
                  basis: ['m1', 'n1'],
                  confidence: 0.95,
                },
              ],
              recommended_actions: [
                {
                  for: 'cost-bound',
                  action: 'Re-evaluate Claude Opus as primary model given the price cut and capability parity',
                  priority: 'monitor',
                  basis: ['c1'],
                },
                {
                  for: 'inference-bound',
                  action: 'Test Sonnet 4.7 in low risk workloads as a cost effective mid tier alternative',
                  priority: 'monitor',
                  basis: ['m1'],
                },
              ],
            },
            billing: { credits_charged: 10, credits_remaining: 40 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  days: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 7,
                    description: 'Window length in days back from now. Default 1, max 7.',
                  },
                  news_limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 25,
                    description: 'Max news headlines to return. Default 10, max 25.',
                  },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/sec/filings/ai-flagged: Wave 17 (2026-05-26).
 * Full AI-flagged SEC filings cohort from DP CC Qwen-on-5090 extraction
 * over the 14 AI bellwether companies (silicon, hyperscaler, ai-native,
 * infra, consumer). Each filing carries verbatim AI-capex / AI-revenue /
 * AI-partnership / AI-chip / new-AI-product / AI-workforce mention
 * arrays plus key_quotes. Optional filters keep the cohort scope flexible.
 */
const SEC_FILINGS_AI_FLAGGED_PILOT: BazaarPilotConfig = {
  description:
    'AI-flagged SEC filings cohort. The Qwen-extracted AI mentions (capex, revenue, partnerships, chip vendors, new products, workforce changes, key quotes) from every recent SEC filing across the 14 AI bellwether companies (NVDA, AMD, AVGO, TSM, ARM, MSFT, GOOGL, AMZN, ORCL, PLTR, SMCI, AAPL, META, TSLA). Optional filters: ticker, form (10-K, 10-Q, 8-K), since (YYYY-MM-DD), min_score (0-100). The single-call lookup an agent makes to track AI capex, partnership flow, and chip dependencies across the public-market AI ecosystem.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { ticker: 'NVDA', form: '10-K', min_score: 70 },
        },
        output: {
          type: 'json',
          example: {
            batch_id: '20260526-0000Z',
            extracted_at: '2026-05-26T00:00:00Z',
            filter: { ticker: 'NVDA', form: '10-K', since: null, min_score: 70 },
            cohort: { total_in_snapshot: 142, total_after_filter: 3 },
            filings: [
              {
                accession_number: '0001045810-25-000123',
                cik: '0001045810',
                ticker: 'NVDA',
                company_name: 'NVIDIA',
                form: '10-K',
                filing_date: '2025-12-12',
                ai_relevant: true,
                ai_relevance_score: 95,
                ai_keyword_hits: ['artificial intelligence', 'AI factory', 'H100', 'GPU'],
                ai_capex_mentions: [],
                ai_revenue_mentions: [],
                ai_partnership_mentions: [
                  {
                    partner_name: 'Foxconn',
                    relationship_type: 'joint_venture',
                    context: 'multi-year strategic collaboration to build AI factories powered by NVIDIA H100 and H200 GPUs',
                  },
                ],
                ai_chip_mentions: [
                  { vendor: 'nvidia', chip_or_product: 'H100', context: 'powered by NVIDIA H100 and H200 GPUs' },
                ],
                new_ai_products_announced: [],
                ai_workforce_changes: [],
                key_quotes: [
                  { quote: 'AI factories are the foundation of every nation intelligence infrastructure', section: 'Item 7.01' },
                ],
                extracted_by: 'qwen-3.6-27b',
                extracted_at: '2026-05-26T00:00:00Z',
              },
            ],
            source_license: 'US Government public domain (17 USC 105)',
            source_attribution: 'SEC EDGAR (data.sec.gov) + Qwen 3.6 27B verbatim extraction + deterministic normalize',
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  ticker: { type: 'string', description: 'AI bellwether ticker (NVDA, AMD, AVGO, TSM, ARM, MSFT, GOOGL, AMZN, ORCL, PLTR, SMCI, AAPL, META, TSLA). Case-insensitive.' },
                  form: { type: 'string', description: 'SEC form type (10-K, 10-Q, 8-K, S-1, DEF 14A, etc). Case-insensitive.' },
                  since: { type: 'string', description: 'Inclusive lower bound on filing_date as YYYY-MM-DD.' },
                  min_score: { type: 'integer', minimum: 0, maximum: 100, description: 'Inclusive lower bound on ai_relevance_score.' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/sec/filings/by-form?form=10-K: Wave 17 (2026-05-26).
 * Per-form-type rollup with top-3 filings per form by ai_relevance_score
 * and aggregate counts (capex / revenue / partnership / chip mentions).
 * Param-required: form is mandatory.
 */
const SEC_FILINGS_BY_FORM_PILOT: BazaarPilotConfig = {
  description:
    'Form-type rollup over the AI-flagged SEC filings cohort. Pass form=10-K (or 8-K, 10-Q, S-1, DEF 14A) to get per-form aggregate stats (total filings, ai_relevant_count, avg score, total capex/revenue/partnership/chip mentions) plus the top 3 AI-relevant filings for that form type. The "is the 10-K cohort heating up on AI capex disclosures" question in one call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { form: '10-K' },
        },
        output: {
          type: 'json',
          example: {
            batch_id: '20260526-0000Z',
            extracted_at: '2026-05-26T00:00:00Z',
            filter: { ticker: null, form: '10-K' },
            by_form: [
              {
                form: '10-K',
                total_filings: 14,
                ai_relevant_count: 12,
                avg_ai_relevance_score: 78.5,
                total_capex_mentions: 22,
                total_revenue_mentions: 14,
                total_partnership_mentions: 31,
                total_chip_mentions: 47,
                top_filings: [],
              },
            ],
            source_license: 'US Government public domain (17 USC 105)',
            source_attribution: 'SEC EDGAR (data.sec.gov) + Qwen 3.6 27B verbatim extraction + deterministic normalize',
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  form: { type: 'string', description: 'SEC form type (10-K, 10-Q, 8-K, S-1, DEF 14A, etc). Case-insensitive.' },
                  ticker: { type: 'string', description: 'Optional AI bellwether ticker filter.' },
                },
                required: ['form'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

const STATUS_TRIAGE_OPENAI_PILOT: BazaarPilotConfig = makeProviderTriagePilot('openai', 'OpenAI');
const STATUS_TRIAGE_ANTHROPIC_PILOT: BazaarPilotConfig = makeProviderTriagePilot('anthropic', 'Anthropic');
const STATUS_TRIAGE_GOOGLE_PILOT: BazaarPilotConfig = makeProviderTriagePilot('google', 'Google');
const STATUS_TRIAGE_AWS_PILOT: BazaarPilotConfig = makeProviderTriagePilot('aws', 'AWS');
const STATUS_TRIAGE_AZURE_PILOT: BazaarPilotConfig = makeProviderTriagePilot('azure', 'Azure');

/**
 * /api/premium/ai-cves/ai-stack-cves: Wave 13 flagship (2026-05-24).
 * AI-stack CVE intelligence over DP CC's Qwen-on-5090 security-xsource
 * extraction pipeline. Filters the latest batch to papers whose
 * affected_products match the curated AI_STACK_VENDORS list (inference,
 * agent frameworks, training, vector DB, model gateway, MCP tools).
 * Each paper carries a tf_ai_category tag. Sort: exploited_in_wild
 * first, then severity_rank desc, then source_url asc. 99.8% of source
 * data is CC BY 4.0 licensed (GitHub Security Advisories).
 */
const AI_CVES_AI_STACK_PILOT: BazaarPilotConfig = {
  description:
    'AI-stack CVE intelligence. Filters fresh security disclosures to vendors and products in the AI inference, agent framework, training, vector DB, model gateway, and MCP tool layers. Each paper carries a tf_ai_category tag and a severity_rank, sorted with exploited-in-wild and critical-severity first. 99.8% of underlying data is from GitHub Security Advisories (CC BY 4.0).',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: {},
        },
        output: {
          type: 'json',
          example: {
            batch_id: '20260524-195226',
            extracted_at: '2026-05-24T19:52:26Z',
            total: 42,
            papers: [
              {
                cve_ids: ['CVE-2026-44580'],
                affected_products: ['Next.js'],
                affected_version_ranges: [],
                fixed_versions: ['v15.5.16', 'v16.2.5'],
                exploited_in_wild: 'stated_yes',
                severity_label: 'high',
                source_url: 'https://github.com/advisories/GHSA-gx5p-jg67-6x7h',
                tf_ai_category: 'agent-framework',
                severity_rank: 3,
              },
            ],
            source_license: 'CC BY 4.0',
            source_attribution: 'GitHub Advisory Database (github.com/advisories) + vendor advisories',
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: { type: 'object', additionalProperties: false },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/ai-cves/exploited-in-wild: Wave 13 (2026-05-24).
 * Live-threat subset: papers with exploited_in_wild = stated_yes from
 * the latest AI-flagged batch. Sorted by severity_rank desc then
 * source_url asc. Same licensing as the flagship.
 */
const AI_CVES_EXPLOITED_PILOT: BazaarPilotConfig = {
  description:
    'Live-threat CVE feed. Returns only papers with exploited_in_wild = stated_yes from the latest AI-flagged batch, ranked by severity. The subset answers "what AI-stack CVEs are actively being weaponized right now."',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: {},
        },
        output: {
          type: 'json',
          example: {
            batch_id: '20260524-195226',
            extracted_at: '2026-05-24T19:52:26Z',
            total: 3,
            papers: [
              {
                cve_ids: ['CVE-2026-44580'],
                affected_products: ['Next.js'],
                affected_version_ranges: [],
                fixed_versions: ['v15.5.16', 'v16.2.5'],
                exploited_in_wild: 'stated_yes',
                severity_label: 'high',
                source_url: 'https://github.com/advisories/GHSA-gx5p-jg67-6x7h',
                severity_rank: 3,
              },
            ],
            source_license: 'CC BY 4.0',
            source_attribution: 'GitHub Advisory Database (github.com/advisories) + vendor advisories',
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: { type: 'object', additionalProperties: false },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/ai-cves/cve?id=CVE-2026-XXXXX: Wave 13 (2026-05-24).
 * Single-CVE lookup via the persistent index. Param-required, so
 * strict-premium gating is mandatory.
 */
// ── Wave 14 (2026-05-25): path-param endpoints with routeTemplate ──
// These ship as Bazaar pilots together with template-matching lookup so
// Coinbase's dynamic-routes consolidation surfaces them as ONE catalog
// row per pattern instead of N rows per concrete id. The lookup helpers
// (getBazaarPilotConfig, isBazaarPilotPath) accept either the concrete
// path or the template; the BAZAAR_PILOTS map key IS the template.

const PROVIDERS_PATH_PILOT: BazaarPilotConfig = {
  description:
    'Per-provider digest. Pass the provider slug (anthropic, openai, google, etc.) as the URL path segment. Returns the model catalog scoped to that provider plus current pricing matrix, status incidents, and reliability summary. The single-call lookup an agent makes when it needs everything about a specific provider.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          pathParams: { name: 'anthropic' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            provider: 'anthropic',
            models: [{ id: 'claude-opus-4-7', input_price: 14, output_price: 70 }],
            status: { operational: true, incidents_24h: 0 },
            reliability_30d: { uptime_pct: 99.94, p95_latency_ms: 820 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              pathParams: {
                type: 'object',
                properties: { name: { type: 'string', description: 'Provider slug (anthropic, openai, google, mistral, cohere, etc.). Case-insensitive.' } },
                required: ['name'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
      routeTemplate: '/api/premium/providers/:name',
    },
  },
};

const CLEAN_CVE_PILOT: BazaarPilotConfig = {
  description:
    'LLM-ready CVE record. Around 80 percent token reduction versus raw MITRE v5.2, with derived severity_band, deduped CWEs, flat affected_products list, and the top 5 references. Pass the CVE id as the URL path segment.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          pathParams: { id: 'CVE-2024-3094' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            source_format: 'mitre_cve_v5_2',
            target_format: 'tensorfeed_llm_ready_v1',
            cve_id: 'CVE-2024-3094',
            severity_band: 'critical',
            cwes: ['CWE-506'],
            affected_products: ['xz-utils'],
            references_top_5: ['https://nvd.nist.gov/vuln/detail/CVE-2024-3094'],
            attribution: { source: 'MITRE CVE List v5.2', license: 'Terms of Use' },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              pathParams: {
                type: 'object',
                properties: { id: { type: 'string', description: 'CVE id in canonical CVE-YYYY-NNNNN form. Case-insensitive.' } },
                required: ['id'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
      routeTemplate: '/api/premium/clean/cve/:id',
    },
  },
};

const CLEAN_KEV_PILOT: BazaarPilotConfig = {
  description:
    'LLM-ready CISA KEV entry with normalized ransomware_use enum (known, unknown, not_used) and notes_urls extracted from the freeform notes field. Pass the CVE id as the URL path segment. Returns 404 with a hint if the CVE id is valid but not on the KEV catalog.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          pathParams: { id: 'CVE-2024-3094' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            source_format: 'cisa_kev_v1',
            target_format: 'tensorfeed_llm_ready_v1',
            cve_id: 'CVE-2024-3094',
            vendor: 'xz',
            product: 'xz-utils',
            ransomware_use: 'unknown',
            date_added: '2024-04-01',
            notes_urls: ['https://www.cisa.gov/news-events/alerts/2024/03/29/'],
            attribution: { source: 'CISA Known Exploited Vulnerabilities Catalog', license: 'US Government public domain' },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              pathParams: {
                type: 'object',
                properties: { id: { type: 'string', description: 'CVE id in canonical CVE-YYYY-NNNNN form.' } },
                required: ['id'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
      routeTemplate: '/api/premium/clean/kev/:id',
    },
  },
};

const CLEAN_EPSS_PILOT: BazaarPilotConfig = {
  description:
    'LLM-ready FIRST.org EPSS score with derived risk_band (none, low, moderate, elevated, high, critical). Pass the CVE id as the URL path segment. Optional series=true returns first/min/max summary instead of the full daily-score series.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          pathParams: { id: 'CVE-2024-3094' },
          queryParams: { series: false },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            source_format: 'first_org_epss_v1',
            target_format: 'tensorfeed_llm_ready_v1',
            included_series: false,
            cve_id: 'CVE-2024-3094',
            epss: 0.9415,
            percentile: 0.9981,
            risk_band: 'critical',
            attribution: { source: 'FIRST.org EPSS v3', license: 'FIRST.org Terms of Use' },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              pathParams: {
                type: 'object',
                properties: { id: { type: 'string', description: 'CVE id in canonical CVE-YYYY-NNNNN form.' } },
                required: ['id'],
              },
              queryParams: {
                type: 'object',
                properties: { series: { type: 'boolean', description: 'true returns first/min/max summary; false (default) returns current score.' } },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
      routeTemplate: '/api/premium/clean/epss/:id',
    },
  },
};

const CLEAN_OPENROUTER_PILOT: BazaarPilotConfig = {
  description:
    'One model from the daily 367-entry OpenRouter catalog as an LLM-ready fact card. Pricing normalized to USD per million tokens with a derived blended_5_to_1 mix. Capability flags (tools, vision, structured_outputs, reasoning) extracted from supported_parameters plus modality. Pass the model id (URL-encoded if it contains a slash) as the URL path segment.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          pathParams: { model_id: 'anthropic/claude-haiku-4.5' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            source_format: 'openrouter_models_v1',
            target_format: 'tensorfeed_llm_ready_v1',
            model_id: 'anthropic/claude-haiku-4.5',
            provider: 'anthropic',
            input_usd_per_million: 1.0,
            output_usd_per_million: 5.0,
            blended_5_to_1: 1.67,
            context_length: 200000,
            capabilities: { tools: true, vision: true, structured_outputs: true, reasoning: false },
            modality: ['text', 'image'],
            attribution: { source: 'OpenRouter model catalog', license: 'OpenRouter Terms of Service' },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              pathParams: {
                type: 'object',
                properties: { model_id: { type: 'string', description: 'OpenRouter model id, URL-encoded. Format: provider/model-slug.' } },
                required: ['model_id'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
      routeTemplate: '/api/premium/clean/openrouter/:model_id',
    },
  },
};

const SECURITY_VERIFIED_PILOT: BazaarPilotConfig = {
  description:
    'Cross-database CVE verification. Composes MITRE CVE plus CISA KEV plus FIRST.org EPSS plus OSV.dev plus CISA Vulnrichment into one fact card with a confirmed_by array and corroboration_count. The single-call anti-hallucination lookup for security agents. Pass the CVE id as the URL path segment.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          pathParams: { id: 'CVE-2024-3094' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            cve_id: 'CVE-2024-3094',
            corroboration_count: 5,
            confirmed_by: ['mitre_cve', 'cisa_kev', 'first_org_epss', 'osv_dev', 'cisa_vulnrichment'],
            severity_consensus: 'critical',
            exploited_in_wild: true,
            attribution: { sources: ['MITRE CVE', 'CISA KEV', 'FIRST.org EPSS', 'OSV.dev', 'CISA Vulnrichment'] },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              pathParams: {
                type: 'object',
                properties: { id: { type: 'string', description: 'CVE id in canonical CVE-YYYY-NNNNN form.' } },
                required: ['id'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
      routeTemplate: '/api/premium/security/verified/:id',
    },
  },
};

/**
 * /api/premium/ai-cves/batch?ids=CVE-A,CVE-B,...: Wave 15 (2026-05-26).
 * Multi-CVE lookup. Pass up to 10 CVE ids as a comma-separated list, get
 * one paper per id (or found:false for misses) in a single round trip.
 * Translated from AgentMail messages/batch-get. Same 1-credit cost as a
 * single lookup so the value is the saved round trips. Param-required,
 * strict-premium gated.
 */
const AI_CVES_BATCH_PILOT: BazaarPilotConfig = {
  description:
    'Multi-CVE lookup over the TensorFeed AI-CVE index. Pass ids=CVE-A,CVE-B,... (comma-separated, up to 10) and get one paper per id in a single call. Saves up to 10 round trips at the same 1-credit cost as a single lookup. Index spans the rolling 90-day retention window of TF ai-cves batches.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { ids: 'CVE-2026-44580,CVE-2026-12345' },
        },
        output: {
          type: 'json',
          example: {
            total_requested: 2,
            total_found: 1,
            results: [
              {
                cve_id: 'CVE-2026-44580',
                found: true,
                batch_id: '20260524-195226',
                paper: {
                  cve_ids: ['CVE-2026-44580'],
                  affected_products: ['Next.js'],
                  affected_version_ranges: [],
                  fixed_versions: ['v15.5.16', 'v16.2.5'],
                  exploited_in_wild: 'unstated',
                  severity_label: 'high',
                  source_url: 'https://github.com/advisories/GHSA-gx5p-jg67-6x7h',
                },
              },
              {
                cve_id: 'CVE-2026-12345',
                found: false,
                batch_id: null,
                paper: null,
              },
            ],
            source_license: 'CC BY 4.0',
            source_attribution: 'GitHub Advisory Database (github.com/advisories) + vendor advisories',
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  ids: {
                    type: 'string',
                    description: 'Comma-separated CVE ids in canonical CVE-YYYY-NNNNN form. Case-insensitive. Up to 10 per call.',
                  },
                },
                required: ['ids'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

const AI_CVES_CVE_LOOKUP_PILOT: BazaarPilotConfig = {
  description:
    'Single CVE lookup against the TensorFeed AI-CVE index. Pass id=CVE-YYYY-XXXXX, get the structured paper (affected products, version ranges, fixed versions, severity, exploitation status, source URL). Index spans the rolling 90-day retention window of TF ai-cves batches.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { id: 'CVE-2026-44580' },
        },
        output: {
          type: 'json',
          example: {
            cve_id: 'CVE-2026-44580',
            found: true,
            batch_id: '20260524-195226',
            paper: {
              cve_ids: ['CVE-2026-44580'],
              affected_products: ['Next.js'],
              affected_version_ranges: [],
              fixed_versions: ['v15.5.16', 'v16.2.5'],
              exploited_in_wild: 'unstated',
              severity_label: 'high',
              source_url: 'https://github.com/advisories/GHSA-gx5p-jg67-6x7h',
            },
            source_license: 'CC BY 4.0',
            source_attribution: 'GitHub Advisory Database (github.com/advisories) + vendor advisories',
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'CVE id in canonical CVE-YYYY-NNNNN form. Case-insensitive.' },
                },
                required: ['id'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/ai-companies/:ticker: Wave 19 (2026-05-27).
 *
 * Per-ticker AI-company intelligence envelope for the 14 AI bellwethers
 * (NVDA, AMD, AVGO, TSM, ARM, MSFT, GOOGL, AMZN, ORCL, PLTR, SMCI, AAPL,
 * META, TSLA). Aggregates four free siblings into one paid call: latest
 * 10 SEC filings (public domain), latest 10 news mentions filtered by
 * curated aliases, funding rounds where the company is a lead or notable
 * investor in TF's registry, plus cohort metadata. Shipped the same day
 * Robinhood Agentic Trading + Agentic Credit Card launched, so a paid
 * agent doing pre-trade context on one ticker can issue one envelope
 * call instead of three free calls plus its own alias filter.
 */
const AI_COMPANIES_AGGREGATE_PILOT: BazaarPilotConfig = {
  description:
    'Per-ticker AI intelligence envelope. Pass an AI bellwether ticker (NVDA, AMD, AVGO, TSM, ARM, MSFT, GOOGL, AMZN, ORCL, PLTR, SMCI, AAPL, META, TSLA) as the URL path segment. Returns latest 10 SEC filings, latest 10 news mentions filtered by curated aliases, strategic and equity rounds where the company is a lead or notable investor, plus cohort metadata. One call replaces four free siblings (sec/filings, news, funding, cohort registry) plus the agent-side alias filter. Single captured-at timestamp, one freshness SLA across all four buckets.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          pathParams: { ticker: 'NVDA' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-27T18:00:00Z',
            ticker: 'NVDA',
            cohort_size: 14,
            company: {
              ticker: 'NVDA',
              cik: '0001045810',
              display_name: 'NVIDIA',
              category: 'silicon',
              ai_angle: 'The dominant supplier of AI training and inference GPUs.',
              exchange: 'NASDAQ',
            },
            filings: {
              count: 10,
              items: [
                {
                  accession_number: '0001045810-26-000052',
                  form: '10-Q',
                  filing_date: '2026-05-20',
                  primary_doc_url: 'https://www.sec.gov/Archives/edgar/data/1045810/...',
                },
              ],
              source: 'data.sec.gov/submissions',
              license: 'Public domain (17 USC 105). SEC EDGAR.',
            },
            news: {
              count: 4,
              items: [
                {
                  id: 'abc123',
                  title: 'NVIDIA announces Rubin successor at GTC',
                  url: 'https://example.com/nvda-rubin',
                  source: 'TechCrunch AI',
                  publishedAt: '2026-05-27T14:00:00Z',
                  matched_aliases: ['NVIDIA'],
                },
              ],
              aliases_used: ['NVIDIA', 'Nvidia'],
              sanitization: 'enabled',
            },
            funding_as_investor: {
              count: 0,
              items: [],
              description:
                'Strategic and equity rounds where this company is listed as a lead or notable investor in TensorFeed funding registry.',
            },
            attribution: {
              sources: [
                'SEC EDGAR (data.sec.gov/submissions). Public domain (17 USC 105).',
                'TensorFeed.ai news aggregator (sanitized for agents).',
                'TensorFeed.ai funding registry (editorial).',
              ],
              notes:
                'Envelope captured at one moment in time; filings refresh every 6 hours, news every 10 minutes. Freshness SLA: 9h.',
            },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              pathParams: {
                type: 'object',
                properties: {
                  ticker: {
                    type: 'string',
                    description:
                      'AI bellwether ticker (NVDA, AMD, AVGO, TSM, ARM, MSFT, GOOGL, AMZN, ORCL, PLTR, SMCI, AAPL, META, TSLA). Case-insensitive.',
                  },
                },
                required: ['ticker'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
      routeTemplate: '/api/premium/ai-companies/:ticker',
    },
  },
};

/**
 * Path-to-config map. Add new entries here (and only here) when expanding
 * the pilot. Per the migration plan, only add waves after the previous
 * wave's endpoints are cataloged and reading clean in CDP /discovery.
 *
 * Wave 2 (2026-05-24): 11 flat-schema GETs promoted from premium-only to
 * Bazaar-cataloged. Selection criteria: stable response shape, no required
 * query params (or sensible defaults), clearly premium-shaped (derived
 * metrics, curated cohorts, or aggregations the agent would otherwise have
 * to compute itself). Total pilot count: 4 -> 15.
 *
 * Wave 3 (2026-05-24): model-deprecations timeline. Pure-compute derivation
 * over the hand-curated registry. Total pilot count: 15 -> 16.
 *
 * Wave 4 (2026-05-24): inference-providers arbitrage. Pure-compute derivation
 * over the hand-curated inference matrix. Total pilot count: 16 -> 17.
 *
 * Wave 5 (2026-05-24): ai-safety/incidents/exposure. Derived rollups over
 * the daily-refreshed AVID snapshot. Total pilot count: 17 -> 18.
 *
 * Wave 6 (2026-05-24): ai-safety/packages/security/radar. Risk scoring over
 * the daily OSV snapshot of curated AI packages. Total pilot count: 18 -> 19.
 *
 * Wave 7 (2026-05-24): packages/releases/velocity. Release velocity + bump
 * classification over the 6-hourly PyPI + npm snapshot. Total pilot
 * count: 19 -> 20.
 *
 * Wave 8 (2026-05-24): ai-velocity. First AFTA federation cross-call. TF
 * pulls TerminalFeed's HF + GitHub trending leaderboards, derives
 * AI-cohort traction + cross-pollination. Total pilot count: 20 -> 21.
 *
 * Wave 9 (2026-05-24): ai-crypto-pulse. Second federation cross-call.
 * TF joins TerminalFeed's crypto-movers + funding-rates for the
 * AI-thesis token cohort with squeeze/chase classification. Total
 * pilot count: 21 -> 22.
 *
 * Wave 10 (2026-05-24): coding-harnesses/weekly-deltas. Third federation
 * cross-call. Daily-snapshotted TerminalFeed harness leaderboard with
 * delta computation against a prior snapshot. Total pilot count: 22 -> 23.
 *
 * Wave 11 (2026-05-24): news/action-cards. First Haiku-derived premium
 * endpoint. Per-article structured agent action cards. Total pilot
 * count: 23 -> 24.
 *
 * Wave 12 (2026-05-24): status/incidents/triage. Second Haiku-derived
 * endpoint. Per-incident triage cards with impact + action classification.
 * Total pilot count: 24 -> 25.
 *
 * Wave 13 (2026-05-24): ai-cves trio. First endpoints built on DP CC's
 * Qwen-on-5090 security-xsource extraction pipeline. ai-stack-cves is
 * the flagship (curated AI vendor filter + categorization);
 * exploited-in-wild is the live-threat subset; cve is the
 * param-required single-CVE lookup. Total pilot count: 25 -> 28.
 *
 * Wave 14 (2026-05-25): path-param endpoints with routeTemplate. First
 * batch to use dynamic-route consolidation per the Coinbase CDP Bazaar
 * spec. The BAZAAR_PILOTS map keys these by their template string (e.g.
 * "/api/premium/clean/cve/:id") and the lookup helpers match concrete
 * paths against the template at request time. Endpoints: providers/:name
 * + the 5 single-CVE-id and 1 model-id LLM-ready surfaces. Total pilot
 * count: 28 -> 34.
 *
 * Wave 19 (2026-05-27): per-ticker AI-company intelligence envelope
 * (/api/premium/ai-companies/:ticker). Shipped the same day Robinhood
 * Agentic Trading + Agentic Credit Card launched. Composes SEC filings,
 * news, funding, and cohort metadata into one paid call per ticker for
 * the 14 AI bellwethers. Wave numbering jumps past Waves 15 to 18
 * (already in the map) to keep the Robinhood-event launch grouped.
 *
 * Wave 20 (2026-05-28): route-verdict. Signed model-routing decision
 * fusing pricing, contamination-discounted benchmarks, real usage,
 * measured latency probes, live incident-triage operational state, and
 * deprecation flags into one verdict with an AFTA-signed receipt. The
 * decision layer above the free /api/preview/route-verdict taste. Total
 * pilot count: 44 -> 45.
 */
const ROUTE_VERDICT_PILOT: BazaarPilotConfig = {
  description:
    'Signed model routing decision. One paid call returns the best model for a task (code, reasoning, creative, general) or a named model, fusing pricing, benchmark capability discounted for contamination, real production usage, measured p95 latency from active probes, live incident-triage operational state, and deprecation flags into a single verdict with runners-up and an AFTA-signed receipt over the inputs. Optional filters: max_latency_p95_ms, require_operational, exclude_deprecated. The "which model right now" call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { task: 'code' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            query: { task: 'code', model: null },
            capturedAt: '2026-05-28T11:55:00Z',
            verdict: {
              rank: 1,
              model: { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic', openSource: false, contextWindow: 200000 },
              pricing: { input: 3, output: 15, blended: 9, currency: 'USD', unit: 'per 1M tokens' },
              quality: { task_score: 0.87, trust_discounted: 0.83, contamination_note: 'HumanEval (high contamination, saturated)' },
              usage: { corroborated: true, rank: 1, share_pct: 18.4, trend: 'flat' },
              latency: { measured_p95_ms: 1820, source: 'measured_probe' },
              operational: { ok: true, status: 'operational', source: 'live_status' },
              deprecation: { flagged: false, status: null, sunset_date: null },
              composite_score: 0.78,
              why: 'code quality 0.83 after trust discount; corroborated by real usage (rank 1, 18.4% share, flat); measured p95 1820 ms; operational; blended $9 / 1M',
            },
            runners_up: [],
            trust: { usage_corroborated: true, benchmark_contamination: 'mixed', operational_layer: 'partial', latency_layer: 'partial' },
            filters_applied: { max_latency_p95_ms: null, require_operational: true, exclude_deprecated: true },
            candidates_considered: 8,
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  task: { type: 'string', enum: ['code', 'reasoning', 'creative', 'general'], description: 'Task profile to rank models for. Provide task or model.' },
                  model: { type: 'string', description: 'Canonical model id or display name to narrow the verdict to one model.' },
                  max_latency_p95_ms: { type: 'integer', minimum: 1, description: 'Drop candidates whose measured p95 latency exceeds this floor.' },
                  require_operational: { type: 'string', enum: ['true', 'false'], description: 'Default true. Drop candidates known to be down or in failover.' },
                  exclude_deprecated: { type: 'string', enum: ['true', 'false'], description: 'Default true. Drop models flagged deprecated or sunsetted.' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

// Verdict endpoint track (2026-05-29): provider-reliability-verdict. Signed
// dependability ranking over TensorFeed's own measured probes (availability
// plus tail consistency). Free taste at /api/preview/provider-reliability-verdict.
// Total pilot count: 49 -> 50.
const PROVIDER_RELIABILITY_VERDICT_PILOT: BazaarPilotConfig = {
  description:
    'Provider Reliability Verdict. One paid call ranks the frontier AI providers TensorFeed actively probes by measured operational reliability, fusing availability (ok rate) and tail consistency (p50 over p95) from its own latency probes into a single dependability ranking. Returns the most dependable and riskiest providers, the full per-provider ranking (availability, p50/p95/p99, spread ratio, score), and an AFTA-signed receipt. The thesis: an agent retry loop feels the tail, not the median. The "which provider can I depend on right now" call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-29T11:55:00Z',
            window_label: 'last_24h',
            verdict: { most_dependable: 'anthropic', riskiest: 'deepseek' },
            ranking: [
              {
                rank: 1,
                provider: 'anthropic',
                ok_pct: 0.99,
                total_p50_ms: 500,
                total_p95_ms: 900,
                total_p99_ms: 1400,
                spread_ratio: 1.8,
                reliability_score: 0.7728,
                measured: true,
                note: 'measured availability 99 percent, p50 500 ms, p95 900 ms, p95 over p50 spread 1.8x',
              },
            ],
            coverage: { providers_ranked: 3, fully_measured: 3, availability_only: 0 },
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: flatGetSchema(),
    },
  },
};

// Verdict endpoint track (2026-05-29): x402-settlement-verdict. Signed ruling
// over TensorFeed's own x402 settlement index (Base USDC market momentum,
// concentration by Herfindahl index, and the leading publisher). Free taste at
// /api/preview/x402-settlement-verdict. Total pilot count: 50 -> 51.
const X402_SETTLEMENT_VERDICT_PILOT: BazaarPilotConfig = {
  description:
    'x402 Settlement Verdict. One paid call rules on the state of the x402 USDC settlement market on Base, computed over TensorFeed\'s own on-chain settlement index. Returns the market momentum (expanding, steady, contracting, or nascent versus the prior window of equal length), the concentration by Herfindahl index (concentrated, moderate, or diversified), the leading publisher, the full per-publisher volume ranking, ecosystem totals with the window-over-window change, and an AFTA-signed receipt. Optional window (24h, 7d, 30d). The "is x402 settlement growing and who leads" call, over the Base settlements TensorFeed measures, not a market-wide claim.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-29T17:54:00Z',
            window_label: '7d',
            verdict: { momentum: 'expanding', concentration: 'concentrated', leading_publisher: 'pay.example.com' },
            ecosystem: {
              volume_usdc: '1234.500000',
              count: 42,
              unique_publishers: 3,
              volume_change_pct: 30,
              count_change_pct: 25,
              prior_window_empty: false,
              top_publisher_share_pct: 64.8,
              hhi: 4908,
            },
            ranking: [
              { rank: 1, domain: 'pay.example.com', volume_usdc: '800.000000', count: 25, share_pct: 64.8 },
            ],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: flatGetSchema(),
    },
  },
};

// Wave 21 (2026-05-28): stack-safety-verdict. GO/HOLD/BLOCK deploy gate
// over a package list, fusing the ingested AI-CVE batch with CISA KEV.
// Free taste at /api/preview/stack-safety-verdict. Total pilot count: 45 -> 46.
const STACK_SAFETY_PILOT: BazaarPilotConfig = {
  description:
    'Stack Safety Verdict. A GET deploy gate: pass packages=name@version,name@version (up to 10) from your AI stack and get GO / HOLD / BLOCK per package plus an overall gate, fusing TensorFeed\'s ingested AI-CVE batch (GHSA plus vendor advisories) with the CISA KEV catalog for exploitation status. Each verdict carries the matched CVE ids, affected ranges, fixed versions, and KEV status, plus an AFTA-signed receipt. Never-false-confirm: BLOCK only on exploited with no fix, HOLD when the version must be verified, PASS on no AI-stack match, UNKNOWN outside the cohort. The "is my AI stack safe to ship" call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { packages: 'langchain@0.3.27,vllm@0.6.0' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            gate: 'HOLD',
            extracted_at: '2026-05-27T09:00:00Z',
            counts: { block: 0, hold: 1, pass: 1, unknown: 0 },
            packages: [
              {
                package: 'vllm',
                version: '0.6.0',
                verdict: 'HOLD',
                in_cohort: true,
                exploited: false,
                fix_available: true,
                category: 'inference-stack',
                matched_cves: [
                  { cve_id: 'CVE-2026-1234', on_kev: false, exploited_in_wild: 'stated_no', severity_label: 'high', affected_version_ranges: ['< 0.6.1'], fixed_versions: ['0.6.1'], source_url: 'https://github.com/advisories/GHSA-xxxx' },
                ],
                reason: 'A known CVE applies to this package (not confirmed exploited). Verify your pinned version against the surfaced ranges and fixes.',
              },
              { package: 'langchain', version: '0.3.27', verdict: 'PASS', in_cohort: true, exploited: false, fix_available: false, category: 'agent-framework', matched_cves: [], reason: 'No AI-stack CVE matched this package name. Not a full vulnerability scan.' },
            ],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  packages: { type: 'string', description: 'Comma-separated name@version list (version optional), up to 10. Example: langchain@0.3.27,vllm@0.6.0' },
                },
                required: ['packages'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
    },
  },
};

// Wave 22 (2026-05-28): benchmark-trust-verdict. Is an AI benchmark a
// trustworthy capability signal, or saturated/contaminated/near-ceiling.
// Pure compute over the benchmark registry plus live model scores.
// Total pilot count: 46 -> 47.
const BENCHMARK_TRUST_PILOT: BazaarPilotConfig = {
  description:
    'Benchmark Trust Verdict. Is an AI benchmark a trustworthy capability signal right now, or is it saturated, contaminated, or near its ceiling so a high score is a floor and not a differentiator? Returns a trust band and a 0-100 trust score per benchmark, fusing the registry contamination and saturation flags with the live spread of the top model scores (frontier compression), plus a down-weight recommendation and an alternative benchmark to use instead. Optional ?benchmark= or ?category= filter. AFTA-signed. The "should I trust this SOTA claim" call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { category: 'code' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-28T08:00:00Z',
            filter: { benchmark: null, category: 'code' },
            count: 1,
            verdicts: [
              {
                id: 'humaneval',
                name: 'HumanEval',
                category: 'code',
                status: 'saturated',
                contamination_risk: 'high',
                frontier_score: '~97%',
                score_range: '0-100% pass@1',
                trust_band: 'contaminated',
                trust_score: 12,
                signals: { ceiling_proximity: 'at_ceiling', frontier_compression: 'unknown', top_score_spread: null, models_scored: 0 },
                recommendation: 'Down-weight scores on this benchmark (high training-contamination risk, marked saturated, frontier score is near the ceiling). A high score is closer to a capability floor than a differentiator. Prefer LiveCodeBench for current code signal.',
                leaderboard_url: 'https://paperswithcode.com/sota/code-generation-on-humaneval',
              },
            ],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  benchmark: { type: 'string', description: 'Optional registry id or name to narrow to one benchmark (e.g. swe-bench-verified).' },
                  category: { type: 'string', description: 'Optional category filter: knowledge, math, code, multimodal, agents, long-context, safety.' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
    },
  },
};

// Wave 23 (2026-05-28): failover-verdict. Provider A degraded, recommend the
// best operational failover target for a task. Reuses the route-verdict
// fusion with the degraded + failing providers excluded. Total pilot count: 47 -> 48.
const FAILOVER_PILOT: BazaarPilotConfig = {
  description:
    'Failover Verdict. Provider A is degraded, which operational provider do I fail over to for this task right now? Confirms A against the live incident-triage feed, then runs the capability-first route verdict with A and any provider flagged failover_now excluded, returning the recommended destination model plus the incident reason plus ranked alternatives plus an AFTA-signed receipt. Pass ?from=<provider> and optional ?task= or ?model=. The "A just broke, where do I send it" call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { from: 'anthropic', task: 'code' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            from: {
              provider: 'anthropic',
              in_incident: true,
              incident: { title: 'Anthropic API elevated errors', service: 'Anthropic API', impact_classification: 'critical', recommended_action: 'failover_now', started_at: '2026-05-28T11:00:00Z', triage_summary: 'Anthropic API returning elevated 5xx for Messages.' },
            },
            query: { task: 'code', model: null },
            capturedAt: '2026-05-28T11:55:00Z',
            excluded_providers: ['anthropic'],
            failover_to: {
              rank: 1,
              model: { id: 'gpt-5-5', name: 'GPT-5.5', provider: 'openai', openSource: false, contextWindow: 400000 },
              pricing: { input: 5, output: 15, blended: 10, currency: 'USD', unit: 'per 1M tokens' },
              quality: { task_score: 0.86, trust_discounted: 0.83, contamination_note: null },
              usage: { corroborated: true, rank: 2, share_pct: 14.6, trend: 'up' },
              latency: { measured_p95_ms: 1200, source: 'measured_probe' },
              operational: { ok: true, status: 'operational', source: 'live_status' },
              deprecation: { flagged: false, status: null, sunset_date: null },
              composite_score: 0.79,
              why: 'code quality 0.83 after trust discount; corroborated by real usage (rank 2, 14.6% share, up); measured p95 1200 ms; operational; blended $10 / 1M',
            },
            alternatives: [],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  from: { type: 'string', description: 'The degraded provider to fail over from (e.g. anthropic, openai, google).' },
                  task: { type: 'string', enum: ['code', 'reasoning', 'creative', 'general'], description: 'Optional task profile.' },
                  model: { type: 'string', description: 'Optional model to narrow the failover target.' },
                },
                required: ['from'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
    },
  },
};

// Wave 24 (2026-05-28): guidance-delta. Did this periodic SEC filing
// materially change guidance, segment outlook, or risk language versus the
// prior same-form filing, with the exact changed sentences quoted. Reads the
// DP CC Phi-4 extraction. Free taste at /api/preview/sec/filings/guidance-delta.
// Total pilot count: 48 -> 49.
const GUIDANCE_DELTA_PILOT: BazaarPilotConfig = {
  description:
    'Guidance Delta. Did this periodic SEC filing (10-K or 10-Q) materially change guidance, segment outlook, or risk language versus the prior same-form filing, with the exact changed sentences quoted? Pass ?ticker=NVDA&form=10-Q for the latest, or ?accession= for one filing. Returns a deterministic materiality_summary, the full verbatim changes (prior and current quotes, values, section), and an AFTA-signed receipt. The signed verified-decision a finance agent reads before acting on an earnings filing.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { ticker: 'NVDA', form: '10-Q' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            ticker: 'NVDA',
            company_name: 'NVIDIA CORP',
            cik: '0001045810',
            form: '10-Q',
            accession_number: '0001045810-26-000052',
            prior_accession_number: '0001045810-25-000230',
            filing_date: '2026-05-20',
            prior_filing_date: '2025-11-19',
            materiality_summary: {
              total_changes: 10,
              by_materiality: { material: 3, minor: 6, boilerplate: 1 },
              by_category: { revenue_guidance: 1, segment_outlook: 2, risk_factor: 4, other: 3 },
              by_change_type: { reworded: 8, initiated: 1, raised: 1 },
              by_direction: { neutral: 8, unclear: 1, up: 1 },
              headline:
                'FY26 revenue guidance raised; Investments in Fiscal Year 2027 initiated; 4 risk factor wordings revised',
            },
            changes: [
              {
                topic: 'Investments in Fiscal Year 2027',
                prior_text: '',
                current_text:
                  'In the first quarter of fiscal year 2027, we made the following investments: 18.6 billion dollars in private companies and infrastructure funds.',
                prior_value: null,
                current_value: '18.6 billion',
                section: "Management's Discussion and Analysis",
                category: 'other',
                change_type: 'initiated',
                direction: 'unclear',
                materiality: 'material',
              },
            ],
            freshness: {
              model: 'input_keyed',
              superseded: false,
              superseded_note: 'This delta reflects the latest same-form filing TensorFeed has processed.',
              latest_same_form_accession: '0001045810-26-000052',
              latest_same_form_filing_date: '2026-05-20',
            },
            capturedAt: '2026-05-28T00:00:00Z',
            extracted_by: 'phi-4-Q6_K.gguf@dp-cc',
            source_license: 'US Government public domain (17 USC 105)',
            source_attribution: 'SEC EDGAR (data.sec.gov) + Phi-4 verbatim extraction + deterministic normalize',
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  accession: { type: 'string', description: 'A specific current filing accession (NNNNNNNNNN-NN-NNNNNN). Use this OR ticker plus form.' },
                  ticker: { type: 'string', description: 'AI bellwether ticker (NVDA, AMD, AVGO, and the rest of the 14). With form, resolves the latest same-form delta.' },
                  form: { type: 'string', description: 'Periodic form type: 10-K or 10-Q. Required when ticker is used.' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * Wave 26 (2026-05-30): agent news-search + brief cluster. The x402
 * distribution week (batch settlement GA, Base MCP, the Tavily ten-cent news
 * agent) made agent-payable news search and short-window briefs the hottest
 * discovery categories. These four live named handlers were the highest-value
 * premium endpoints still absent from the CDP Bazaar catalog.
 */

/** /api/premium/news/decision-verified/search: full-text search over signed verified-decision news clusters. q is required. */
const DECISION_VERIFIED_SEARCH_PILOT: BazaarPilotConfig = {
  description:
    'Full-text search over TensorFeed signed verified-decision news clusters. One paid call returns matching story clusters ranked by corroboration, each with a verification tier (single through widely-reported), source count, source-diversity score, and the underlying articles. The agent-facing "how broadly is this story confirmed" search.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { q: 'openai restructuring', min_sources: 4 },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            mode: 'search',
            query: { q: 'openai restructuring', since: '2026-04-30', until: null, min_sources: 4, limit: 25 },
            scanned_dates: 30,
            total_clusters_scanned: 612,
            matched: 3,
            returned: 1,
            results: [
              {
                cluster_id: 'c-2026-05-12-0007',
                date: '2026-05-12',
                claim_proxy: 'OpenAI completes for-profit restructuring under nonprofit parent',
                hero_url: 'https://www.reuters.com/technology/openai-restructuring',
                verification: {
                  tier: 'broadly-verified',
                  source_count: 11,
                  article_count: 14,
                  source_diversity_score: 0.7857,
                  time_span_hours: 9.4,
                  first_seen_at: '2026-05-12T08:05:00Z',
                  last_seen_at: '2026-05-12T17:29:00Z',
                  corroboration_band: 'broad',
                },
                sources: [
                  { source: 'Reuters', article_count: 2, first_published: null },
                  { source: 'Bloomberg', article_count: 1, first_published: null },
                ],
                articles: [
                  {
                    id: 'art-9f21',
                    title: 'OpenAI completes for-profit restructuring under nonprofit parent',
                    url: 'https://www.reuters.com/technology/openai-restructuring',
                    source: 'Reuters',
                    publishedAt: '2026-05-12T08:05:00Z',
                  },
                ],
              },
            ],
            attribution: {
              source: 'TensorFeed.ai daily news clustering over 100+ public RSS sources.',
              derivation:
                'RSS articles are embedded with Workers AI then single-link clustered per UTC day. The verification scores (tier, source_diversity_score, time_span_hours) are TensorFeed-derived structural metrics over corroboration count and source diversity; they do not make truth claims. Treat the linked article URLs as authoritative.',
              license:
                'RSS-syndicated headlines used under news fair-use. Verification scores are TensorFeed-derived. Receipts are Ed25519-signed per the AFTA spec.',
            },
            billing: { credits_charged: 1, credits_remaining: 247 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  q: { type: 'string', minLength: 3, maxLength: 200, description: 'Search query, required. Matched against the cluster claim text.' },
                  since: { type: 'string', description: 'ISO date YYYY-MM-DD lower bound. Defaults to ~30 days back; lookback capped at 90 days.' },
                  until: { type: 'string', description: 'ISO date YYYY-MM-DD upper bound.' },
                  min_sources: { type: 'integer', minimum: 1, maximum: 50, description: 'Minimum distinct sources a cluster needs to be returned. Default 2.' },
                  limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Max clusters to return. Default 25.' },
                },
                required: ['q'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
    },
  },
};

/** /api/premium/news/decision-verified: signed corroboration lookup for one cluster. cluster_id + date required. */
const DECISION_VERIFIED_LOOKUP_PILOT: BazaarPilotConfig = {
  description:
    'Verified-decision lookup for one news cluster. Given a cluster_id and date, returns the signed corroboration record: verification tier (single through widely-reported), source count, source-diversity score, time span, and the underlying articles. The "how broadly confirmed is this exact story" call. Discover cluster_ids via /api/history/news/clusters?date=.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { cluster_id: 'c-2026-05-12-0007', date: '2026-05-12' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            mode: 'cluster_lookup',
            cluster_id: 'c-2026-05-12-0007',
            date: '2026-05-12',
            claim_proxy: 'OpenAI completes for-profit restructuring under nonprofit parent',
            hero_url: 'https://www.reuters.com/technology/openai-restructuring',
            verification: {
              tier: 'broadly-verified',
              source_count: 11,
              article_count: 14,
              source_diversity_score: 0.7857,
              time_span_hours: 9.4,
              first_seen_at: '2026-05-12T08:05:00Z',
              last_seen_at: '2026-05-12T17:29:00Z',
              corroboration_band: 'broad',
            },
            sources: [{ source: 'Reuters', article_count: 2, first_published: null }],
            articles: [
              {
                id: 'art-9f21',
                title: 'OpenAI completes for-profit restructuring under nonprofit parent',
                url: 'https://www.reuters.com/technology/openai-restructuring',
                source: 'Reuters',
                publishedAt: '2026-05-12T08:05:00Z',
              },
            ],
            attribution: {
              source: 'TensorFeed.ai daily news clustering over 100+ public RSS sources.',
              derivation:
                'RSS articles are embedded with Workers AI then single-link clustered per UTC day. The verification scores are TensorFeed-derived structural metrics over corroboration count and source diversity; they do not make truth claims. Treat the linked article URLs as authoritative.',
              license:
                'RSS-syndicated headlines used under news fair-use. Verification scores are TensorFeed-derived. Receipts are Ed25519-signed per the AFTA spec.',
            },
            billing: { credits_charged: 1, credits_remaining: 246 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  cluster_id: { type: 'string', minLength: 4, maxLength: 64, description: 'Cluster id, required. From /api/history/news/clusters?date=.' },
                  date: { type: 'string', description: 'ISO date YYYY-MM-DD of the cluster, required.' },
                },
                required: ['cluster_id', 'date'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
    },
  },
};

/** /api/premium/research/topic-search: faceted search over the Qwen-extracted arXiv AI index. No required params. */
const TOPIC_SEARCH_PILOT: BazaarPilotConfig = {
  description:
    'Faceted search over the TensorFeed Qwen-extracted arXiv AI research index. Filter recent papers by subfield_tag and methodology_bucket (a taxonomy arXiv categories cannot express), date window, and milestone flag. Each paper carries its subfield, methodology bucket, milestone flag, affiliations, and a one-sentence summary. The "find the recent AI papers in this exact niche" call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { subfield_tag: 'agents', methodology_bucket: 'reinforcement-learning', since: '2026-05-01', limit: 25 },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            capturedAt: '2026-05-29',
            query: { subfield_tag: 'agents', methodology_bucket: 'reinforcement-learning', since: '2026-05-01', until: null, milestone_only: false, limit: 25, offset: 0 },
            total_matches: 18,
            returned: 1,
            papers: [
              {
                arxiv_id: '2605.01234',
                date: '2026-05-21',
                title: 'Self-Improving Tool-Use Agents via Online Preference Distillation',
                subfield_tag: 'agents',
                methodology_bucket: 'reinforcement-learning',
                is_milestone_candidate: true,
                affiliations: ['DeepMind', 'UC Berkeley'],
                summary: 'Introduces an online preference-distillation loop that lets tool-use agents improve from their own rollouts without human labels.',
              },
            ],
            attribution: {
              source: 'arXiv preprint metadata plus TensorFeed Qwen-extracted analytical fields',
              source_url: 'https://arxiv.org',
              license:
                'arXiv title, abstract, authors, and categories are freely usable for research and derived works. Per-paper subfield_tag, methodology_bucket, milestone flag, and summary are TensorFeed derivations from the abstract.',
              derivation:
                'A local Qwen 3.6 27B reads each abstract and emits structured fields that are deterministically rolled up into KV snapshots. The corpus is fetched once via the public arXiv API and processed on TensorFeed infrastructure.',
            },
            billing: { credits_charged: 1, credits_remaining: 245 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  subfield_tag: { type: 'string', description: 'Filter to a subfield tag from the snapshot taxonomy (agents, reasoning, vision, etc). Invalid values return the valid list.' },
                  methodology_bucket: { type: 'string', description: 'Filter to a methodology bucket from the snapshot taxonomy (reinforcement-learning, supervised, etc).' },
                  since: { type: 'string', description: 'ISO date YYYY-MM-DD lower bound on paper date.' },
                  until: { type: 'string', description: 'ISO date YYYY-MM-DD upper bound on paper date.' },
                  milestone_only: { type: 'boolean', description: 'Return only milestone-candidate papers. Default false.' },
                  limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Max papers to return. Default 25.' },
                  offset: { type: 'integer', minimum: 0, description: 'Pagination offset. Default 0.' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
    },
  },
};

/** /api/premium/recent: sub-hourly what-just-happened brief over a minutes window. No required params. */
const RECENT_PILOT: BazaarPilotConfig = {
  description:
    'Sub-hourly "what just happened" brief. Like the morning brief but over a short rolling window (minutes, 5 to 1440): new service-status incidents, current operational counts, and the latest news headlines. The endpoint an agent polls between full daily briefs. Pricing diffs are daily-resolution, so they are omitted on sub-day windows.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { minutes: 60, news_limit: 10 },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            window: { from: '2026-05-30T13:00:00Z', to: '2026-05-30T14:00:00Z', days: 0, minutes: 60 },
            computed_at: '2026-05-30T14:00:03Z',
            summary: { total_pricing_changes: 0, new_models: 0, removed_models: 0, incidents: 1, news_articles: 3 },
            pricing: { changes: [], new_models: [], removed_models: [] },
            status: {
              incidents: [
                {
                  service: 'API',
                  provider: 'Anthropic',
                  severity: 'minor',
                  title: 'Elevated error rates on the messages endpoint',
                  started_at: '2026-05-30T13:24:00Z',
                  resolved_at: null,
                  duration_minutes: null,
                },
              ],
              currently_operational: 41,
              currently_degraded: 1,
              currently_down: 0,
              currently_unknown: 2,
            },
            news: [
              {
                title: 'Mistral ships a 3B on-device model under Apache 2.0',
                url: 'https://techcrunch.com/mistral-3b-ondevice',
                source: 'TechCrunch',
                source_domain: 'techcrunch.com',
                published_at: '2026-05-30T13:41:00Z',
                snippet: 'Mistral released a 3B-parameter on-device model under Apache 2.0, targeting laptop and phone inference.',
                categories: ['models', 'open-source'],
              },
            ],
            news_attribution: {
              policy: 'RSS-syndicated headlines and snippets capped at 200 characters with mandatory link and source name.',
              snippet_max_chars: 200,
              link_required: true,
              source_required: true,
            },
            data_freshness: { pricing: '2026-05-30T05:00:00Z', status: '2026-05-30T13:59:30Z', incidents_count: 1, news_total_corpus: 4131 },
            notes: ['Sub-daily window: pricing diff skipped (history snapshots are daily-resolution).'],
            billing: { credits_charged: 1, credits_remaining: 243 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  minutes: { type: 'integer', minimum: 5, maximum: 1440, description: 'Rolling window length in minutes back from now. Default 60, range 5 to 1440.' },
                  news_limit: { type: 'integer', minimum: 1, maximum: 25, description: 'Max news headlines to return. Default 10, max 25.' },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: { type: 'object', properties: { type: { type: 'string' }, example: { type: 'object' } }, required: ['type'] },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * Wave 27 (2026-05-30): time-series data feeds. The "data library for agents"
 * core. Daily historical series an agent pays once to pull a full window the
 * free 7-day siblings cannot reach. All flat GET; parametric series
 * (x402-index/publisher, economy/series) are deferred to a later batch.
 */

/**
 * /api/premium/history/pricing/series: strict-premium tier 2 historical
 * daily pricing time-series for one model. Full window (90-day max, 30-day
 * default) vs the 7-day-capped free sibling. Required ?model=; optional
 * ?from=&to=. The snapshot compounds daily and cannot be backfilled.
 */
const HISTORY_PRICING_SERIES_PILOT: BazaarPilotConfig = {
  description:
    'Daily input, output, and blended price history for one AI model across a full date window (90-day max). One paid call returns the per-day points plus a summary (first, latest, min, max, percent delta, changes detected). The pricing-trend feed the free 7-day sibling cannot reach.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { model: 'claude-opus-4-7', from: '2026-04-23', to: '2026-05-23' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            model: 'claude-opus-4-7',
            provider: 'anthropic',
            range: { from: '2026-04-23', to: '2026-05-23', days: 31 },
            resolution: 'daily',
            points: [
              { date: '2026-04-23', input: 15, output: 75, blended: 45 },
              { date: '2026-05-23', input: 14, output: 70, blended: 42 },
            ],
            attribution: { source: 'TensorFeed', license: 'derived' },
            summary: {
              first: { date: '2026-04-23', input: 15, output: 75, blended: 45 },
              latest: { date: '2026-05-23', input: 14, output: 70, blended: 42 },
              min_blended: 42,
              max_blended: 45,
              delta_pct_blended: -6.6667,
              changes_detected: 1,
              days_with_data: 31,
              days_missing: 0,
            },
            billing: { credits_charged: 2, credits_remaining: 48 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  model: {
                    type: 'string',
                    description: 'Model id or display name to series (e.g. "claude-opus-4-7"). Required.',
                  },
                  from: {
                    type: 'string',
                    description: 'Inclusive start date YYYY-MM-DD. Optional; defaults to 30 days before to.',
                  },
                  to: {
                    type: 'string',
                    description: 'Inclusive end date YYYY-MM-DD. Optional; defaults to today UTC. Window capped at 90 days.',
                  },
                },
                required: ['model'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/history/benchmarks/series: strict-premium tier 2 historical
 * daily benchmark-score time-series for one model on one benchmark key.
 * Full window (90-day max, 30-day default). Required ?model=&benchmark=;
 * optional ?from=&to=.
 */
const HISTORY_BENCHMARKS_SERIES_PILOT: BazaarPilotConfig = {
  description:
    'Daily benchmark-score history for one AI model on one benchmark (swe_bench, mmlu_pro, gpqa_diamond, math, human_eval) across a full date window (90-day max). Returns the per-day points plus a summary (first, latest, min, max, delta in percentage points). The capability-drift feed.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { model: 'claude-opus-4-7', benchmark: 'swe_bench', from: '2026-04-23', to: '2026-05-23' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            model: 'claude-opus-4-7',
            benchmark: 'swe_bench',
            range: { from: '2026-04-23', to: '2026-05-23', days: 31 },
            points: [
              { date: '2026-04-23', score: 0.72 },
              { date: '2026-05-23', score: 0.74 },
            ],
            attribution: { source: 'TensorFeed', license: 'derived' },
            summary: {
              first: { date: '2026-04-23', score: 0.72 },
              latest: { date: '2026-05-23', score: 0.74 },
              min_score: 0.72,
              max_score: 0.74,
              delta_pp: 0.02,
              days_with_data: 31,
              days_missing: 0,
            },
            billing: { credits_charged: 2, credits_remaining: 48 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  model: {
                    type: 'string',
                    description: 'Model id or display name to series (e.g. "claude-opus-4-7"). Required.',
                  },
                  benchmark: {
                    type: 'string',
                    description: 'Benchmark key (swe_bench, mmlu_pro, gpqa_diamond, math, human_eval). Case-insensitive. Required.',
                  },
                  from: {
                    type: 'string',
                    description: 'Inclusive start date YYYY-MM-DD. Optional; defaults to 30 days before to.',
                  },
                  to: {
                    type: 'string',
                    description: 'Inclusive end date YYYY-MM-DD. Optional; defaults to today UTC. Window capped at 90 days.',
                  },
                },
                required: ['model', 'benchmark'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/history/status/uptime: strict-premium tier 2 historical
 * uptime SLA report for one provider over a full date window (90-day max,
 * 30-day default). Required ?provider=; optional ?from=&to=. Denominator
 * excludes missing-capture days. Degraded days count as half-up.
 */
const HISTORY_STATUS_UPTIME_PILOT: BazaarPilotConfig = {
  description:
    'Historical uptime SLA report for one AI provider over a full date window (90-day max). Returns per-day operational, degraded, down, and unknown counts, a computed uptime percentage (degraded counts half), and the list of incident days. The "what was provider X SLA last quarter" call.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { provider: 'openai', from: '2026-04-23', to: '2026-05-23' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            provider: 'openai',
            range: { from: '2026-04-23', to: '2026-05-23', days: 31 },
            days_total: 31,
            days_with_data: 31,
            days_missing: 0,
            days_operational: 29,
            days_degraded: 1,
            days_down: 1,
            days_unknown: 0,
            uptime_pct: 95.1613,
            incident_days: [
              { date: '2026-05-12', status: 'degraded' },
              { date: '2026-05-18', status: 'down' },
            ],
            billing: { credits_charged: 2, credits_remaining: 48 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  provider: {
                    type: 'string',
                    description: 'Provider name or id (e.g. openai, anthropic, google). Case-insensitive substring match. Required.',
                  },
                  from: {
                    type: 'string',
                    description: 'Inclusive start date YYYY-MM-DD. Optional; defaults to 30 days before to.',
                  },
                  to: {
                    type: 'string',
                    description: 'Inclusive end date YYYY-MM-DD. Optional; defaults to today UTC. Window capped at 90 days.',
                  },
                },
                required: ['provider'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/probe/series: strict-premium tier 3 daily latency + uptime
 * series from TensorFeed's own provider probes (we record the measurements
 * ourselves, so the history is unique to TF). 90-day max, 30-day default.
 * Required ?provider= (anthropic, openai, google, mistral, cohere);
 * optional ?from=&to=.
 */
const PROBE_SERIES_PILOT: BazaarPilotConfig = {
  description:
    'Daily latency and uptime series from TensorFeed measured probes against one provider (anthropic, openai, google, mistral, cohere). Per-day ok percentage, uptime, TTFB and total-time p50/p95/p99, and incident hours, plus an overall summary. First-party measurement no other source has. 90-day window.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { provider: 'anthropic', from: '2026-04-23', to: '2026-05-23' },
        },
        output: {
          type: 'json',
          example: {
            provider: 'anthropic',
            from: '2026-04-23',
            to: '2026-05-23',
            days: 31,
            points: [
              {
                date: '2026-05-23',
                count: 720,
                ok_pct: 99.86,
                uptime_pct: 99.86,
                ttfb_p50: 210,
                ttfb_p95: 540,
                ttfb_p99: 880,
                total_p50: 640,
                total_p95: 1520,
                total_p99: 2410,
                incident_hours: 0,
                has_data: true,
              },
            ],
            summary: {
              overall_uptime_pct: 99.74,
              days_with_data: 31,
              days_with_incidents: 2,
            },
            notes: [],
            billing: { credits_charged: 3, credits_remaining: 47 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  provider: {
                    type: 'string',
                    enum: ['anthropic', 'openai', 'google', 'mistral', 'cohere'],
                    description: 'Provider key to series. Required.',
                  },
                  from: {
                    type: 'string',
                    description: 'Inclusive start date YYYY-MM-DD. Optional; defaults to 30 days before to.',
                  },
                  to: {
                    type: 'string',
                    description: 'Inclusive end date YYYY-MM-DD. Optional; defaults to today UTC. Window capped at 90 days.',
                  },
                },
                required: ['provider'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/status/leaderboard: strict-premium tier 3 cross-provider
 * uptime leaderboard. Heavy aggregation over high-resolution poll counters
 * (~720 samples/provider/day) across a full date window, with premium-only
 * incident_count + mttr_minutes per provider. No required params; optional
 * ?from=&to= (90-day max, 30-day default).
 */
const STATUS_LEADERBOARD_PILOT: BazaarPilotConfig = {
  description:
    'Cross-provider uptime leaderboard over a full date window. Ranks every monitored AI provider by uptime percentage from high-resolution poll counters, with polls, downtime minutes, incident_count, and MTTR per provider. The premium tier adds incidents and mean-time-to-resolve the free 7-day sibling omits.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { from: '2026-04-23', to: '2026-05-23' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            range: { from: '2026-04-23', to: '2026-05-23', days: 31 },
            generated_at: '2026-05-23T12:00:00Z',
            entry_count: 12,
            poll_interval_minutes: 2,
            entries: [
              {
                provider: 'anthropic',
                rank: 1,
                uptime_pct: 99.9821,
                polls: 22320,
                operational_polls: 22312,
                degraded_polls: 8,
                down_polls: 0,
                unknown_polls: 0,
                downtime_minutes: 16,
                hard_down_minutes: 0,
                incident_count: 1,
                mttr_minutes: 18.5,
              },
            ],
            billing: { credits_charged: 3, credits_remaining: 47 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  from: {
                    type: 'string',
                    description: 'Inclusive start date YYYY-MM-DD. Optional; defaults to 30 days before to.',
                  },
                  to: {
                    type: 'string',
                    description: 'Inclusive end date YYYY-MM-DD. Optional; defaults to today UTC. Window capped at 90 days.',
                  },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/attention/series: per-provider attention time series.
 * Daily attention_score, rank, news_24h, news_7d, trending_repos, and
 * agent_hits for one provider over a date range, plus a summary block.
 * Param-required (?provider=), from/to optional (default 30d, max 90d).
 */
const ATTENTION_SERIES_PILOT: BazaarPilotConfig = {
  description:
    'Per-provider attention time series. One paid call returns the daily attention_score, leaderboard rank, news_24h, news_7d, trending_repos, and agent_hits for one AI provider over a date range, plus a summary with first, last, delta, min, max, avg, and captured-day count. The "is this provider heating up or cooling off" feed.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { provider: 'anthropic', from: '2026-04-23', to: '2026-05-23' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            provider: 'anthropic',
            range: { from: '2026-04-23', to: '2026-05-23', days: 31 },
            summary: { first: 74.2, last: 81.6, delta: 7.4, min: 71.0, max: 83.1, avg: 78.4, captured_days: 29 },
            series: [
              {
                date: '2026-05-23',
                attention_score: 81.6,
                rank: 1,
                news_24h: 7,
                news_7d: 41,
                trending_repos: 12,
                agent_hits: 318,
              },
            ],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  provider: {
                    type: 'string',
                    description: 'Provider id (anthropic, openai, google, meta, mistral, cohere, deepseek, xai, perplexity, nvidia, huggingface, cursor). Required.',
                  },
                  from: {
                    type: 'string',
                    description: 'Start date YYYY-MM-DD. Optional; defaults to 30 days before to.',
                  },
                  to: {
                    type: 'string',
                    description: 'End date YYYY-MM-DD. Optional; defaults to today UTC. Range capped at 90 days.',
                  },
                },
                required: ['provider'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/openrouter/series: daily OpenRouter catalog drift.
 * Per-day catalog size, cheapest paid input/output USD-per-million floor,
 * free-tier count, namespace breadth, plus day-over-day model add/remove
 * churn and per-model price-change counts. OpenRouter serves only current
 * state, so this history is TensorFeed-captured. No required params.
 */
const OPENROUTER_SERIES_PILOT: BazaarPilotConfig = {
  description:
    'Daily OpenRouter cross-provider catalog drift. Per-day model count, cheapest paid input and output USD-per-million floor, free-tier count, and namespace breadth, plus day-over-day model add and remove churn and per-model price-change counts. OpenRouter serves only current state, so this multi-day record is TensorFeed-captured and cannot be backfilled. Default 30 days, max 90.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { from: '2026-04-23', to: '2026-05-23' },
        },
        output: {
          type: 'json',
          example: {
            from: '2026-04-23',
            to: '2026-05-23',
            days: 31,
            points: [
              {
                date: '2026-05-23',
                total_models: 318,
                cheapest_input_usd_per_m: 0.05,
                cheapest_output_usd_per_m: 0.08,
                free_tier_count: 24,
                namespace_count: 41,
                top_namespace: 'openai',
                added: 2,
                removed: 1,
                price_changes: 5,
                added_sample: ['anthropic/claude-opus-4.8'],
                removed_sample: ['mistral/old-codestral'],
                has_data: true,
              },
            ],
            delta_in_window: {
              start_total: 301,
              end_total: 318,
              net: 17,
              cheapest_input_start: 0.06,
              cheapest_input_end: 0.05,
              cheapest_output_start: 0.1,
              cheapest_output_end: 0.08,
            },
            attribution: {
              source: 'OpenRouter',
              source_url: 'https://openrouter.ai/api/v1/models',
              license: 'Public catalog data; pricing and capabilities owned by OpenRouter and the underlying inference providers.',
              note: 'OpenRouter serves only current state. This multi-day series is TensorFeed-captured and cannot be backfilled.',
            },
            notes: [],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  from: {
                    type: 'string',
                    description: 'Start date YYYY-MM-DD. Optional; defaults to 30 days before to.',
                  },
                  to: {
                    type: 'string',
                    description: 'End date YYYY-MM-DD. Optional; defaults to today UTC. Range capped at 90 days.',
                  },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/mcp/registry/series: daily MCP server registry drift.
 * Per-day total_servers, total_versions, active_count, plus day-over-day
 * added / removed / net churn over the official modelcontextprotocol.io
 * registry. Current-state registry, so this record is TensorFeed-captured.
 * No required params (from/to optional, default 30d, max 90d).
 */
const MCP_REGISTRY_SERIES_PILOT: BazaarPilotConfig = {
  description:
    'Daily MCP server registry drift. Per-day total_servers, total_versions, and active_count over the official modelcontextprotocol.io registry, plus day-over-day added, removed, and net churn and a window delta. The registry serves only current state, so this multi-day growth-and-churn record is TensorFeed-captured. Default 30 days, max 90.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { from: '2026-04-23', to: '2026-05-23' },
        },
        output: {
          type: 'json',
          example: {
            from: '2026-04-23',
            to: '2026-05-23',
            days: 31,
            points: [
              {
                date: '2026-05-23',
                total_servers: 21480,
                total_versions: 34102,
                active_count: 20911,
                added: 38,
                removed: 4,
                net: 34,
                has_data: true,
              },
            ],
            delta_in_window: { start_total: 20104, end_total: 21480, net: 1376 },
            attribution: {
              source: 'modelcontextprotocol/registry',
              source_url: 'https://registry.modelcontextprotocol.io/',
              license: 'Apache-2.0 / MIT',
              license_url: 'https://github.com/modelcontextprotocol/registry/blob/main/LICENSE',
            },
            notes: [],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  from: {
                    type: 'string',
                    description: 'Start date YYYY-MM-DD. Optional; defaults to 30 days before to.',
                  },
                  to: {
                    type: 'string',
                    description: 'End date YYYY-MM-DD. Optional; defaults to today UTC. Range capped at 90 days.',
                  },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/x402-registry/series: daily x402 publisher-registry drift.
 * Per-day reachable vs erroring publisher counts, federation count, network
 * breadth, paid + free endpoint totals, agent-fair-trade declarations, plus
 * day-over-day domains added / removed, status flips, and payment-wallet
 * changes (the security-relevant signal). No required params.
 */
const X402_REGISTRY_SERIES_PILOT: BazaarPilotConfig = {
  description:
    'Daily x402 publisher-registry drift. Per-day reachable vs erroring publisher counts, federation count, network breadth, paid and free endpoint totals, and agent-fair-trade declarations, plus day-over-day domains added and removed, crawl status flips, and payment-wallet changes (the security-relevant signal an agent paying a publisher wants to watch). A registry is current-state only, so this history is TensorFeed-captured. Default 30 days, max 90.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { from: '2026-04-23', to: '2026-05-23' },
        },
        output: {
          type: 'json',
          example: {
            from: '2026-04-23',
            to: '2026-05-23',
            days: 31,
            points: [
              {
                date: '2026-05-23',
                total: 42,
                ok_count: 39,
                error_count: 3,
                federation_count: 2,
                network_count: 2,
                networks: ['base', 'base-sepolia'],
                paid_endpoints_total: 318,
                free_endpoints_total: 511,
                agent_fair_trade_count: 6,
                added: 1,
                removed: 0,
                status_flips: 2,
                wallet_changes: 0,
                added_sample: ['newpublisher.xyz'],
                removed_sample: [],
                wallet_change_sample: [],
                has_data: true,
              },
            ],
            delta_in_window: { start_total: 38, end_total: 42, net: 4, start_ok: 35, end_ok: 39 },
            attribution: {
              source: 'TensorFeed x402 Registry',
              source_url: 'https://tensorfeed.ai/x402-registry',
              license: 'TF-aggregated registry of x402 publishers. Underlying manifests are owned by their publishers and served at /.well-known/x402. TF surfaces a normalized view; inclusion is not an endorsement and agents should still verify wallet addresses on-chain and against publisher.validation.publishedAt before sending funds.',
              source_url_per_entry: 'https://{domain}/.well-known/x402',
              refresh_cadence: 'daily',
            },
            notes: [],
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  from: {
                    type: 'string',
                    description: 'Start date YYYY-MM-DD. Optional; defaults to 30 days before to.',
                  },
                  to: {
                    type: 'string',
                    description: 'End date YYYY-MM-DD. Optional; defaults to today UTC. Range capped at 90 days.',
                  },
                },
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

/**
 * /api/premium/x402-index/series: time series of x402 USDC settlement
 * volume or count on Base mainnet over a date range. metric=volume|count,
 * granularity=day (hour is MVP-unavailable and returns a no-charge),
 * from/to in YYYY-MM-DD, optional domain (omit for ecosystem-wide).
 * AFTA-signed. All four of metric, granularity, from, to are required.
 */
const X402_INDEX_SERIES_PILOT: BazaarPilotConfig = {
  description:
    'Time series of x402 USDC settlement on Base mainnet. One paid call returns per-day settlement volume (USDC) or transaction count across a date range, ecosystem-wide or scoped to a single publisher domain. Built over public Base on-chain data; CC BY 4.0. Required params metric, granularity, from, and to; granularity day only in the MVP.',
  extension: {
    bazaar: {
      info: {
        input: {
          type: 'http',
          method: 'GET',
          queryParams: { metric: 'volume', granularity: 'day', from: '2026-05-28', to: '2026-05-30' },
        },
        output: {
          type: 'json',
          example: {
            ok: true,
            metric: 'volume',
            granularity: 'day',
            window: { from: '2026-05-28', to: '2026-05-30' },
            series: [
              { ts: '2026-05-28', value: '1240.500000' },
              { ts: '2026-05-29', value: '1875.250000' },
            ],
            captured_at: '2026-05-30T11:00:00Z',
            has_data: true,
            attribution: 'TensorFeed x402 settlement index over public Base mainnet on-chain data',
            license: 'CC BY 4.0',
            billing: { credits_charged: 1, credits_remaining: 49 },
          },
        },
      },
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          input: {
            type: 'object',
            properties: {
              type: { type: 'string', const: 'http' },
              method: { type: 'string', enum: ['GET'] },
              queryParams: {
                type: 'object',
                properties: {
                  metric: {
                    type: 'string',
                    enum: ['volume', 'count'],
                    description: 'volume returns per-period USDC settled; count returns per-period transaction count.',
                  },
                  granularity: {
                    type: 'string',
                    enum: ['day', 'hour'],
                    description: 'Bucket size. Only day is built in the MVP; hour returns a no-charge granularity_unavailable.',
                  },
                  from: {
                    type: 'string',
                    description: 'Start date YYYY-MM-DD. Required. Range is capped server-side to bound per-day KV fan-out.',
                  },
                  to: {
                    type: 'string',
                    description: 'End date YYYY-MM-DD. Required.',
                  },
                  domain: {
                    type: 'string',
                    description: 'Optional publisher domain to scope the series to one publisher. Omit for the ecosystem-wide series.',
                  },
                },
                required: ['metric', 'granularity', 'from', 'to'],
              },
            },
            required: ['type', 'method'],
            additionalProperties: false,
          },
          output: {
            type: 'object',
            properties: { type: { type: 'string' }, example: { type: 'object' } },
            required: ['type'],
          },
        },
        required: ['input'],
      },
    },
  },
};

const BAZAAR_PILOTS: Record<string, BazaarPilotConfig> = {
  '/api/premium/whats-new': WHATS_NEW_PILOT,
  '/api/premium/routing': ROUTING_PILOT,
  '/api/premium/compare/models': COMPARE_MODELS_PILOT,
  '/api/premium/cost/projection': COST_PROJECTION_PILOT,
  // Wave 2
  '/api/premium/agents/directory': AGENTS_DIRECTORY_PILOT,
  '/api/premium/funding/exposure': FUNDING_EXPOSURE_PILOT,
  '/api/premium/packages/pypi/momentum': PYPI_MOMENTUM_PILOT,
  '/api/premium/research/velocity': RESEARCH_VELOCITY_PILOT,
  '/api/premium/research/authors': RESEARCH_AUTHORS_PILOT,
  '/api/premium/research/citation-velocity': RESEARCH_CITATION_VELOCITY_PILOT,
  '/api/premium/research/milestones': RESEARCH_MILESTONES_PILOT,
  '/api/premium/research/emerging-keywords': RESEARCH_EMERGING_KEYWORDS_PILOT,
  '/api/premium/economy/recession-watch': RECESSION_WATCH_PILOT,
  '/api/premium/policy/timeline': POLICY_TIMELINE_PILOT,
  '/api/premium/apis-guru/ai-feed': APIS_GURU_AI_PILOT,
  // Wave 3
  '/api/premium/model-deprecations/timeline': MODEL_DEPRECATIONS_TIMELINE_PILOT,
  // Wave 4
  '/api/premium/inference-providers/arbitrage': INFERENCE_ARBITRAGE_PILOT,
  // Wave 5
  '/api/premium/ai-safety/incidents/exposure': AI_SAFETY_EXPOSURE_PILOT,
  // Wave 6
  '/api/premium/ai-safety/packages/security/radar': AI_PKG_SECURITY_RADAR_PILOT,
  // Wave 7
  '/api/premium/packages/releases/velocity': PKG_RELEASES_VELOCITY_PILOT,
  // Wave 8
  '/api/premium/ai-velocity': AI_VELOCITY_PILOT,
  // Wave 9
  '/api/premium/ai-crypto-pulse': AI_CRYPTO_PULSE_PILOT,
  // Wave 10
  '/api/premium/coding-harnesses/weekly-deltas': HARNESS_DELTAS_PILOT,
  // Wave 11
  '/api/premium/news/action-cards': NEWS_ACTION_CARDS_PILOT,
  // Wave 12
  '/api/premium/status/incidents/triage': INCIDENT_TRIAGE_PILOT,
  // Wave 13
  '/api/premium/ai-cves/ai-stack-cves': AI_CVES_AI_STACK_PILOT,
  '/api/premium/ai-cves/exploited-in-wild': AI_CVES_EXPLOITED_PILOT,
  '/api/premium/ai-cves/cve': AI_CVES_CVE_LOOKUP_PILOT,
  // Wave 15 (2026-05-26): ai-cves/batch. AgentMail messages/batch-get
  // pattern. Up to 10 CVE ids per call at the single-lookup 1-credit cost.
  '/api/premium/ai-cves/batch': AI_CVES_BATCH_PILOT,
  // Wave 16 (2026-05-26): per-provider incident triage. AgentMail scoped+flat
  // duplication pattern. Five distinct paths backed by the Wave 12 Haiku
  // triage snapshot, each pre-scoped by provider. Intentionally NOT a
  // routeTemplate so CDP catalogs five rows, one per provider, instead of
  // collapsing to one consolidated pattern.
  '/api/premium/status/openai/incidents/triage': STATUS_TRIAGE_OPENAI_PILOT,
  '/api/premium/status/anthropic/incidents/triage': STATUS_TRIAGE_ANTHROPIC_PILOT,
  '/api/premium/status/google/incidents/triage': STATUS_TRIAGE_GOOGLE_PILOT,
  '/api/premium/status/aws/incidents/triage': STATUS_TRIAGE_AWS_PILOT,
  '/api/premium/status/azure/incidents/triage': STATUS_TRIAGE_AZURE_PILOT,
  // Wave 17 (2026-05-26): SEC filings AI-extraction. First TF endpoint
  // built on DP CC Qwen-on-5090 extraction of long-form SEC filings (10-K,
  // 10-Q, 8-K, etc.) for 14 AI bellwether companies. Schema engine-fit
  // per the 2026-05-24 DataPal pushback ruling. ai-flagged is the
  // flagship cohort; by-form is the per-form rollup. ai-disclosures
  // single lookup is param-required strict-premium but not Bazaar-
  // cataloged (low catalog value for a one-record lookup).
  '/api/premium/sec/filings/ai-flagged': SEC_FILINGS_AI_FLAGGED_PILOT,
  '/api/premium/sec/filings/by-form': SEC_FILINGS_BY_FORM_PILOT,
  // Wave 18 (2026-05-26): pro-tier whats-new. First TF tier-ladder
  // endpoint. Layers Haiku 4.5 analyst synthesis with per-field cited
  // basis IDs on top of the existing base whats-new payload. Parallel.ai
  // pattern. 10 credits ($0.05) catalog row sits next to base at 1 credit.
  '/api/premium/whats-new/pro': WHATS_NEW_PRO_PILOT,
  // Wave 14: path-param templates. Lookup helpers below match concrete
  // request paths against these templates so the request still routes
  // through CDP for first-pay cataloging.
  '/api/premium/providers/:name': PROVIDERS_PATH_PILOT,
  '/api/premium/clean/cve/:id': CLEAN_CVE_PILOT,
  '/api/premium/clean/kev/:id': CLEAN_KEV_PILOT,
  '/api/premium/clean/epss/:id': CLEAN_EPSS_PILOT,
  '/api/premium/clean/openrouter/:model_id': CLEAN_OPENROUTER_PILOT,
  '/api/premium/security/verified/:id': SECURITY_VERIFIED_PILOT,
  // Wave 19 (2026-05-27): per-ticker AI-company envelope. Shipped the same
  // day Robinhood Agentic Trading launched, which gives third-party AI
  // agents a brokerage account and a budgeted credit card. The envelope
  // is the supply-side answer to that demand event: one paid call replaces
  // four free siblings plus an alias-filter, so a trading agent in a hot
  // path can issue one round trip per ticker.
  '/api/premium/ai-companies/:ticker': AI_COMPANIES_AGGREGATE_PILOT,
  // Wave 20 (2026-05-28): route-verdict. Signed model-routing decision.
  '/api/premium/route-verdict': ROUTE_VERDICT_PILOT,
  // Verdict endpoint track (2026-05-29): provider-reliability-verdict.
  '/api/premium/provider-reliability-verdict': PROVIDER_RELIABILITY_VERDICT_PILOT,
  // Verdict endpoint track (2026-05-29): x402-settlement-verdict.
  '/api/premium/x402-settlement-verdict': X402_SETTLEMENT_VERDICT_PILOT,
  // Wave 21 (2026-05-28): stack-safety-verdict. GO/HOLD/BLOCK deploy gate.
  '/api/premium/stack-safety-verdict': STACK_SAFETY_PILOT,
  // Wave 22 (2026-05-28): benchmark-trust-verdict. Benchmark trustworthiness.
  '/api/premium/benchmark-trust-verdict': BENCHMARK_TRUST_PILOT,
  // Wave 23 (2026-05-28): failover-verdict. Best operational failover target.
  '/api/premium/failover-verdict': FAILOVER_PILOT,
  // Wave 24 (2026-05-28): guidance-delta. Signed periodic-filing guidance diff.
  '/api/premium/sec/filings/guidance-delta': GUIDANCE_DELTA_PILOT,
  // Wave 26 (2026-05-30): agent news-search + brief cluster. Rode the x402
  // distribution week. The decision-verified pair was already strict-premium;
  // topic-search and recent were promoted to strict-premium in the same change
  // (Wave 26 block in strict-premium-endpoints.ts) so the anonymous CDP crawler
  // sees a clean 402 instead of a free-trial 200.
  '/api/premium/news/decision-verified/search': DECISION_VERIFIED_SEARCH_PILOT,
  '/api/premium/news/decision-verified': DECISION_VERIFIED_LOOKUP_PILOT,
  '/api/premium/research/topic-search': TOPIC_SEARCH_PILOT,
  '/api/premium/recent': RECENT_PILOT,
  // Wave 27 (2026-05-30): time-series data feeds (the data-library core).
  '/api/premium/history/pricing/series': HISTORY_PRICING_SERIES_PILOT,
  '/api/premium/history/benchmarks/series': HISTORY_BENCHMARKS_SERIES_PILOT,
  '/api/premium/history/status/uptime': HISTORY_STATUS_UPTIME_PILOT,
  '/api/premium/probe/series': PROBE_SERIES_PILOT,
  '/api/premium/status/leaderboard': STATUS_LEADERBOARD_PILOT,
  '/api/premium/attention/series': ATTENTION_SERIES_PILOT,
  '/api/premium/openrouter/series': OPENROUTER_SERIES_PILOT,
  '/api/premium/mcp/registry/series': MCP_REGISTRY_SERIES_PILOT,
  '/api/premium/x402-registry/series': X402_REGISTRY_SERIES_PILOT,
  '/api/premium/x402-index/series': X402_INDEX_SERIES_PILOT,
};

// Template-match helper. Splits both paths on '/' and matches segment-by-
// segment, treating any template segment that starts with ':' as a
// wildcard. Returns true only on segment-count match (so /a/b/c does
// not match /a/:x). Single-segment params only (FDA's multi-segment
// category routes are intentionally not added to the wave yet).
function matchesTemplate(path: string, template: string): boolean {
  const pathSegs = path.split('/');
  const tmplSegs = template.split('/');
  if (pathSegs.length !== tmplSegs.length) return false;
  for (let i = 0; i < tmplSegs.length; i++) {
    if (tmplSegs[i].startsWith(':')) continue;
    if (tmplSegs[i] !== pathSegs[i]) return false;
  }
  return true;
}

/**
 * True if this path's X-PAYMENT settlement should route through CDP.
 * Accepts either an exact pilot path (the Wave 0-13 flat URLs) or a
 * concrete path matching a Wave 14+ template (e.g.
 * "/api/premium/clean/cve/CVE-2024-3094" matches "/api/premium/clean/cve/:id").
 */
export function isBazaarPilotPath(path: string): boolean {
  return getBazaarPilotConfig(path) !== null;
}

/**
 * Maps a raw request path to the stable BAZAAR_PILOTS key it routes to,
 * or null when the path is not a pilot. A trailing query string is dropped
 * before matching, and a concrete Wave 14+ path param (e.g.
 * "/api/premium/clean/cve/CVE-2024-3094") folds back to its template key
 * (e.g. "/api/premium/clean/cve/:id").
 *
 * The usage meter aggregates per endpoint by this key so a flat pilot
 * reached with query params (the converter on 2026-05-30 carried
 * "?text=...&targetLanguage=...") and a parametric pilot reached with many
 * distinct param values both fold into one row instead of fanning out.
 * Pure function: no network, no env, fully unit-testable.
 */
export function pilotTemplatePath(rawPath: string): string | null {
  // Drop a query string (and any fragment) so "/path?x=1" matches "/path".
  const pathname = rawPath.split(/[?#]/)[0];
  if (Object.prototype.hasOwnProperty.call(BAZAAR_PILOTS, pathname)) {
    return pathname;
  }
  for (const key of Object.keys(BAZAAR_PILOTS)) {
    if (!key.includes(':')) continue;
    if (matchesTemplate(pathname, key)) return key;
  }
  return null;
}


/**
 * Returns the bazaar config for a pilot path, or null if not piloted.
 * Fast path: exact match on the Wave 0-13 flat URLs. Slow path: walk
 * the Wave 14+ templates and match by segment.
 */
export function getBazaarPilotConfig(path: string): BazaarPilotConfig | null {
  // hasOwnProperty guards against prototype-key lookups like __proto__,
  // constructor, toString (which would otherwise return Object.prototype's
  // entries and pass a naive truthy check).
  if (Object.prototype.hasOwnProperty.call(BAZAAR_PILOTS, path)) {
    return BAZAAR_PILOTS[path];
  }
  for (const key of Object.keys(BAZAAR_PILOTS)) {
    if (!key.includes(':')) continue;
    if (matchesTemplate(path, key)) return BAZAAR_PILOTS[key];
  }
  return null;
}

/**
 * Returns the `extensions` block for a 402 PaymentRequired response. Pilots
 * get `{ bazaar: {...} }`; non-pilots get `{}` (the existing default).
 */
export function bazaarExtensionsFor(path: string): Record<string, unknown> {
  const config = getBazaarPilotConfig(path);
  return config ? config.extension : {};
}

/**
 * Returns the description string for the 402 `resource.description` field.
 * Pilots get their endpoint-specific description; non-pilots get the
 * generic "TensorFeed premium API" fallback used today.
 */
export function bazaarDescriptionFor(path: string, fallback: string): string {
  const config = getBazaarPilotConfig(path);
  return config ? config.description : fallback;
}

/**
 * The ordered list of TF endpoint paths that route through CDP and are
 * therefore eligible to appear in the CDP Bazaar catalog. This is the
 * authoritative "what could ampersend or any Bazaar-aware marketplace
 * ingest from us" list.
 */
export function bazaarPilotPaths(): string[] {
  return Object.keys(BAZAAR_PILOTS);
}

/**
 * Given the `items` from a CDP /discovery/resources response, report which
 * of our pilot paths are actually cataloged. A pilot counts as cataloged
 * only when a resource's URL pathname exactly equals the pilot path, so
 * sibling paths (e.g. /compare/models vs /compare) never false-match.
 * Pure function: no network, no env, fully unit-testable.
 */
export function pilotCatalogStatus(
  resources: ReadonlyArray<{ resource: string }>,
): { path: string; cataloged: boolean }[] {
  const cataloged = new Set<string>();
  for (const item of resources) {
    let pathname = item.resource;
    try {
      pathname = new URL(item.resource).pathname;
    } catch {
      // Not an absolute URL; fall back to the raw string so a bare
      // "/api/premium/whats-new" resource still matches exactly.
    }
    cataloged.add(pathname);
  }
  return bazaarPilotPaths().map((path) => {
    // For templated paths, match by template (any cataloged concrete
    // path that matches the template counts the template as cataloged).
    if (path.includes(':')) {
      const hit = Array.from(cataloged).some((c) => matchesTemplate(c, path));
      return { path, cataloged: hit };
    }
    return { path, cataloged: cataloged.has(path) };
  });
}
