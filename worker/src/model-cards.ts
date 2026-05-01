/**
 * AI safety / model card aggregator.
 *
 * Pointers to published model cards, system cards, safety evaluations,
 * and red-team reports for frontier AI models. Different from
 * /api/models (capability + pricing) and /api/benchmarks (synthetic
 * scores). This is "what did the lab and third-party evaluators
 * publicly say about the model's risk profile."
 *
 * Editorial; refreshed on redeploy when new cards are published.
 *
 * Served at /api/model-cards (free, cached 600s).
 */

export interface ModelCardLink {
  /** Type of document. */
  type: 'system-card' | 'model-card' | 'safety-eval' | 'red-team-report' | 'incident-report' | 'preparedness-framework' | 'autonomy-eval';
  /** Title of the document. */
  title: string;
  /** Publisher of the document (lab, government body, third-party evaluator). */
  publisher: string;
  /** ISO date or YYYY-MM. */
  published: string;
  /** Direct URL. */
  url: string;
  /** One-line summary. */
  summary: string;
}

export interface ModelCard {
  id: string;
  /** Model the card describes. */
  model: string;
  /** Lab that built the model. */
  lab: string;
  /** Released date. */
  released: string;
  /** All published cards / evals / red-team reports for this model. */
  documents: ModelCardLink[];
  /** Vendor model page (canonical destination). */
  url: string;
}

