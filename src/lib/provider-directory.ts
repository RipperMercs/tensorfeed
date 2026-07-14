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
      'Anthropic is the AI safety company behind the Claude family of models. Founded in 2021 by former OpenAI researchers Dario and Daniela Amodei, Anthropic has built a reputation for producing models that lead on reasoning and code generation benchmarks while emphasizing safety research. On June 30, 2026 Anthropic released Claude Sonnet 5, the most agentic Sonnet-class model yet, at $2 input / $10 output per 1M tokens through August 31, 2026 (moving to $3 / $15 from September). Sonnet 5 ships a 1M context window with context compaction, adaptive thinking up to xhigh effort, and vendor-reported scores of 85.2 on SWE-bench Verified and 80.4 on Terminal-Bench 2.1, the latter of which actually beats Opus 4.8 on that specific benchmark. Claude Fable 5, launched June 9, 2026, sits above the family as the frontier tier: $10 / $50 per 1M tokens, 1M context with 128K output, always-on adaptive thinking, and vendor-reported scores of 80.3 on SWE-bench Pro and 85.0 on OSWorld-Verified. From June 9 through June 22 Fable 5 was included at no extra cost on Pro, Max, Team, and seat-based Enterprise plans; starting June 23 it moved to usage-credit billing on those plans, with the underlying API rate unchanged. Claude Opus 4.8, which shipped on May 28, 2026, remains the default model with the 1M context window at $15 / $75 pricing, improved agentic coding (64.3% to 69.2% on Anthropic\'s own measure), and a fast mode roughly 2.5x quicker and three times cheaper than before. In late April 2026 the company secured up to $25 billion in additional Amazon investment (April 21) and up to $40 billion in compute and capital from Google (April 24). On May 28, 2026 Anthropic closed a $65 billion Series H at a $965 billion post-money valuation, and on June 1 it confidentially filed a draft S-1 with the SEC for a proposed IPO, getting ahead of rival OpenAI. Their Model Context Protocol (MCP) has become foundational infrastructure for AI agents.',
    founded: '2021',
    headquarters: 'San Francisco, CA',
    ceo: 'Dario Amodei',
    keyProducts: ['Claude Fable 5', 'Claude Sonnet 5', 'Claude Opus 4.8', 'Claude Opus 4.7', 'Claude Sonnet 4.6', 'Claude Haiku 4.5', 'Claude Code', 'Model Context Protocol (MCP)'],
    strengths: ['Leading benchmark performance', 'Safety-focused development', '1M context on Fable 5, Sonnet 5, and Opus 4.8', 'Stronger agentic coding and honesty', 'MCP ecosystem for agents'],
    statusSlug: 'is-claude-down',
  },
  {
    slug: 'openai',
    pricingId: 'openai',
    name: 'OpenAI',
    url: 'https://openai.com',
    seoTitle: 'OpenAI: GPT Models, ChatGPT, Pricing, and API Overview',
    seoDescription:
      'Everything about OpenAI. GPT-5.6 Sol Terra Luna, GPT-5.5, GPT-4o, o1, ChatGPT, API pricing, benchmarks, and status. Updated daily on TensorFeed.',
    intro:
      'OpenAI is the company that launched the modern AI era with ChatGPT in November 2022. On June 26, 2026 it previewed GPT-5.6 as a three-model family (Sol, Terra, Luna) under a US Government limited-preview arrangement, then made all three tiers generally available on July 9, 2026. Sol sits at the frontier at $5 per 1M input and $30 per 1M output, Terra targets GPT-5.5-class performance at roughly half the cost ($2.50 / $15), and Luna fills the budget tier at $1 / $6, with cached reads keeping a 90% discount. In ChatGPT, Free and Go users now default to Terra while paid users default to Sol. GPT-5.5 (April 2026) remains the broadly available flagship, with a 1M context window and the same $5 / $30 pricing as Sol. GPT-4.5 was removed from ChatGPT on June 26, 2026, following GPT-5.2 Instant, Thinking, and Pro on June 12, tightening the active ChatGPT lineup around GPT-5.5. OpenAI operates the largest AI developer ecosystem with broad third-party integrations, plugins, and the most recognizable consumer AI brand in the world.',
    founded: '2015',
    headquarters: 'San Francisco, CA',
    ceo: 'Sam Altman',
    keyProducts: ['GPT-5.6 Sol', 'GPT-5.6 Terra', 'GPT-5.6 Luna', 'GPT-5.5', 'GPT-4o', 'GPT-4o Mini', 'o1', 'o3-mini', 'ChatGPT', 'Codex', 'DALL-E'],
    strengths: ['Largest developer ecosystem', 'GPT-5.6 Sol, Terra, and Luna generally available July 9, 2026', 'Native audio support in GPT-4o', 'Strong reasoning models (o1, o3)', 'Consumer brand recognition', 'Broad enterprise partnerships'],
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
      'Meta has positioned itself as the champion of open-source AI. Their Llama 4 family includes Scout (with a record 10 million token context window) and Maverick (which competes with proprietary mid-tier models on benchmarks), all free to download and self-host under the Llama Community License. On July 9, 2026 Meta shifted strategy with Muse Spark 1.1, its first paid API model, opened to US developers at $1.25 input / $4.25 output per 1M tokens, roughly a quarter of OpenAI and Anthropic list rates. Muse Spark 1.1 is a multimodal reasoning model built for agentic and coding work, with a 1M self-managed context window, native primary-agent and subagent orchestration, and MCP support. It tops tool-use benchmarks (88.1 on MCP Atlas) though it trails the leaders on pure coding accuracy. Meta remains the most important player for teams that need on-premise deployments, fine-tuning, or zero marginal inference cost, and now also competes on low-cost hosted agentic inference.',
    founded: '2004 (Meta); 2013 (FAIR)',
    headquarters: 'Menlo Park, CA',
    ceo: 'Mark Zuckerberg',
    keyProducts: ['Muse Spark 1.1', 'Llama 4 Scout', 'Llama 4 Maverick', 'Meta AI Assistant'],
    strengths: ['Muse Spark 1.1 low-cost agentic API ($1.25/$4.25)', 'Fully open-source Llama family', 'Free to self-host and fine-tune', '10M token context (Scout)', 'No per-token cost for open weights'],
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
  {
    slug: 'microsoft',
    pricingId: 'microsoft',
    name: 'Microsoft',
    url: 'https://microsoft.ai',
    seoTitle: 'Microsoft AI: MAI Models, Copilot, Pricing, and Overview',
    seoDescription:
      'Everything about Microsoft AI and the MAI family. MAI-Code-1-Flash, MAI-Thinking-1, GitHub Copilot integration, pricing, and capabilities. Updated daily on TensorFeed.',
    intro:
      'Microsoft spent years as OpenAI\'s largest backer and distributor, and in June 2026 it stepped onto the field as a frontier lab in its own right. At Build 2026 on June 2, Microsoft AI announced MAI-Code-1-Flash, its first in-house coding model, and MAI-Thinking-1, its first reasoning model. MAI-Code-1-Flash rolls out across all GitHub Copilot tiers at $0.75 per million input and $4.50 per million output with a 256K context window, and Microsoft claims it beats Claude Haiku 4.5 on price to performance while using 60% fewer tokens on hard tasks. MAI-Thinking-1, a 35B-active-parameter MoE with a 256K context window, posted 97% on AIME 25 and 53% on SWE-Bench Pro, which Microsoft says matches Claude Opus 4.6, and sits in private preview on Microsoft Foundry with distribution planned through Fireworks AI, Baseten, and OpenRouter. The launches are widely read as Microsoft reducing its dependence on OpenAI models inside Copilot.',
    founded: '1975 (Microsoft); 2024 (Microsoft AI)',
    headquarters: 'Redmond, WA',
    ceo: 'Satya Nadella',
    keyProducts: ['MAI-Code-1-Flash', 'MAI-Thinking-1', 'GitHub Copilot', 'Microsoft Foundry', 'Microsoft 365 Copilot', 'Azure AI'],
    strengths: ['GitHub Copilot distribution at massive scale', 'Aggressive price to performance on coding', 'Azure and Foundry enterprise reach', 'First-party reasoning model in preview', 'Reduced reliance on OpenAI'],
  },
  {
    slug: 'meituan',
    pricingId: 'meituan',
    name: 'Meituan',
    url: 'https://www.longcatai.org',
    seoTitle: 'Meituan: LongCat-2.0, Open Source AI, and Overview',
    seoDescription:
      'Everything about Meituan\'s AI lab and the LongCat family. LongCat-2.0 open-source 1.6T agentic coding model, MIT license, benchmarks, and specs. Updated on TensorFeed.',
    intro:
      'Meituan is the Chinese consumer platform (food delivery, travel, local services) whose AI lab published one of the more consequential open-source releases of 2026. On June 30, 2026 Meituan open sourced LongCat-2.0, a 1.6 trillion parameter mixture-of-experts model with dynamic activation of 33 to 56 billion parameters per token, native 1 million token context, and a purpose-built agentic coding orientation. It was the first trillion-parameter release to complete full training and inference entirely on a 50,000-card domestic Chinese compute cluster, a milestone for building frontier AI without leading-edge Western silicon. Weights ship under MIT on GitHub and Hugging Face. Meituan reports 59.5 on SWE-Bench Pro (self-reported), ahead of Gemini 3.1 Pro, GPT-5.5, and Claude Opus 4.6 by their measure; independent verification is pending. A preview version had been quietly running on OpenRouter and longcat.ai for weeks before the announcement, ranking among the top three models globally by call volume during that stealth window.',
    founded: '2010 (Meituan); 2024 (Meituan AI Lab)',
    headquarters: 'Beijing, China',
    ceo: 'Wang Xing',
    keyProducts: ['LongCat-2.0', 'LongCat platform (longcat.ai)'],
    strengths: ['1.6T open-source MoE under MIT', 'Trained end-to-end on domestic Chinese silicon', 'Native 1M context', 'Purpose-built for agentic coding', 'Top-three OpenRouter call volume during stealth preview'],
  },
  {
    slug: 'minimax',
    pricingId: 'minimax',
    name: 'MiniMax',
    url: 'https://www.minimax.io',
    seoTitle: 'MiniMax: M3 Model, Open Weights, Pricing, and Overview',
    seoDescription:
      'Everything about MiniMax and the M3 model. Sparse attention, 1M context, open weights, $0.30/$1.20 pricing, benchmarks, and capabilities. Updated daily on TensorFeed.',
    intro:
      'MiniMax is the Shanghai-based AI lab known for shipping open-weight models with aggressive long-context engineering. Its June 1, 2026 release, MiniMax M3, is built on MiniMax Sparse Attention (MSA), which replaces full attention with KV-block selection and cuts per-token compute at 1M context to roughly one twentieth of the previous generation. M3 takes text, image, and video input across a 1,048,576 token context window, reports 59% on SWE-Bench Pro and 83.5 on BrowseComp, and is priced at $0.30 per million input and $1.20 per million output, around 5 to 10 percent of the cost of proprietary flagships. The headline benchmark runs used MiniMax\'s own infrastructure and agent scaffolding, so independent verification is pending, and the open weights are due on Hugging Face within about ten days of launch.',
    founded: '2021',
    headquarters: 'Shanghai, China',
    ceo: 'Yan Junjie',
    keyProducts: ['MiniMax M3', 'MiniMax M2', 'MiniMax API platform', 'Hailuo AI video'],
    strengths: ['Sparse attention long-context efficiency', 'Ultra-low pricing', 'Open-weight release cadence', 'Multimodal input at 1M context', 'Strong agentic coding claims'],
  },
  {
    slug: 'xai',
    pricingId: 'xai',
    name: 'xAI',
    url: 'https://x.ai',
    seoTitle: 'xAI: Grok Models, Pricing, and API Overview',
    seoDescription:
      'Everything about xAI and Grok. Grok 4.5 coding model, pricing, 500K context, benchmarks, and company overview. Updated daily on TensorFeed.',
    intro:
      'xAI is Elon Musk\'s AI company, founded in 2023 and integrated with X (formerly Twitter) for real-time data. On July 8, 2026 it released Grok 4.5, its first model built specifically for coding and agentic work, on the 1.5 trillion parameter V9 foundation (up from Grok 4.3\'s V8) and trained on real coding-agent data. Grok 4.5 lands fourth on the Artificial Analysis Intelligence Index, above every open-weight model and every Gemini model, at a price more than 60% below Claude Opus 4.8 or GPT-5.5. It leads Opus 4.8 on the provider-harness DeepSWE 1.0 score and on Terminal-Bench 2.1 (83.3) while trailing it on the neutral DeepSWE 1.1 run and on SWE-Bench Pro (64.7). API pricing is $2 input / $6 output per 1M tokens, with cached input at $0.50 and a higher-context surcharge above 200K tokens. xAI narrowed the context window to 500K tokens to focus the model on coding, and says it plans to train new models from scratch on a monthly cadence through the end of 2026.',
    founded: '2023',
    headquarters: 'Palo Alto, CA',
    ceo: 'Elon Musk',
    keyProducts: ['Grok 4.5', 'Grok 4.3', 'Grok API', 'Grok in X', 'SuperGrok'],
    strengths: ['Fourth on the Artificial Analysis Intelligence Index', 'Over 60% cheaper than Opus 4.8 or GPT-5.5', 'Real-time X data integration', 'Coding-focused V9 foundation', 'Monthly from-scratch training cadence'],
  },
];

export function getProviderBySlug(slug: string): ProviderMeta | undefined {
  return PROVIDERS.find(p => p.slug === slug);
}

export function getAllProviderSlugs(): string[] {
  return PROVIDERS.map(p => p.slug);
}
