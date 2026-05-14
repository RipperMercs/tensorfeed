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
 * Path-to-config map. Add new entries here (and only here) when expanding
 * the pilot. Per the migration plan, only add waves after the previous
 * wave's endpoints are cataloged and reading clean in CDP /discovery.
 */
const BAZAAR_PILOTS: Record<string, BazaarPilotConfig> = {
  '/api/premium/whats-new': WHATS_NEW_PILOT,
  '/api/premium/routing': ROUTING_PILOT,
  '/api/premium/compare/models': COMPARE_MODELS_PILOT,
  '/api/premium/cost/projection': COST_PROJECTION_PILOT,
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
