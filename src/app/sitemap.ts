import { MetadataRoute } from 'next';
import { getAllModelSlugs } from '@/lib/model-directory';
import { getAllComparisonSlugs } from '@/lib/comparison-directory';
import { getAllProviderSlugs } from '@/lib/provider-directory';
import { getAllBenchmarkSlugs } from '@/lib/benchmark-directory';
import { getAllApiRefSlugs } from '@/lib/api-reference-directory';
import { getAllHarnessSlugs } from '@/lib/harness-directory';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://tensorfeed.ai';
  const now = new Date();

  // Individual model pages (generated from model directory)
  const modelPages: MetadataRoute.Sitemap = getAllModelSlugs().map(slug => ({
    url: `${baseUrl}/models/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Comparison pages (high-intent "vs" search queries)
  const comparisonPages: MetadataRoute.Sitemap = getAllComparisonSlugs().map(slug => ({
    url: `${baseUrl}/compare/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Per-benchmark leaderboard pages (high-intent "best AI model on X" queries)
  const benchmarkPages: MetadataRoute.Sitemap = getAllBenchmarkSlugs().map(slug => ({
    url: `${baseUrl}/benchmarks/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  // Per-endpoint API reference pages (branded "tensorfeed X api" queries)
  const apiRefPages: MetadataRoute.Sitemap = getAllApiRefSlugs().map(slug => ({
    url: `${baseUrl}/api-reference/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  // Provider hub pages
  const providerPages: MetadataRoute.Sitemap = getAllProviderSlugs().map(slug => ({
    url: `${baseUrl}/providers/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Per-harness detail pages (Claude Code, Cursor, Codex CLI, Aider, etc)
  const harnessPages: MetadataRoute.Sitemap = getAllHarnessSlugs().map(slug => ({
    url: `${baseUrl}/harnesses/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  return [
    // Core pages (update frequently)
    { url: baseUrl, lastModified: now, changeFrequency: 'always', priority: 1.0 },
    { url: `${baseUrl}/status`, lastModified: now, changeFrequency: 'always', priority: 0.9 },
    { url: `${baseUrl}/today`, lastModified: now, changeFrequency: 'always', priority: 0.9 },
    { url: `${baseUrl}/live`, lastModified: now, changeFrequency: 'always', priority: 0.9 },
    { url: `${baseUrl}/models`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...modelPages,
    ...comparisonPages,
    ...providerPages,
    ...benchmarkPages,
    ...harnessPages,
    ...apiRefPages,
    { url: `${baseUrl}/api-reference`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/catalogs`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${baseUrl}/agents`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/research`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/podcasts`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },

    // "Is X Down" status pages (high-traffic search queries)
    { url: `${baseUrl}/is-claude-down`, lastModified: now, changeFrequency: 'always', priority: 0.9 },
    { url: `${baseUrl}/is-chatgpt-down`, lastModified: now, changeFrequency: 'always', priority: 0.9 },
    { url: `${baseUrl}/is-gemini-down`, lastModified: now, changeFrequency: 'always', priority: 0.9 },
    { url: `${baseUrl}/is-perplexity-down`, lastModified: now, changeFrequency: 'always', priority: 0.8 },
    { url: `${baseUrl}/is-copilot-down`, lastModified: now, changeFrequency: 'always', priority: 0.8 },
    { url: `${baseUrl}/is-midjourney-down`, lastModified: now, changeFrequency: 'always', priority: 0.8 },
    { url: `${baseUrl}/is-huggingface-down`, lastModified: now, changeFrequency: 'always', priority: 0.8 },
    { url: `${baseUrl}/is-mistral-down`, lastModified: now, changeFrequency: 'always', priority: 0.8 },
    { url: `${baseUrl}/is-replicate-down`, lastModified: now, changeFrequency: 'always', priority: 0.8 },
    { url: `${baseUrl}/is-cohere-down`, lastModified: now, changeFrequency: 'always', priority: 0.8 },

    // Pillar/guide pages
    { url: `${baseUrl}/what-is-ai`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/best-ai-tools`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/best-ai-chatbots`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/ai-api-pricing-guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/what-are-ai-agents`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/best-open-source-llms`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/agi-asi`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/model-wars`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/claude-md-guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/claude-md-examples`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/claude-md-generator`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },

    // Tools & features
    { url: `${baseUrl}/compare`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/benchmarks`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/harnesses`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/attention`, lastModified: now, changeFrequency: 'always', priority: 0.85 },
    { url: `${baseUrl}/playground`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/embeddings`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/inference-providers`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/multimodal`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/vector-dbs`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/usage-rankings`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/frameworks`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/benchmark-registry`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/open-weights`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/ai-hardware`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/mcp-servers`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/training-datasets`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/embodied-ai`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/ai-lawsuits`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/x402-adopters`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/agent-apis`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/training-runs`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/fine-tuning`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/specialized-models`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/model-cards`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/voice-leaderboards`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/marketplaces`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/public-leaderboards`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/funding`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/oss-tools`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/ai-policy`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/conferences`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/compute-providers`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/timeline`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/tools/cost-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/tools/trending`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/gpu-pricing`, lastModified: now, changeFrequency: 'always', priority: 0.85 },
    { url: `${baseUrl}/alerts`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/incidents`, lastModified: now, changeFrequency: 'always', priority: 0.8 },

    // Developer, editorial, changelog
    { url: `${baseUrl}/developers`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/developers/agent-payments`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/developers/frameworks`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/agent-fair-trade`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/afta-network`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/agent-provisioning`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/changelog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/originals`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/originals/claude-opus-4-7-release`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/originals/llms-txt-every-developer`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/ai-pricing-floor`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/why-we-built-tensorfeed`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/openai-killed-sora`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/mcp-97-million-installs`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/claude-code-leak`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/ai-service-outages-month`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/ai-api-pricing-war-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/open-source-llms-closing-gap`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/rise-of-agentic-ai`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/claude-mythos-not-afraid`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/building-for-ai-agents`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/ai-adoption-faster-than-internet`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/4chan-discovered-chain-of-thought`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/frontier-model-forum-vs-china`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/claude-mythos-ai-security`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/google-notebooklm-gemini`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/stanford-ai-index-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/claude-vs-gpt-vs-gemini`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/state-of-ai-apis-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/gpt-5-5-openai-flagship`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/claude-design-anthropic`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/ai-week-april-24-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/google-anthropic-40b-compute`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/originals/deepseek-v4-open-source-frontier`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/originals/ai-money-gap-pwc`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/anthropic-project-deal-agent-marketplace`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/originals/openai-workspace-agents-chatgpt-enterprise`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/originals/alibaba-happy-horse-video-crown`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/originals/microsoft-openai-partnership-reset`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/originals/validating-agent-payments-mainnet`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/originals/15-paid-endpoints-24-hours`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/originals/why-usdc-over-stripe`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/originals/mcp-server-fifty-line-file`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/originals/kv-ops-budget-edge-architecture`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/originals/publishing-bot-traffic`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/originals/ai-talent-war-billion-dollar-engineers`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/originals/openai-aws-bedrock-24-hours`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/originals/measuring-llm-api-latency-from-the-edge`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${baseUrl}/originals/guard-act-senate-judiciary-22-0`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${baseUrl}/originals/harness-gap-not-the-model`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${baseUrl}/originals/palo-alto-portkey-mcp-gateway`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${baseUrl}/originals/stripe-link-vs-usdc-agent-payments`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${baseUrl}/originals/pentagon-blacklists-anthropic-defense-deals`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${baseUrl}/originals/agents-md-new-robots-txt`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${baseUrl}/originals/ai-inference-floor-may-2026`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${baseUrl}/originals/cloudflare-stripe-agent-provisioning-protocol`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${baseUrl}/originals/mistral-medium-3-5-open-weights-frontier-coder`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${baseUrl}/originals/afta-is-bilateral-both-sides-win`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${baseUrl}/originals/anthropic-900-billion-valuation-tops-openai`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },

    // Agent-acquisition surface
    { url: `${baseUrl}/for-ai-agents`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/datasets`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/agent-traffic`, lastModified: now, changeFrequency: 'always', priority: 0.85 },
    { url: `${baseUrl}/glossary`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/glossary/x402`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/glossary/mcp`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/glossary/agent-payments`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },

    // Use-case landing pages (per agent persona)
    { url: `${baseUrl}/use-cases`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/use-cases/coding-agents`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/use-cases/research-agents`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/use-cases/api-cost-monitoring`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/use-cases/agent-payments`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },

    // Info pages
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/authors`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/authors/ripper`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/authors/kira-nolan`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/authors/marcus-chen`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/editorial-policy`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/security`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];
}
