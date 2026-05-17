/**
 * TensorFeed tools for the Vercel AI SDK (`ai` package).
 *
 * Subpath entry point: `import { tensorfeedPremiumTools } from
 * 'tensorfeed/ai'`. The `ai` package is an optional peer dependency, so
 * the base `tensorfeed` install stays dependency-free; it is imported
 * lazily (via a non-literal specifier so the build does not require it)
 * and only when this module is used.
 *
 * Payment posture: these tools never move funds. Called without a
 * credit token they return actionable guidance instead of paying or
 * throwing. The invariant lives in ./premium-tools and is tested there.
 */

import { TensorFeed } from './index.js';
import {
  DESCRIPTIONS,
  FORMATTERS,
  INVOKERS,
  PREMIUM_TOOL_NAMES,
  safeCall,
} from './premium-tools.js';

type JsonSchema = Record<string, unknown>;

/** Minimal structural view of the bits of the `ai` package we use. */
interface AiModule {
  tool: (config: {
    description: string;
    parameters: unknown;
    execute: (args: Record<string, unknown>) => Promise<string>;
  }) => unknown;
  jsonSchema: (schema: unknown) => unknown;
}

// Minimal, permissive parameter schemas. Optional-by-default so the
// model is never blocked from calling; required fields are explicit.
const SCHEMAS: Record<string, JsonSchema> = {
  tensorfeed_whats_new: {
    type: 'object',
    properties: {
      days: { type: 'integer', minimum: 1, maximum: 7 },
      news_limit: { type: 'integer', minimum: 1, maximum: 25 },
    },
    additionalProperties: false,
  },
  tensorfeed_routing: {
    type: 'object',
    properties: {
      task: { type: 'string', enum: ['code', 'reasoning', 'creative', 'general'] },
      budget: { type: 'number' },
      top_n: { type: 'integer', minimum: 1, maximum: 10 },
    },
    additionalProperties: false,
  },
  tensorfeed_compare_models: {
    type: 'object',
    properties: {
      ids: { type: 'string', description: '2 to 5 model ids or names, comma-separated' },
    },
    required: ['ids'],
    additionalProperties: false,
  },
  tensorfeed_cost_projection: {
    type: 'object',
    properties: {
      models: { type: 'string', description: '1 to 10 model ids or names, comma-separated' },
      input_tokens_per_day: { type: 'number' },
      output_tokens_per_day: { type: 'number' },
      horizon: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'] },
    },
    required: ['models', 'input_tokens_per_day', 'output_tokens_per_day'],
    additionalProperties: false,
  },
  tensorfeed_news_search: {
    type: 'object',
    properties: {
      q: { type: 'string' },
      from_date: { type: 'string', description: 'YYYY-MM-DD UTC' },
      to_date: { type: 'string', description: 'YYYY-MM-DD UTC' },
      provider: { type: 'string' },
      category: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
    },
    additionalProperties: false,
  },
  tensorfeed_provider_deepdive: {
    type: 'object',
    properties: {
      provider: { type: 'string', description: 'Provider id or display name' },
    },
    required: ['provider'],
    additionalProperties: false,
  },
  tensorfeed_status_leaderboard: {
    type: 'object',
    properties: {
      from_date: { type: 'string', description: 'YYYY-MM-DD UTC' },
      to_date: { type: 'string', description: 'YYYY-MM-DD UTC' },
    },
    additionalProperties: false,
  },
};

async function loadAi(): Promise<AiModule> {
  // Non-literal specifier: keeps the optional dep out of the build
  // graph so `tsc` does not require `ai` to be installed.
  const spec: string = 'ai';
  try {
    const mod: AiModule = await import(spec);
    return mod;
  } catch {
    throw new Error(
      "The 'ai' package is required for tensorfeed/ai. Install it with: npm install ai",
    );
  }
}

export interface PremiumToolsOptions {
  /** Bearer token for premium calls. Omit to get guidance-only tools. */
  token?: string;
}

/**
 * The paid TensorFeed catalog as Vercel AI SDK tools (1 credit per
 * call). Returns a record keyed by tool name, ready to spread into the
 * `tools` option of `generateText` / `streamText`.
 *
 * Safe to attach without a token: each tool returns actionable guidance
 * instead of paying or throwing when no credits are available. None of
 * these tools move funds.
 *
 * Async because the optional `ai` dependency is imported lazily:
 *
 *   const tools = await tensorfeedPremiumTools({ token });
 *   await generateText({ model, tools, prompt });
 */
export async function tensorfeedPremiumTools(
  options?: PremiumToolsOptions,
): Promise<Record<string, unknown>> {
  const { tool, jsonSchema } = await loadAi();
  const client = new TensorFeed({
    token: options?.token,
    userAgent: 'TensorFeed-VercelAI/1.0',
  });

  const out: Record<string, unknown> = {};
  for (const name of PREMIUM_TOOL_NAMES) {
    out[name] = tool({
      description: DESCRIPTIONS[name],
      parameters: jsonSchema(SCHEMAS[name]),
      execute: (args: Record<string, unknown>) =>
        safeCall(() => INVOKERS[name](client, args ?? {}), FORMATTERS[name]),
    });
  }
  return out;
}
