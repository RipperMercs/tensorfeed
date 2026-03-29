import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://tensorfeed.ai';
  const now = new Date();

  return [
    // Core pages (update frequently)
    { url: baseUrl, lastModified: now, changeFrequency: 'always', priority: 1.0 },
    { url: `${baseUrl}/status`, lastModified: now, changeFrequency: 'always', priority: 0.9 },
    { url: `${baseUrl}/live`, lastModified: now, changeFrequency: 'always', priority: 0.9 },
    { url: `${baseUrl}/models`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/agents`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/research`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },

    // Status shortcut pages (high-traffic search queries)
    { url: `${baseUrl}/is-claude-down`, lastModified: now, changeFrequency: 'always', priority: 0.9 },
    { url: `${baseUrl}/is-chatgpt-down`, lastModified: now, changeFrequency: 'always', priority: 0.9 },

    // Pillar/guide pages
    { url: `${baseUrl}/what-is-ai`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/best-ai-tools`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/best-ai-chatbots`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/ai-api-pricing-guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/what-are-ai-agents`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/best-open-source-llms`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },

    // Developer & editorial
    { url: `${baseUrl}/developers`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/originals`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/originals/why-we-built-tensorfeed`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/building-for-ai-agents`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/claude-vs-gpt-vs-gemini`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/originals/state-of-ai-apis-2026`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },

    // Info pages
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
