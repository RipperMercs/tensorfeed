/**
 * Embedding and reranker model catalog.
 *
 * Curated list of production-ready embedding and reranker models with
 * pricing, dimensions, max input tokens, hosted vs open-source status,
 * and licensing. Mirrors the shape of the chat-model catalog so agents
 * doing RAG can compare embeddings the same way they compare chat
 * models.
 *
 * Data is editorial. Refreshed by hand on redeploy when providers
 * publish a new version or change pricing. Not driven by a daily cron
 * because embedding-model pricing changes rarely (months, not days).
 *
 * Served at /api/embeddings (free, cached 300s).
 */

export interface EmbeddingModel {
  id: string;
  name: string;
  provider: string;
  type: 'embedding' | 'reranker';
  /** Dimensions of the output vector. Null for rerankers (return scalar score). */
  dimensions: number | null;
  /** Max input tokens per request. */
  maxInputTokens: number;
  /** Price per 1M input tokens, USD. Null for open-source / self-hosted. */
  pricePer1MTokens: number | null;
  /** Pricing model: per token, per 1k requests, free, etc. */
  pricingNote: string;
  openSource: boolean;
  /** License (MIT, Apache-2.0, proprietary, etc). */
  license: string;
  /** ISO date the model was released or made GA. */
  released: string;
  /** Notable strengths or use cases. */
  notes: string;
  /** Languages supported (multilingual flag). */
  multilingual: boolean;
  /** Vendor docs URL. */
  url: string;
  /** Optional MTEB benchmark score (average across all tasks, 2-decimal). */
  mtebAvg: number | null;
}

