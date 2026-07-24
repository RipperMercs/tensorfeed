/**
 * Model deprecation calendar.
 *
 * Source-of-truth registry of provider model retirements and deprecation
 * announcements. Curated manually from each provider's own deprecation
 * notice page. Every entry carries a sourceUrl so consumers can verify
 * the claim against the upstream announcement directly.
 *
 * Status semantics:
 *   - announced: deprecation has been announced but the model still
 *     accepts traffic at full capacity. A `deprecationDate` is set.
 *   - deprecated: model is past its deprecation date and the provider
 *     has indicated migration is required. May still serve traffic but
 *     under degraded SLA. A `sunsetDate` is typically set.
 *   - sunsetted: model no longer accepts traffic. The model endpoint
 *     returns an error or is removed. `sunsetDate` is in the past.
 *
 * Maintenance:
 *   - Add new entries when a provider announces a deprecation.
 *   - Update status as dates pass.
 *   - Bump MODEL_DEPRECATIONS_LAST_UPDATED whenever the file changes.
 *
 * Public surfaces:
 *   - GET /api/model-deprecations (free, JSON)
 *   - /model-deprecations (human-readable page)
 */

export type DeprecationStatus = 'announced' | 'deprecated' | 'sunsetted';

export interface ModelDeprecation {
  /** Stable slug used as a row id. */
  id: string;
  /** Provider name (Anthropic, OpenAI, Google, Mistral, etc.). */
  provider: string;
  /** Canonical model id as the provider exposes it via API. */
  model: string;
  /** Human-friendly display name if different from `model`. */
  modelDisplay?: string;
  status: DeprecationStatus;
  /** ISO date the provider first announced the deprecation. */
  announcedDate?: string;
  /** ISO date the model is officially deprecated (still serves). */
  deprecationDate?: string;
  /** ISO date the model stops serving traffic entirely. */
  sunsetDate?: string;
  /** Recommended replacement model id from the same provider. */
  replacement?: string;
  /** Free-form explanatory note. Keep terse. */
  notes?: string;
  /** Authoritative provider announcement URL. */
  sourceUrl: string;
}

