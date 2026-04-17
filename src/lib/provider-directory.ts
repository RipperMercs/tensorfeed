/**
 * Provider directory: drives /providers/[slug] hub pages.
 * Each entry represents an AI company with editorial content,
 * SEO metadata, and references to their models in pricing.json.
 */

export interface ProviderMeta {
  slug: string;
  /** Must match provider `id` in pricing.json */
  pricingId: string;
  name: string;
  url: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  founded: string;
  headquarters: string;
  ceo: string;
  keyProducts: string[];
  /** Short editorial takes on what makes this provider unique */
  strengths: string[];
  /** Status page slug (for "is-X-down" pages) */
  statusSlug?: string;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    slug: 'anthropic',
    pricingId: 'anthropic',
    name: 'Anthropic',
    url: 'https://www.anthropic.com',
    seoTitle: 'Anthropic: Claude Models, Pricing, and API Overview',
    seoDescription:
      'Everything about Anthropic and Claude. Model lineup, API pricing, benchmark scores, and status monitoring. Updated daily on TensorFeed.',
    intro:
      'Anthropic is the AI safety company behind the Claude family of models. Founded in 2021 by former OpenAI researchers Dario and Daniela Amodei, Anthropic has built a reputation for producing models that lead on reasoning and code generation benchmarks while emphasizing safety research. Their current flagship, Claude Opus 4.7, shipped on April 17, 2026 with a 1 million token context window at the same price as Opus 4.6. Their Model Context Protocol (MCP) has become foundational infrastructure for AI agents.',
    founded: '2021',
    headquarters: 'San Francisco, CA',
    ceo: 'Dario Amodei',
    keyProducts: ['Claude Opus 4.7', 'Claude Opus 4.6', 'Claude Sonnet 4.6', 'Claude Haiku 4.5', 'Claude Code', 'Model Context Protocol (MCP)'],
    strengths: ['Leading benchmark performance', 'Safety-focused development', '1M context on Opus 4.7', 'Strong code generation', 'MCP ecosystem for agents'],
    statusSlug: 'is-claude-down',
  },
  {
    slug: 'openai',
    pricingId: 'openai',
    name: 'OpenAI',
    url: 'https://openai.com',
    seoTitle: 'OpenAI: GPT Models, ChatGPT, Pricing, and API Overview',
    seoDescription:
      'Everything about OpenAI. GPT-4o, o1, ChatGPT, API pricing, benchmarks, and status. Updated daily on TensorFeed.',
    intro:
      'OpenAI is the company that launched the modern AI era with ChatGPT in November 2022. Their GPT-4o remains one of the most widely used AI models globally, and their o1 reasoning model pushed the frontier on math and science benchmarks. OpenAI operates the largest AI developer ecosystem with broad third-party integrations, plugins, and the most recognizable consumer AI brand in the world.',
    founded: '2015',
    headquarters: 'San Francisco, CA',
    ceo: 'Sam Altman',
    keyProducts: ['GPT-4o', 'GPT-4o Mini', 'o1', 'o3-mini', 'ChatGPT', 'DALL-E', 'Whisper'],
    strengths: ['Largest developer ecosystem', 'Native audio support in GPT-4o', 'Strong reasoning models (o1, o3)', 'Consumer brand recognition', 'Broad enterprise partnerships'],
    statusSlug: 'is-chatgpt-down',
  },
  {
    slug: 'google',
    pricingId: 'google',
    name: 'Google',
    url: 'https://ai.google.dev',
    seoTitle: 'Google AI: Gemini Models, Pricing, and API Overview',
    seoDescription:
      'Everything about Google AI and Gemini. Model lineup, pricing, 1M context window, benchmarks, and status. Updated daily on TensorFeed.',
    intro:
      'Google brings the deepest infrastructure advantage to the AI race. Their Gemini 2.5 Pro offers the industry\'s largest production context window at 1 million tokens, and their Flash models deliver some of the lowest per-token pricing available. Backed by custom TPU hardware and decades of ML research (Transformer architecture was invented at Google), they compete on both the frontier and the budget ends of the market.',
    founded: '1998 (Google); 2023 (Google DeepMind)',
    headquarters: 'Mountain View, CA',
    ceo: 'Sundar Pichai',
    keyProducts: ['Gemini 2.5 Pro', 'Gemini 2.0 Flash', 'NotebookLM', 'Vertex AI', 'Google AI Studio'],
    strengths: ['1M token context window', 'Lowest-cost budget models', 'Custom TPU infrastructure', 'Vertex AI enterprise platform', 'NotebookLM research integration'],
    statusSlug: 'is-gemini-down',
  },
  {
    slug: 'meta',
    pricingId: 'meta',
    name: 'Meta',
    url: 'https://ai.meta.com',
    seoTitle: 'Meta AI: Llama Models, Open Source, and Overview',
    seoDescription:
      'Everything about Meta AI and Llama. Open source models, 10M context window, benchmarks, and deployment options. Updated daily on TensorFeed.',
    intro:
      'Meta has positioned itself as the champion of open-source AI. Their Llama 4 family includes Scout (with a record 10 million token context window) and Maverick (which competes with proprietary mid-tier models on benchmarks). All Llama models are free to download and self-host under the Llama Community License, making Meta the most important player for teams that need on-premise deployments, fine-tuning, or zero marginal inference cost.',
    founded: '2004 (Meta); 2013 (FAIR)',
    headquarters: 'Menlo Park, CA',
    ceo: 'Mark Zuckerberg',
    keyProducts: ['Llama 4 Scout', 'Llama 4 Maverick', 'Meta AI Assistant'],
    strengths: ['Fully open source', 'Free to self-host and fine-tune', '10M token context (Scout)', 'Active research community', 'No per-token API costs'],
  },
  {
    slug: 'mistral',
    pricingId: 'mistral',
    name: 'Mistral',
    url: 'https://mistral.ai',
    seoTitle: 'Mistral AI: Models, Pricing, and API Overview',
    seoDescription:
      'Everything about Mistral AI. European flagship, model lineup, pricing, benchmarks, and capabilities. Updated daily on TensorFeed.',
    intro:
      'Mistral is the leading European AI company, founded in 2023 by former Google DeepMind and Meta researchers. Based in Paris, Mistral offers strong multilingual capabilities and competitive pricing. Their models are particularly popular with European enterprises that need data sovereignty compliance, and their budget-tier Mistral Small is one of the cheapest capable models available at $0.10 per million input tokens.',
    founded: '2023',
    headquarters: 'Paris, France',
    ceo: 'Arthur Mensch',
    keyProducts: ['Mistral Large', 'Mistral Small', 'Mistral API (La Plateforme)'],
    strengths: ['European data sovereignty', 'Strong multilingual performance', 'Competitive pricing', 'Fast inference', 'Growing enterprise presence'],
    statusSlug: 'is-mistral-down',
  },
  {
    slug: 'cohere',
    pricingId: 'cohere',
    name: 'Cohere',
    url: 'https://cohere.com',
    seoTitle: 'Cohere: Command R Models, RAG, Pricing, and API Overview',
    seoDescription:
      'Everything about Cohere. Enterprise RAG, Command R models, pricing, and capabilities. Updated daily on TensorFeed.',
    intro:
      'Cohere is the enterprise-focused AI company built around retrieval-augmented generation (RAG). Founded in 2019 by former Google Brain researchers, Cohere\'s Command R models are purpose-built for search, grounding, and citation workflows. If your primary use case is enterprise search, document Q&A with verifiable citations, or tool-augmented RAG pipelines, Cohere is the most specialized option available.',
    founded: '2019',
    headquarters: 'Toronto, Canada',
    ceo: 'Aidan Gomez',
    keyProducts: ['Command R+', 'Command R', 'Embed v4', 'Rerank'],
    strengths: ['Purpose-built for RAG', 'Native grounding and citations', 'Strong embedding models', 'Enterprise search focus', 'Multilingual support'],
    statusSlug: 'is-cohere-down',
  },
];

export function getProviderBySlug(slug: string): ProviderMeta | undefined {
  return PROVIDERS.find(p => p.slug === slug);
}

export function getAllProviderSlugs(): string[] {
  return PROVIDERS.map(p => p.slug);
}