export const EMBEDDING_CATALOG: EmbeddingModel[] = [
  // ── OpenAI ─────────────────────────────────────────────────
  {
    id: 'text-embedding-3-large',
    name: 'text-embedding-3-large',
    provider: 'OpenAI',
    type: 'embedding',
    dimensions: 3072,
    maxInputTokens: 8191,
    pricePer1MTokens: 0.13,
    pricingNote: '$0.13 per 1M input tokens. Reducible-dimensions: pass `dimensions` to truncate to 256/1024/etc with minor quality loss.',
    openSource: false,
    license: 'Proprietary',
    released: '2024-01-25',
    notes: 'OpenAI flagship embedding. Strong on English retrieval; supports Matryoshka truncation to lower dimensions for cheaper storage.',
    multilingual: true,
    url: 'https://platform.openai.com/docs/guides/embeddings',
    mtebAvg: 64.6,
  },
  {
    id: 'text-embedding-3-small',
    name: 'text-embedding-3-small',
    provider: 'OpenAI',
    type: 'embedding',
    dimensions: 1536,
    maxInputTokens: 8191,
    pricePer1MTokens: 0.02,
    pricingNote: '$0.02 per 1M input tokens. The default budget choice for English RAG.',
    openSource: false,
    license: 'Proprietary',
    released: '2024-01-25',
    notes: 'OpenAI budget embedding. 5x cheaper than ada-002 with better quality. Good default for most RAG agents.',
    multilingual: true,
    url: 'https://platform.openai.com/docs/guides/embeddings',
    mtebAvg: 62.3,
  },

  // ── Voyage AI ──────────────────────────────────────────────
  {
    id: 'voyage-3-large',
    name: 'voyage-3-large',
    provider: 'Voyage AI',
    type: 'embedding',
    dimensions: 1024,
    maxInputTokens: 32000,
    pricePer1MTokens: 0.18,
    pricingNote: '$0.18 per 1M input tokens. Recommended by Anthropic in the Claude docs.',
    openSource: false,
    license: 'Proprietary',
    released: '2025-01-07',
    notes: 'Top of the MTEB English leaderboard most of 2025. Supports Matryoshka truncation. Strong on long-document retrieval.',
    multilingual: true,
    url: 'https://docs.voyageai.com/docs/embeddings',
    mtebAvg: 67.0,
  },
  {
    id: 'voyage-3',
    name: 'voyage-3',
    provider: 'Voyage AI',
    type: 'embedding',
    dimensions: 1024,
    maxInputTokens: 32000,
    pricePer1MTokens: 0.06,
    pricingNote: '$0.06 per 1M input tokens. Best price/quality trade-off in the Voyage line.',
    openSource: false,
    license: 'Proprietary',
    released: '2024-09-18',
    notes: 'Voyage workhorse. 32k context, multilingual, MTEB-competitive at a third the cost of voyage-3-large.',
    multilingual: true,
    url: 'https://docs.voyageai.com/docs/embeddings',
    mtebAvg: 63.5,
  },
  {
    id: 'voyage-3-lite',
    name: 'voyage-3-lite',
    provider: 'Voyage AI',
    type: 'embedding',
    dimensions: 512,
    maxInputTokens: 32000,
    pricePer1MTokens: 0.02,
    pricingNote: '$0.02 per 1M input tokens. Cheapest tier in the Voyage family.',
    openSource: false,
    license: 'Proprietary',
    released: '2024-09-18',
    notes: 'Budget tier. 512-dim vectors keep storage costs low. Useful for very large corpora where retrieval recall matters less than ingest cost.',
    multilingual: true,
    url: 'https://docs.voyageai.com/docs/embeddings',
    mtebAvg: 60.0,
  },
  {
    id: 'voyage-code-3',
    name: 'voyage-code-3',
    provider: 'Voyage AI',
    type: 'embedding',
    dimensions: 1024,
    maxInputTokens: 32000,
    pricePer1MTokens: 0.18,
    pricingNote: '$0.18 per 1M input tokens. Code-specialized.',
    openSource: false,
    license: 'Proprietary',
    released: '2024-12-05',
    notes: 'Specialized for code-search agents. Strong on cross-language retrieval (e.g. natural-language query against a Python+Go+Rust monorepo).',
    multilingual: true,
    url: 'https://docs.voyageai.com/docs/embeddings',
    mtebAvg: null,
  },

  // ── Cohere ─────────────────────────────────────────────────
  {
    id: 'embed-multilingual-v3.0',
    name: 'embed-multilingual-v3.0',
    provider: 'Cohere',
    type: 'embedding',
    dimensions: 1024,
    maxInputTokens: 512,
    pricePer1MTokens: 0.10,
    pricingNote: '$0.10 per 1M input tokens. 100+ languages.',
    openSource: false,
    license: 'Proprietary',
    released: '2023-11-02',
    notes: 'Cohere multilingual flagship. 100+ languages with strong cross-lingual retrieval. Short input limit (512 tokens) is the main constraint.',
    multilingual: true,
    url: 'https://docs.cohere.com/docs/embeddings',
    mtebAvg: 64.0,
  },
  {
    id: 'embed-english-v3.0',
    name: 'embed-english-v3.0',
    provider: 'Cohere',
    type: 'embedding',
    dimensions: 1024,
    maxInputTokens: 512,
    pricePer1MTokens: 0.10,
    pricingNote: '$0.10 per 1M input tokens.',
    openSource: false,
    license: 'Proprietary',
    released: '2023-11-02',
    notes: 'English-only sibling of embed-multilingual-v3. Slightly stronger on English-only corpora.',
    multilingual: false,
    url: 'https://docs.cohere.com/docs/embeddings',
    mtebAvg: 64.5,
  },

  // ── Google ─────────────────────────────────────────────────
  {
    id: 'gemini-embedding-001',
    name: 'gemini-embedding-001',
    provider: 'Google',
    type: 'embedding',
    dimensions: 3072,
    maxInputTokens: 2048,
    pricePer1MTokens: 0.15,
    pricingNote: '$0.15 per 1M input tokens. Supports Matryoshka.',
    openSource: false,
    license: 'Proprietary',
    released: '2025-03-07',
    notes: 'Google flagship embedding from the Gemini family. Strong multilingual. Available via Vertex AI and the Gemini API.',
    multilingual: true,
    url: 'https://ai.google.dev/gemini-api/docs/embeddings',
    mtebAvg: 68.3,
  },
  {
    id: 'text-embedding-005',
    name: 'text-embedding-005',
    provider: 'Google',
    type: 'embedding',
    dimensions: 768,
    maxInputTokens: 2048,
    pricePer1MTokens: 0.025,
    pricingNote: '$0.025 per 1M input tokens. Vertex AI only.',
    openSource: false,
    license: 'Proprietary',
    released: '2024-11-14',
    notes: 'Google budget tier. 768-dim, English-focused, cheapest of the Vertex AI embeddings.',
    multilingual: false,
    url: 'https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings',
    mtebAvg: null,
  },

  // ── Mistral ────────────────────────────────────────────────
  {
    id: 'mistral-embed',
    name: 'mistral-embed',
    provider: 'Mistral',
    type: 'embedding',
    dimensions: 1024,
    maxInputTokens: 8000,
    pricePer1MTokens: 0.10,
    pricingNote: '$0.10 per 1M input tokens via la Plateforme.',
    openSource: false,
    license: 'Proprietary',
    released: '2024-02-26',
    notes: 'European data residency option. Solid English/French/German performance. Same pricing tier as Cohere but with longer context.',
    multilingual: true,
    url: 'https://docs.mistral.ai/capabilities/embeddings/',
    mtebAvg: 60.7,
  },

  // ── Jina ───────────────────────────────────────────────────
  {
    id: 'jina-embeddings-v3',
    name: 'jina-embeddings-v3',
    provider: 'Jina AI',
    type: 'embedding',
    dimensions: 1024,
    maxInputTokens: 8192,
    pricePer1MTokens: 0.02,
    pricingNote: '$0.02 per 1M input tokens (Jina API). Free for self-hosting under Apache 2.0.',
    openSource: true,
    license: 'CC-BY-NC-4.0',
    released: '2024-09-18',
    notes: 'Open-weights multilingual embedding. Strong on long documents. Adapter-based: same model serves retrieval, classification, separation tasks via task-specific LoRAs.',
    multilingual: true,
    url: 'https://jina.ai/embeddings/',
    mtebAvg: 65.5,
  },

  // ── Nomic ──────────────────────────────────────────────────
  {
    id: 'nomic-embed-text-v1.5',
    name: 'nomic-embed-text-v1.5',
    provider: 'Nomic AI',
    type: 'embedding',
    dimensions: 768,
    maxInputTokens: 8192,
    pricePer1MTokens: null,
    pricingNote: 'Open weights. Free to self-host. Hosted via Nomic Atlas at $0.01 per 1M tokens.',
    openSource: true,
    license: 'Apache-2.0',
    released: '2024-02-14',
    notes: 'Open-source English embedding with Matryoshka support (truncate to 256/512/768). Reproducible training data; one of the few fully open embeddings.',
    multilingual: false,
    url: 'https://blog.nomic.ai/posts/nomic-embed-matryoshka',
    mtebAvg: 62.3,
  },

  // ── Mixedbread ─────────────────────────────────────────────
  {
    id: 'mxbai-embed-large-v1',
    name: 'mxbai-embed-large-v1',
    provider: 'Mixedbread',
    type: 'embedding',
    dimensions: 1024,
    maxInputTokens: 512,
    pricePer1MTokens: null,
    pricingNote: 'Open weights. Free to self-host. Hosted via Mixedbread API at $0.05 per 1M tokens.',
    openSource: true,
    license: 'Apache-2.0',
    released: '2024-03-07',
    notes: 'Apache-licensed dense retriever. Strong English performance. Short input limit (512) is the main constraint vs Voyage/Jina.',
    multilingual: false,
    url: 'https://www.mixedbread.com/docs/embeddings/overview',
    mtebAvg: 64.7,
  },

  // ── BAAI ───────────────────────────────────────────────────
  {
    id: 'bge-m3',
    name: 'bge-m3',
    provider: 'BAAI',
    type: 'embedding',
    dimensions: 1024,
    maxInputTokens: 8192,
    pricePer1MTokens: null,
    pricingNote: 'Open weights. Free to self-host. Available through most inference providers (Together, DeepInfra, Replicate).',
    openSource: true,
    license: 'MIT',
    released: '2024-01-30',
    notes: 'Multi-functional, multi-lingual, multi-granularity. Outputs dense + sparse + multi-vector representations from a single model. Strong on long-document multilingual retrieval.',
    multilingual: true,
    url: 'https://huggingface.co/BAAI/bge-m3',
    mtebAvg: 64.5,
  },

  // ── Rerankers ──────────────────────────────────────────────
  {
    id: 'rerank-v3.5',
    name: 'rerank-v3.5',
    provider: 'Cohere',
    type: 'reranker',
    dimensions: null,
    maxInputTokens: 4096,
    pricePer1MTokens: 0,
    pricingNote: '$2 per 1k searches (each search = up to 100 documents reranked).',
    openSource: false,
    license: 'Proprietary',
    released: '2024-12-03',
    notes: 'Cohere flagship reranker. Strong multi-lingual reranking with 4k document context. The reranker that most production RAG agents are using as of 2026.',
    multilingual: true,
    url: 'https://docs.cohere.com/docs/rerank-2',
    mtebAvg: null,
  },
  {
    id: 'rerank-2',
    name: 'rerank-2',
    provider: 'Voyage AI',
    type: 'reranker',
    dimensions: null,
    maxInputTokens: 16000,
    pricePer1MTokens: 0.05,
    pricingNote: '$0.05 per 1M tokens (query + documents combined).',
    openSource: false,
    license: 'Proprietary',
    released: '2024-08-09',
    notes: 'Voyage reranker. 16k context per document is unusual; useful for reranking long-document chunks without summarization.',
    multilingual: true,
    url: 'https://docs.voyageai.com/docs/reranker',
    mtebAvg: null,
  },
  {
    id: 'jina-reranker-v2',
    name: 'jina-reranker-v2-base-multilingual',
    provider: 'Jina AI',
    type: 'reranker',
    dimensions: null,
    maxInputTokens: 1024,
    pricePer1MTokens: 0.02,
    pricingNote: '$0.02 per 1M tokens via Jina API. Free to self-host.',
    openSource: true,
    license: 'CC-BY-NC-4.0',
    released: '2024-07-04',
    notes: 'Open-weights reranker. 100+ languages. Smaller context than Cohere/Voyage but free to self-host.',
    multilingual: true,
    url: 'https://jina.ai/reranker/',
    mtebAvg: null,
  },
];

export interface EmbeddingsResponse {
  ok: true;
  source: 'tensorfeed.ai';
  lastUpdated: string;
  count: number;
  models: EmbeddingModel[];
}

export const EMBEDDINGS_LAST_UPDATED = '2026-04-30';