export const MODEL_DEPRECATIONS: ModelDeprecation[] = [
  // === OpenAI ===
  {
    id: 'openai-text-davinci-003',
    provider: 'OpenAI',
    model: 'text-davinci-003',
    status: 'sunsetted',
    announcedDate: '2023-07-06',
    deprecationDate: '2024-01-04',
    sunsetDate: '2024-01-04',
    replacement: 'gpt-3.5-turbo-instruct',
    notes: 'Last of the original GPT-3 completion-API family. Replaced by chat-completions.',
    sourceUrl: 'https://platform.openai.com/docs/deprecations',
  },
  {
    id: 'openai-gpt-3-5-turbo-0301',
    provider: 'OpenAI',
    model: 'gpt-3.5-turbo-0301',
    status: 'sunsetted',
    announcedDate: '2023-07-06',
    deprecationDate: '2024-06-13',
    sunsetDate: '2024-06-13',
    replacement: 'gpt-3.5-turbo',
    sourceUrl: 'https://platform.openai.com/docs/deprecations',
  },
  {
    id: 'openai-gpt-3-5-turbo-0613',
    provider: 'OpenAI',
    model: 'gpt-3.5-turbo-0613',
    status: 'sunsetted',
    announcedDate: '2023-11-06',
    deprecationDate: '2024-09-13',
    sunsetDate: '2024-09-13',
    replacement: 'gpt-3.5-turbo',
    sourceUrl: 'https://platform.openai.com/docs/deprecations',
  },
  {
    id: 'openai-gpt-4-0314',
    provider: 'OpenAI',
    model: 'gpt-4-0314',
    status: 'sunsetted',
    announcedDate: '2023-11-06',
    deprecationDate: '2024-06-13',
    sunsetDate: '2024-06-13',
    replacement: 'gpt-4-turbo',
    sourceUrl: 'https://platform.openai.com/docs/deprecations',
  },
  {
    id: 'openai-gpt-4-32k',
    provider: 'OpenAI',
    model: 'gpt-4-32k-0314',
    status: 'sunsetted',
    announcedDate: '2023-11-06',
    deprecationDate: '2024-06-06',
    sunsetDate: '2024-06-06',
    replacement: 'gpt-4-turbo',
    notes: 'Both 32k variants (-0314 and -0613) sunsetted together. 128k context now standard.',
    sourceUrl: 'https://platform.openai.com/docs/deprecations',
  },

  // === Anthropic ===
  {
    id: 'anthropic-claude-instant-1',
    provider: 'Anthropic',
    model: 'claude-instant-1.2',
    modelDisplay: 'Claude Instant 1.2',
    status: 'sunsetted',
    announcedDate: '2024-04-26',
    deprecationDate: '2024-07-21',
    sunsetDate: '2024-07-21',
    replacement: 'claude-3-haiku-20240307',
    notes: 'Original cost-tier Claude. Replaced by the Claude 3 Haiku family.',
    sourceUrl: 'https://docs.anthropic.com/en/docs/about-claude/model-deprecations',
  },
  {
    id: 'anthropic-claude-2-0',
    provider: 'Anthropic',
    model: 'claude-2.0',
    status: 'sunsetted',
    announcedDate: '2024-04-26',
    deprecationDate: '2024-07-21',
    sunsetDate: '2024-07-21',
    replacement: 'claude-3-5-sonnet-20240620',
    sourceUrl: 'https://docs.anthropic.com/en/docs/about-claude/model-deprecations',
  },
  {
    id: 'anthropic-claude-2-1',
    provider: 'Anthropic',
    model: 'claude-2.1',
    status: 'sunsetted',
    announcedDate: '2024-04-26',
    deprecationDate: '2024-07-21',
    sunsetDate: '2024-07-21',
    replacement: 'claude-3-5-sonnet-20240620',
    sourceUrl: 'https://docs.anthropic.com/en/docs/about-claude/model-deprecations',
  },

  // === Google ===
  {
    id: 'google-text-bison-001',
    provider: 'Google',
    model: 'text-bison-001',
    modelDisplay: 'PaLM 2 (text-bison)',
    status: 'sunsetted',
    announcedDate: '2024-04-09',
    deprecationDate: '2024-08-15',
    sunsetDate: '2024-10-09',
    replacement: 'gemini-1.5-pro',
    notes: 'Original PaLM 2 text generation API. Migration to Gemini API required.',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/changelog',
  },
  {
    id: 'google-chat-bison-001',
    provider: 'Google',
    model: 'chat-bison-001',
    modelDisplay: 'PaLM 2 (chat-bison)',
    status: 'sunsetted',
    announcedDate: '2024-04-09',
    deprecationDate: '2024-08-15',
    sunsetDate: '2024-10-09',
    replacement: 'gemini-1.5-pro',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/changelog',
  },
  {
    id: 'google-gemini-1-0-pro',
    provider: 'Google',
    model: 'gemini-1.0-pro',
    modelDisplay: 'Gemini 1.0 Pro',
    status: 'sunsetted',
    deprecationDate: '2025-02-15',
    sunsetDate: '2025-02-15',
    replacement: 'gemini-1.5-pro',
    notes: 'First-generation Gemini API. Replaced by 1.5 family with longer context.',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/changelog',
  },

  // === Cohere ===
  {
    id: 'cohere-command',
    provider: 'Cohere',
    model: 'command',
    modelDisplay: 'Cohere Command (original)',
    status: 'sunsetted',
    announcedDate: '2024-09-26',
    deprecationDate: '2024-12-15',
    sunsetDate: '2025-03-15',
    replacement: 'command-r-plus',
    notes: 'Pre-RAG Command family. Replaced by Command R+ optimized for retrieval.',
    sourceUrl: 'https://docs.cohere.com/docs/deprecations',
  },

  // === DeepSeek ===
  {
    id: 'deepseek-chat-alias',
    provider: 'DeepSeek',
    model: 'deepseek-chat',
    status: 'sunsetted',
    announcedDate: '2026-07-14',
    deprecationDate: '2026-07-24',
    sunsetDate: '2026-07-24',
    replacement: 'deepseek-v4-pro',
    notes: 'Legacy alias stopped serving on 2026-07-24 at 15:59 UTC. Same base URL and key, so migration is a one-line model parameter change.',
    sourceUrl: 'https://api-docs.deepseek.com/updates',
  },
  {
    id: 'deepseek-reasoner-alias',
    provider: 'DeepSeek',
    model: 'deepseek-reasoner',
    status: 'sunsetted',
    announcedDate: '2026-07-14',
    deprecationDate: '2026-07-24',
    sunsetDate: '2026-07-24',
    replacement: 'deepseek-v4-flash',
    notes: 'Legacy alias stopped serving on 2026-07-24 at 15:59 UTC. Mapping trap: deepseek-reasoner routed to V4 Flash in thinking mode, not to the stronger V4 Pro, so a naive swap to deepseek-v4-pro changes cost and a swap to Flash changes nothing. Teams running heavy reasoning on the old alias should pick the tier deliberately.',
    sourceUrl: 'https://api-docs.deepseek.com/updates',
  },
];

export const MODEL_DEPRECATIONS_LAST_UPDATED = '2026-07-24';
