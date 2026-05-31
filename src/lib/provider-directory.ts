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
      'Anthropic is the AI safety company behind the Claude family of models. Founded in 2021 by former OpenAI researchers Dario and Daniela Amodei, Anthropic has built a reputation for producing models that lead on reasoning and code generation benchmarks while emphasizing safety research. Their current flagship, Claude Opus 4.8, shipped on May 28, 2026, just six weeks after Opus 4.7. It keeps the 1 million token context window and the $15 input / $75 output pricing while improving agentic coding (64.3% to 69.2% on Anthropic\'s own measure), honesty about its own progress, and long-horizon autonomy, with a fast mode that is roughly 2.5x quicker and three times cheaper than before. In late April 2026 the company secured up to $25 billion in additional Amazon investment (April 21) and up to $40 billion in compute and capital from Google (April 24), bringing combined hyperscaler commitments past $65 billion at a $350 to $380 billion valuation. Their Model Context Protocol (MCP) has become foundational infrastructure for AI agents.',
    founded: '2021',
    headquarters: 'San Francisco, CA',
    ceo: 'Dario Amodei',
    keyProducts: ['Claude Opus 4.8', 'Claude Opus 4.7', 'Claude Sonnet 4.6', 'Claude Haiku 4.5', 'Claude Code', 'Model Context Protocol (MCP)'],
    strengths: ['Leading benchmark performance', 'Safety-focused development', '1M context on Opus 4.8', 'Stronger agentic coding and honesty', 'MCP ecosystem for agents'],
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
    keyProducts: ['GPT-5.5', 'GPT-4o', 'GPT-4o Mini', 'o1', 'o3-mini', 'ChatGPT', 'Codex', 'DALL-E'],
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
      'Google brings the deepest infrastructure advantage to the AI race. Their Gemini 2.5 Pro offers a 1 million token context window, and their Flash models deliver some of the lowest per-token pricing available. At Google I/O 2026 on May 19, Google shipped Gemini 3.5 Flash, the first Flash-tier release that beats the previous Pro flagship on agentic coding suites at roughly 4x the throughput, alongside Gemini Spark, a general-purpose agent that reasons across connected apps. At Google Cloud Next \'26 in Las Vegas on April 22, 2026, Google launched the Gemini Enterprise Agent Platform (the evolution of Vertex AI), backed by a $750 million partner fund, and announced that Gemini will power the next generation of Apple\'s Siri. Backed by custom TPU hardware and decades of ML research (Transformer architecture was invented at Google), they compete on both the frontier and the budget ends of the market.',
    founded: '1998 (Google); 2023 (Google DeepMind)',
    headquarters: 'Mountain View, CA',
    ceo: 'Sundar Pichai',
    keyProducts: ['Gemini 3.5 Flash', 'Gemini 2.5 Pro', 'Gemini 3.1 Flash-Lite', 'Gemini 2.0 Flash', 'Gemini Spark', 'Gemini Enterprise Agent Platform', 'NotebookLM', 'Vertex AI', 'Google AI Studio'],
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
    seoTitle: 'Cohere: Command A+, Command R Models, RAG, Pricing, and API Overview',
    seoDescription:
      'Everything about Cohere. Enterprise RAG, Command A+ open source MoE model, Command R lineup, pricing, and capabilities. Updated daily on TensorFeed.',
    intro:
      'Cohere is the enterprise-focused AI company built around retrieval-augmented generation (RAG) and sovereign AI deployment. Founded in 2019 by former Google Brain researchers, Cohere\'s Command R models are purpose-built for search, grounding, and citation workflows. On May 20, 2026 Cohere released Command A+, a 218B / 25B-active mixture-of-experts model under an Apache 2.0 license, runnable on as little as two H100 GPUs and Cohere\'s first multimodal reasoning model. If your primary use case is enterprise search, document Q&A with verifiable citations, sovereign deployment, or tool-augmented RAG pipelines, Cohere is the most specialized option available.',
    founded: '2019',
    headquarters: 'Toronto, Canada',
    ceo: 'Aidan Gomez',
    keyProducts: ['Command A+', 'Command R+', 'Command R', 'Embed v4', 'Rerank'],
    strengths: ['Apache 2.0 open source MoE flagship', 'Purpose-built for RAG', 'Native grounding and citations', 'Strong embedding models', 'Enterprise search focus', 'Multilingual support (48 languages)'],
    statusSlug: 'is-cohere-down',
  },
  {
    slug: 'deepseek',
    pricingId: 'deepseek',
    name: 'DeepSeek',
    url: 'https://www.deepseek.com',
    seoTitle: 'DeepSeek: V4 Models, Open Source AI, Pricing, and Overview',
    seoDescription:
      'Everything about DeepSeek. V4 Pro and Flash models, MIT license, pricing, benchmarks, and capabilities. Updated daily on TensorFeed.',
    intro:
      'DeepSeek is the Chinese AI lab that keeps closing the gap with frontier proprietary models while releasing everything under the MIT license. Their V4 family, launched in April 2026, includes V4 Pro (1.6 trillion parameters, 49B active) and V4 Flash (284B total, 13B active), both with native 1M token context windows. V4 Pro scored 80.6% on SWE-bench Verified, within 0.2 points of Claude Opus 4.6. At $1.74 per million input tokens for Pro and $0.14 for Flash, they offer near-frontier performance at a fraction of proprietary pricing.',
    founded: '2023',
    headquarters: 'Hangzhou, China',
    ceo: 'Liang Wenfeng',
    keyProducts: ['DeepSeek V4 Pro', 'DeepSeek V4 Flash', 'DeepSeek API'],
    strengths: ['MIT open source license', 'Near-frontier benchmarks', 'Ultra-competitive pricing', 'Native 1M context', 'Strong coding performance'],
  },
  {
    slug: 'alibaba',
    pricingId: 'alibaba',
    name: 'Alibaba',
    url: 'https://qwenlm.ai',
    seoTitle: 'Alibaba Qwen: Qwen3.7-Max, Models, Pricing, and Overview',
    seoDescription:
      'Everything about Alibaba and the Qwen family. Qwen3.7-Max, 1M context, agentic reasoning, pricing, benchmarks, and capabilities. Updated daily on TensorFeed.',
    intro:
      'Alibaba is the Chinese hyperscaler behind the Qwen family of models, one of the most prolific release cadences in AI. Their May 2026 flagship Qwen3.7-Max landed on the Alibaba Cloud API on May 19 and was formally unveiled at the 2026 Alibaba Cloud Summit on May 20. It carries a 1 million token context window, an extended-thinking mode, and posted the top result on the public Artificial Analysis Intelligence Index at 57, with roughly 1,475 Elo on the LM Arena text leaderboard. Alibaba claims Qwen3.7-Max can run agentic workloads autonomously for up to 35 hours on long-horizon tasks. Earlier members of the family including Qwen3 Coder Next, Qwen3.5 Plus, and Qwen3.6 Plus remain widely deployed across OpenRouter and self-hosted setups.',
    founded: '1999 (Alibaba); 2023 (Qwen)',
    headquarters: 'Hangzhou, China',
    ceo: 'Eddie Wu',
    keyProducts: ['Qwen3.7-Max', 'Qwen3.6 Plus', 'Qwen3 Coder Next', 'Alibaba Cloud Model Studio', 'Zhenwu AI Chip'],
    strengths: ['1M token context', 'Top public Intelligence Index score', 'Extended thinking mode', 'Long-horizon agentic operation', 'Aggressive open-weight cadence'],
  },
  {
    slug: 'nvidia',
    pricingId: 'nvidia',
    name: 'NVIDIA',
    url: 'https://www.nvidia.com/en-us/ai/',
    seoTitle: 'NVIDIA AI: Nemotron Models, Pricing, and Overview',
    seoDescription:
      'Everything about NVIDIA AI and the Nemotron family. Open multimodal models, document and video intelligence, benchmarks, and self-hosted deployment. Updated daily on TensorFeed.',
    intro:
      'NVIDIA is best known as the GPU company that powers the AI industry, but their model lineup matters too. The Nemotron family is purpose-built to showcase what their hardware can do, and the April 2026 release of Nemotron 3 Nano Omni 30B-A3B-Reasoning landed as one of the strongest open multimodal models of the year. It processes text, image, video, and audio in a single unified sequence via a hybrid Mamba-Transformer-MoE backbone (30B total parameters, 3B active per token), with a 256K token context window and native audio handling up to 20 minutes per clip. It tops six public leaderboards for document intelligence, video understanding, and voice interaction, and is available on Hugging Face under an open weight license in BF16, FP8, and NVFP4 quantizations including consumer-GPU formats.',
    founded: '1993',
    headquarters: 'Santa Clara, CA',
    ceo: 'Jensen Huang',
    keyProducts: ['Nemotron 3 Nano Omni', 'NIM inference microservices', 'build.nvidia.com', 'NeMo framework', 'Parakeet ASR'],
    strengths: ['Open weights with consumer GPU support', '256K context multimodal', 'Top document and video benchmarks', 'Native audio as first-class modality', 'Self-hosted deployment focus'],
  },
];

export function getProviderBySlug(slug: string): ProviderMeta | undefined {
  return PROVIDERS.find(p => p.slug === slug);
}

export function getAllProviderSlugs(): string[] {
  return PROVIDERS.map(p => p.slug);
}
