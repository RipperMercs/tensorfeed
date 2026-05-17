/**
 * TensorFeed tools for LangChain.js (`@langchain/core`).
 *
 * Subpath entry point: `import { tensorfeedPremiumTools } from
 * 'tensorfeed/langchain'`. `@langchain/core` and `zod` are optional
 * peer dependencies (zod is already LangChain's own peer dep), so the
 * base `tensorfeed` install stays dependency-free; both are imported
 * lazily (via non-literal specifiers so the build does not require
 * them) and only when this module is used.
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

/** Minimal structural view of the zod surface we use (no any). */
interface ZodType {
  optional(): ZodType;
  min(n: number): ZodType;
  max(n: number): ZodType;
  int(): ZodType;
  describe(d: string): ZodType;
}
interface Zod {
  object(shape: Record<string, ZodType>): ZodType;
  string(): ZodType;
  number(): ZodType;
  enum(values: string[]): ZodType;
}
interface LangchainToolsModule {
  tool: (
    fn: (args: Record<string, unknown>) => Promise<string>,
    config: { name: string; description: string; schema: unknown },
  ) => unknown;
}
interface ZodModule {
  z?: Zod;
  default?: Zod;
}

async function loadDeps(): Promise<{ tool: LangchainToolsModule['tool']; z: Zod }> {
  const toolsSpec: string = '@langchain/core/tools';
  const zodSpec: string = 'zod';
  let toolMod: LangchainToolsModule;
  let zodMod: ZodModule;
  try {
    toolMod = await import(toolsSpec);
  } catch {
    throw new Error(
      '@langchain/core is required for tensorfeed/langchain. Install it ' +
        'with: npm install @langchain/core zod',
    );
  }
  try {
    zodMod = await import(zodSpec);
  } catch {
    throw new Error('zod is required for tensorfeed/langchain. Install it with: npm install zod');
  }
  const z = zodMod.z ?? zodMod.default;
  if (!z) throw new Error('zod module did not expose a usable `z` export.');
  return { tool: toolMod.tool, z };
}

function schemas(z: Zod): Record<string, ZodType> {
  return {
    tensorfeed_whats_new: z.object({
      days: z.number().int().min(1).max(7).optional(),
      news_limit: z.number().int().min(1).max(25).optional(),
    }),
    tensorfeed_routing: z.object({
      task: z.enum(['code', 'reasoning', 'creative', 'general']).optional(),
      budget: z.number().optional(),
      top_n: z.number().int().min(1).max(10).optional(),
    }),
    tensorfeed_compare_models: z.object({
      ids: z.string().describe('2 to 5 model ids or names, comma-separated'),
    }),
    tensorfeed_cost_projection: z.object({
      models: z.string().describe('1 to 10 model ids or names, comma-separated'),
      input_tokens_per_day: z.number(),
      output_tokens_per_day: z.number(),
      horizon: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    }),
    tensorfeed_news_search: z.object({
      q: z.string().optional(),
      from_date: z.string().describe('YYYY-MM-DD UTC').optional(),
      to_date: z.string().describe('YYYY-MM-DD UTC').optional(),
      provider: z.string().optional(),
      category: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
    tensorfeed_provider_deepdive: z.object({
      provider: z.string().describe('Provider id or display name'),
    }),
    tensorfeed_status_leaderboard: z.object({
      from_date: z.string().describe('YYYY-MM-DD UTC').optional(),
      to_date: z.string().describe('YYYY-MM-DD UTC').optional(),
    }),
  };
}

export interface PremiumToolsOptions {
  /** Bearer token for premium calls. Omit to get guidance-only tools. */
  token?: string;
}

/**
 * The paid TensorFeed catalog as LangChain.js structured tools (1
 * credit per call). Returns an array ready to pass to an agent or
 * `bindTools`.
 *
 * Safe to attach without a token: each tool returns actionable guidance
 * instead of paying or throwing when no credits are available. None of
 * these tools move funds.
 *
 * Async because the optional deps are imported lazily:
 *
 *   const tools = await tensorfeedPremiumTools({ token });
 *   const agent = createReactAgent({ llm, tools });
 */
export async function tensorfeedPremiumTools(
  options?: PremiumToolsOptions,
): Promise<unknown[]> {
  const { tool, z } = await loadDeps();
  const client = new TensorFeed({
    token: options?.token,
    userAgent: 'TensorFeed-LangChainJS/1.0',
  });
  const schemaByName = schemas(z);

  return PREMIUM_TOOL_NAMES.map((name) =>
    tool(
      (args: Record<string, unknown>) =>
        safeCall(() => INVOKERS[name](client, args ?? {}), FORMATTERS[name]),
      {
        name,
        description: DESCRIPTIONS[name],
        schema: schemaByName[name],
      },
    ),
  );
}