export const MODEL_CARDS: ModelCard[] = [
  // ── Anthropic ─────────────────────────────────────
  {
    id: 'claude-opus-4-7',
    model: 'Claude Opus 4.7',
    lab: 'Anthropic',
    released: '2026-04-17',
    url: 'https://www.anthropic.com/news/claude-opus-4-7',
    documents: [
      { type: 'system-card', title: 'Claude Opus 4.7 System Card', publisher: 'Anthropic', published: '2026-04-17', url: 'https://www.anthropic.com/news/claude-opus-4-7', summary: 'Anthropic\'s system card. Capability evaluations, ASL-3 deployment safeguards, autonomous-replication tests, CBRN uplift evaluations.' },
      { type: 'autonomy-eval', title: 'METR Pre-Deployment Evaluation: Claude Opus 4.7', publisher: 'METR', published: '2026-04', url: 'https://metr.org', summary: 'Independent autonomy + long-horizon-task evaluation. Measures HCAST score against human-research-time baseline.' },
    ],
  },
  {
    id: 'claude-sonnet-4-6',
    model: 'Claude Sonnet 4.6',
    lab: 'Anthropic',
    released: '2026-02',
    url: 'https://www.anthropic.com/claude/sonnet',
    documents: [
      { type: 'system-card', title: 'Claude Sonnet 4.6 System Card', publisher: 'Anthropic', published: '2026-02', url: 'https://www.anthropic.com/news/claude-sonnet-4-6', summary: 'Sonnet 4.6 system card. ASL-2 deployment, agentic-coding evaluations, computer-use safety considerations.' },
      { type: 'red-team-report', title: 'AISI Pre-Deployment Test: Claude Sonnet 4.6', publisher: 'UK AI Safety Institute', published: '2026-02', url: 'https://www.aisi.gov.uk', summary: 'UK AISI red-team across cyber, biosecurity, autonomous-system uplift dimensions.' },
    ],
  },

  // ── OpenAI ────────────────────────────────────────
  {
    id: 'gpt-5.5',
    model: 'GPT-5.5',
    lab: 'OpenAI',
    released: '2026-04',
    url: 'https://openai.com/index/gpt-5-5/',
    documents: [
      { type: 'system-card', title: 'GPT-5.5 System Card', publisher: 'OpenAI', published: '2026-04', url: 'https://openai.com/index/gpt-5-5-system-card/', summary: 'OpenAI system card. Preparedness Framework risk levels (Cybersecurity, CBRN, Persuasion, Model Autonomy). Deployment mitigations.' },
      { type: 'red-team-report', title: 'Apollo Research: Scheming Capabilities of GPT-5.5', publisher: 'Apollo Research', published: '2026-04', url: 'https://www.apolloresearch.ai', summary: 'Independent evaluation of in-context scheming, sandbagging, and goal-misalignment behaviors.' },
      { type: 'preparedness-framework', title: 'OpenAI Preparedness Framework v2', publisher: 'OpenAI', published: '2025-04', url: 'https://openai.com/safety/preparedness/', summary: 'OpenAI\'s framework for evaluating frontier-model risk levels. Defines tracked risk categories and deployment thresholds.' },
    ],
  },
  {
    id: 'gpt-4o',
    model: 'GPT-4o',
    lab: 'OpenAI',
    released: '2024-05',
    url: 'https://openai.com/index/hello-gpt-4o/',
    documents: [
      { type: 'system-card', title: 'GPT-4o System Card', publisher: 'OpenAI', published: '2024-08', url: 'https://openai.com/index/gpt-4o-system-card/', summary: 'GPT-4o system card. Voice mode safety, Preparedness scorecard, third-party red-teaming.' },
      { type: 'red-team-report', title: 'Apollo Research: GPT-4o Pre-Deployment Evaluation', publisher: 'Apollo Research', published: '2024-08', url: 'https://www.apolloresearch.ai', summary: 'Apollo\'s pre-deployment scheming-capability evaluation.' },
    ],
  },

  // ── Google DeepMind ───────────────────────────────
  {
    id: 'gemini-2.5-pro',
    model: 'Gemini 2.5 Pro',
    lab: 'Google DeepMind',
    released: '2026-01',
    url: 'https://deepmind.google/technologies/gemini/',
    documents: [
      { type: 'model-card', title: 'Gemini 2.5 Model Card', publisher: 'Google DeepMind', published: '2026-01', url: 'https://storage.googleapis.com/deepmind-media/gemini/gemini_v2_5_report.pdf', summary: 'Gemini 2.5 Pro model card. Capability evals, Frontier Safety Framework risk assessment, dangerous-capability evaluations.' },
      { type: 'preparedness-framework', title: 'Frontier Safety Framework v2', publisher: 'Google DeepMind', published: '2025-02', url: 'https://deepmind.google/about/responsibility-safety/', summary: 'DeepMind\'s framework for evaluating Critical Capability Levels. Deployment + security mitigations.' },
    ],
  },

  // ── Meta ──────────────────────────────────────────
  {
    id: 'llama-4-maverick',
    model: 'Llama 4 Maverick',
    lab: 'Meta',
    released: '2026-04',
    url: 'https://ai.meta.com/blog/llama-4/',
    documents: [
      { type: 'model-card', title: 'Llama 4 Maverick Model Card', publisher: 'Meta', published: '2026-04', url: 'https://ai.meta.com/blog/llama-4/', summary: 'Llama 4 model card. Trust + safety evaluations, MLSafe and CyberSecEval scores, responsible-use guidance.' },
    ],
  },
  {
    id: 'llama-3.1-405b',
    model: 'Llama 3.1 405B',
    lab: 'Meta',
    released: '2024-07',
    url: 'https://ai.meta.com/blog/meta-llama-3-1/',
    documents: [
      { type: 'model-card', title: 'Llama 3.1 Model Card', publisher: 'Meta', published: '2024-07', url: 'https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md', summary: 'Llama 3.1 model card with capability + safety evaluations across 8B, 70B, 405B variants.' },
      { type: 'safety-eval', title: 'CyberSecEval 3 (Llama 3.1)', publisher: 'Meta', published: '2024-07', url: 'https://meta-llama.github.io/PurpleLlama/CyberSecEval/', summary: 'Cybersecurity evaluation suite. Code security, prompt injection, malicious-code-generation tests.' },
    ],
  },

  // ── DeepSeek ──────────────────────────────────────
  {
    id: 'deepseek-v4-pro',
    model: 'DeepSeek V4 Pro',
    lab: 'DeepSeek',
    released: '2026-04',
    url: 'https://github.com/deepseek-ai/DeepSeek-V4',
    documents: [
      { type: 'model-card', title: 'DeepSeek V4 Technical Report', publisher: 'DeepSeek', published: '2026-04', url: 'https://github.com/deepseek-ai/DeepSeek-V4/blob/main/DeepSeek_V4.pdf', summary: 'DeepSeek V4 paper. Architecture, training, inference deployment, plus a brief safety evaluation section.' },
    ],
  },
];

