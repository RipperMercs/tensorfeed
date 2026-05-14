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
 * Path-to-config map. Add new entries here (and only here) when expanding
 * the pilot. Per the migration plan, only add waves after the previous
 * wave's endpoints are cataloged and reading clean in CDP /discovery.
 */
const BAZAAR_PILOTS: Record<string, BazaarPilotConfig> = {
  '/api/premium/whats-new': WHATS_NEW_PILOT,
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
