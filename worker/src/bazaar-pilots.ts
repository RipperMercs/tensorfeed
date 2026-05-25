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