export const MODEL_CARDS_LAST_UPDATED = '2026-04-30';

/**
 * Aggregate cross-model safety/governance documents not tied to a single model.
 */
export interface SafetyDoc {
  id: string;
  title: string;
  publisher: string;
  published: string;
  url: string;
  summary: string;
  type: 'framework' | 'incident-database' | 'standard' | 'evaluation-suite';
}

export const SAFETY_DOCS: SafetyDoc[] = [
  { id: 'ai-incident-db', title: 'AI Incident Database', publisher: 'Responsible AI Collaborative', published: 'ongoing', url: 'https://incidentdatabase.ai', summary: 'Public catalog of harms caused by AI systems. 1k+ incident reports indexed by severity, sector, and AI system involved.', type: 'incident-database' },
  { id: 'oecd-ai-incidents', title: 'OECD AI Incidents Monitor', publisher: 'OECD', published: 'ongoing', url: 'https://oecd.ai/en/incidents', summary: 'OECD\'s monitor of AI incidents and hazards reported in news media. Government-grade taxonomy.', type: 'incident-database' },
  { id: 'mlsafe', title: 'MLCommons AILuminate Safety Benchmark', publisher: 'MLCommons', published: '2024-12', url: 'https://mlcommons.org/benchmarks/ai-safety/', summary: 'Industry-consortium safety benchmark. Tests harmful-content generation across 12 hazard categories.', type: 'evaluation-suite' },
  { id: 'aisi-evals', title: 'UK AI Safety Institute Evaluations', publisher: 'UK AISI', published: 'ongoing', url: 'https://www.aisi.gov.uk', summary: 'UK government pre-deployment red-team across cyber, biosecurity, autonomous-system, and political-influence dimensions.', type: 'evaluation-suite' },
  { id: 'us-aisi', title: 'US AI Safety Institute', publisher: 'NIST AISI', published: '2024', url: 'https://www.nist.gov/aisi', summary: 'US government AI safety institute. Voluntary pre-deployment testing agreements with major labs (OpenAI, Anthropic).', type: 'standard' },
  { id: 'anthropic-rsp', title: 'Anthropic Responsible Scaling Policy', publisher: 'Anthropic', published: '2024-10', url: 'https://www.anthropic.com/news/announcing-our-updated-responsible-scaling-policy', summary: 'Anthropic\'s framework defining AI Safety Level (ASL) thresholds and corresponding deployment safeguards.', type: 'framework' },
  { id: 'openai-prep', title: 'OpenAI Preparedness Framework v2', publisher: 'OpenAI', published: '2025-04', url: 'https://openai.com/safety/preparedness/', summary: 'OpenAI\'s framework for tracking + mitigating frontier-model risks across Cybersecurity, CBRN, Persuasion, Model Autonomy.', type: 'framework' },
  { id: 'frontier-safety-framework', title: 'Google DeepMind Frontier Safety Framework v2', publisher: 'Google DeepMind', published: '2025-02', url: 'https://deepmind.google/about/responsibility-safety/', summary: 'DeepMind\'s framework defining Critical Capability Levels and corresponding deployment mitigations.', type: 'framework' },
  { id: 'metr-autonomy-eval', title: 'METR Autonomy Evaluation Guide', publisher: 'METR', published: '2024', url: 'https://metr.github.io/autonomy-evals-guide/', summary: 'Framework for evaluating long-horizon agentic capability against human-time-to-complete baselines (HCAST).', type: 'evaluation-suite' },
  { id: 'apollo-evals', title: 'Apollo Research Evaluations', publisher: 'Apollo Research', published: 'ongoing', url: 'https://www.apolloresearch.ai', summary: 'Independent evaluator focused on in-context scheming, sandbagging, deception, and goal-misalignment behaviors.', type: 'evaluation-suite' },
];
