import { MetadataRoute } from 'next';
import { getAllModelSlugs } from '@/lib/model-directory';

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

  return [
    // Core pages (update frequently)
    { url: baseUrl, lastModified: now, changeFrequency: 'always', priority: 1.0 },
    { url: `${baseUrl}/status`, lastModified: now, changeFrequency: 'always', priority: 0.9 },
    { url: `${baseUrl}/today`, lastModified: now, changeFrequency: 'always', priority: 0.9 },
    { url: `${baseUrl}/live`, lastModified: now, changeFrequency: 'always', priority: 0.9 },
    { url: `${baseUrl}/models`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...modelPages,
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
    { url: `${baseUrl}/timeline`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/tools/cost-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/tools/trending`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/alerts`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/incidents`, lastModified: now, changeFrequency: 'always', priority: 0.8 },

    // Developer, editorial, changelog
    { url: `${baseUrl}/developers`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/changelog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/originals`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
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
    { url: `${baseUrl}/originals/frontier-model-forum-vs-china`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/claude-mythos-ai-security`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/google-notebooklm-gemini`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/stanford-ai-index-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/claude-vs-gpt-vs-gemini`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/state-of-ai-apis-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },

    // Info pages
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];
}
