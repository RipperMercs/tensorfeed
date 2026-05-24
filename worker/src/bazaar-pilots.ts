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
 *   1. The 402 PaymentRequired response body — `resource.description` and
 *      `extensions.bazaar` are read by CDP when cataloging the endpoint.
 *   2. The CDP /settle request — clients echo the extension back in their
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
 * /api/premium/routing — top-N model recommendation joining live pricing,
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
 * /api/premium/compare/models — side-by-side comparison of 2-5 models with
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
 * /api/premium/cost/projection — project a token-usage workload across 1-10
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
 * /api/premium/agents/directory — enriched AI agents directory. Joins the
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
 * /api/premium/funding/exposure — derived metrics over the free AI funding
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
 * /api/premium/packages/pypi/momentum — per-package momentum + velocity
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
 * /api/premium/research/velocity — per-institution AI publication velocity
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
 * /api/premium/research/authors — top 100 AI authors by trailing-365d
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
 * /api/premium/research/citation-velocity — recent AI papers ranked by
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
 * /api/premium/research/milestones — Qwen-flagged milestone arXiv papers
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
 * /api/premium/research/emerging-keywords — top-50 keyphrases by recent vs
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
 * /api/premium/economy/recession-watch — composite recession-risk signal
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
 * /api/premium/policy/timeline — forward + backward calendar over the AI
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
 * /api/premium/apis-guru/ai-feed — AI-relevant APIs from the APIs.guru
 * directory of 2400+ OpenAPI specs, with per-entry first_seen_at + a
 * separate newly_added_last_7d cohort.
 */
const APIS_GURU_AI_PILOT: BazaarPilotConfig = {
  description:
    'AI-relevant APIs from the APIs.guru directory of 2400+ OpenAPI specs, filtered via curated keyword matching. Per-entry first_seen_at against TensorFeed snapshot history so an agent can answer "what new AI APIs appeared in the last 7 days" — a diff APIs.guru itself cannot provide. CC-BY-SA 4.0; source links preserved.',
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
 * /api/premium/model-deprecations/timeline — Wave 3 pilot (2026-05-24).
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
 * /api/premium/inference-providers/arbitrage — Wave 4 pilot (2026-05-24).
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
 */
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
};

/**
 * True if this path's X-PAYMENT settlement should route through CDP.
 */
export function isBazaarPilotPath(path: string): boolean {
  return Object.prototype.hasOwnProperty.call(BAZAAR_PILOTS, path);
}

/**
 * Returns the bazaar config for a pilot path, or null if not piloted.
 */
export function getBazaarPilotConfig(path: string): BazaarPilotConfig | null {
  return BAZAAR_PILOTS[path] ?? null;
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
  return bazaarPilotPaths().map((path) => ({
    path,
    cataloged: cataloged.has(path),
  }));
}
