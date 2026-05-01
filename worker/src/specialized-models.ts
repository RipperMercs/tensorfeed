/**
 * Domain-specialized AI models catalog.
 *
 * Production AI models specialized for a vertical: code, medical,
 * legal, finance, music, 3D, retrieval-specialized, etc. Different
 * from /api/models (general chat) and /api/multimodal (image / video /
 * TTS / STT). This is the "I need a model good at X domain" surface.
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/specialized-models (free, cached 600s).
 */

export type Domain = 'code' | 'medical' | 'legal' | 'finance' | 'music' | '3d' | 'retrieval' | 'science';

export interface SpecializedModel {
  id: string;
  name: string;
  publisher: string;
  domain: Domain;
  /** Approx parameter count, formatted. */
  params: string;
  /** Pricing summary or "open weights, free to self-host". */
  pricing: string;
  /** Whether weights are publicly available. */
  openWeights: boolean;
  license: string;
  released: string;
  /** Notable benchmark (key evaluation result for this domain). */
  benchmark: string | null;
  /** Capability tags. */
  capabilities: string[];
  /** Where to access. */
  url: string;
  /** Editorial summary. */
  notes: string;
}

export const SPECIALIZED_MODELS: SpecializedModel[] = [
  // ── Code ──────────────────────────────────────────────
  {
    id: 'codestral-25.01',
    name: 'Codestral 25.01',
    publisher: 'Mistral',
    domain: 'code',
    params: '22B',
    pricing: '$0.30 input / $0.90 output per 1M tokens via la Plateforme',
    openWeights: true,
    license: 'Mistral Non-Production License',
    released: '2025-01',
    benchmark: 'HumanEval 86.6% pass@1',
    capabilities: ['code completion', 'fill-in-the-middle', '80+ languages', '256k context'],
    url: 'https://mistral.ai/news/codestral-2501/',
    notes: 'Mistral\'s flagship code model. 256k context, 80+ programming languages. License is non-commercial without a Mistral subscription.',
  },
  {
    id: 'deepseek-coder-v3',
    name: 'DeepSeek Coder V3',
    publisher: 'DeepSeek',
    domain: 'code',
    params: '236B MoE / 21B active',
    pricing: '$0.14 input / $0.28 output per 1M tokens via DeepSeek API',
    openWeights: true,
    license: 'MIT',
    released: '2025-12',
    benchmark: 'HumanEval 90.2%, SWE-Bench Verified 65.4%',
    capabilities: ['code generation', 'cross-language', 'repository-level', '128k context'],
    url: 'https://github.com/deepseek-ai/DeepSeek-Coder-V3',
    notes: 'MIT-licensed frontier code model. Cheapest code-specialized API in 2026. Strong on repo-level code understanding.',
  },
  {
    id: 'qwen-coder-2.5-32b',
    name: 'Qwen 2.5 Coder 32B',
    publisher: 'Alibaba',
    domain: 'code',
    params: '32B',
    pricing: 'Open weights, free to self-host',
    openWeights: true,
    license: 'Apache-2.0',
    released: '2024-11',
    benchmark: 'HumanEval 92.7%, MBPP 90.2%',
    capabilities: ['code completion', 'code repair', '40+ languages', '128k context'],
    url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct',
    notes: 'Apache-2.0 dense code model that punches above its parameter count. Strong default for self-hosted code assistant agents.',
  },
  {
    id: 'starcoder-2-15b',
    name: 'StarCoder 2 15B',
    publisher: 'BigCode',
    domain: 'code',
    params: '15B',
    pricing: 'Open weights, free to self-host',
    openWeights: true,
    license: 'BigCode OpenRAIL-M',
    released: '2024-02',
    benchmark: 'HumanEval 46.3% pass@1',
    capabilities: ['code completion', 'fill-in-the-middle', '600+ languages', '16k context'],
    url: 'https://huggingface.co/bigcode/starcoder2-15b',
    notes: 'Reproducible: trained on The Stack v2 (open dataset). Best fit for academic / regulated code-completion deployments.',
  },

  // ── Medical ───────────────────────────────────────────
  {
    id: 'med-gemini',
    name: 'Med-Gemini',
    publisher: 'Google',
    domain: 'medical',
    params: 'undisclosed',
    pricing: 'Cloud Healthcare API; usage-based',
    openWeights: false,
    license: 'Proprietary',
    released: '2024-04',
    benchmark: 'MedQA-USMLE 91.1%',
    capabilities: ['clinical Q&A', 'medical imaging', 'EHR summarization', 'long-context records'],
    url: 'https://research.google/blog/advancing-medical-ai-with-med-gemini/',
    notes: 'Google\'s flagship medical LLM. Multimodal (radiology, dermatology). Strongest published MedQA score. Available via Google Cloud Healthcare APIs.',
  },
  {
    id: 'meditron-3',
    name: 'Meditron 3 70B',
    publisher: 'EPFL',
    domain: 'medical',
    params: '70B',
    pricing: 'Open weights, free to self-host',
    openWeights: true,
    license: 'Llama 3 Community License',
    released: '2025-04',
    benchmark: 'MedQA-USMLE 78.6%, USMLE step 1-3 ~85%',
    capabilities: ['clinical Q&A', 'literature synthesis', 'differential diagnosis'],
    url: 'https://huggingface.co/epfl-llm/meditron-70b',
    notes: 'EPFL\'s open medical LLM, continued pretraining of Llama 3. The strongest open-weights medical model. Used as research baseline for clinical-AI evaluation.',
  },
  {
    id: 'biomistral',
    name: 'BioMistral 7B',
    publisher: 'BioMistral collaboration',
    domain: 'medical',
    params: '7B',
    pricing: 'Open weights, free to self-host',
    openWeights: true,
    license: 'Apache-2.0',
    released: '2024-02',
    benchmark: 'MedQA-USMLE 49.6%',
    capabilities: ['biomedical Q&A', 'drug interactions', 'literature retrieval'],
    url: 'https://huggingface.co/BioMistral/BioMistral-7B',
    notes: 'Mistral 7B continued-pretrained on PubMed. Apache-licensed; small enough to self-host on a single consumer GPU. Good base for medical RAG agents.',
  },

  // ── Legal ─────────────────────────────────────────────
  {
    id: 'saul-lm-141b',
    name: 'SaulLM 141B',
    publisher: 'Equall',
    domain: 'legal',
    params: '141B (Mixtral-based)',
    pricing: 'Open weights, free to self-host',
    openWeights: true,
    license: 'MIT',
    released: '2024-07',
    benchmark: 'LegalBench 71.3%',
    capabilities: ['legal Q&A', 'contract review', 'case law summarization', 'multilingual legal'],
    url: 'https://huggingface.co/Equall/SaulLM-141B-Instruct',
    notes: 'Largest open legal LLM. Continued pretraining of Mixtral 8x22B on legal corpora. Strong on EU + US case law.',
  },
  {
    id: 'saul-lm-7b',
    name: 'SaulLM 7B',
    publisher: 'Equall',
    domain: 'legal',
    params: '7B',
    pricing: 'Open weights, free to self-host',
    openWeights: true,
    license: 'MIT',
    released: '2024-03',
    benchmark: 'LegalBench 60.7%',
    capabilities: ['legal Q&A', 'contract clauses', 'case briefing'],
    url: 'https://huggingface.co/Equall/Saul-7B-Base',
    notes: 'Smaller SaulLM; runs on consumer GPU at Q4. Solid base for legal RAG agents.',
  },

  // ── Finance ───────────────────────────────────────────
  {
    id: 'fingpt-v3',
    name: 'FinGPT v3',
    publisher: 'AI4Finance Foundation',
    domain: 'finance',
    params: '7B-13B (LoRA on Llama)',
    pricing: 'Open weights, free to self-host',
    openWeights: true,
    license: 'MIT',
    released: '2024-08',
    benchmark: 'Financial sentiment FPB ~88%',
    capabilities: ['financial sentiment', 'earnings call analysis', 'news classification', 'forecasting'],
    url: 'https://github.com/AI4Finance-Foundation/FinGPT',
    notes: 'Open finance models maintained by AI4Finance Foundation. LoRA adapters on Llama 3.x base. Best fit for sentiment + classification rather than reasoning.',
  },
  {
    id: 'bloomberggpt',
    name: 'BloombergGPT',
    publisher: 'Bloomberg',
    domain: 'finance',
    params: '50B',
    pricing: 'Internal Bloomberg use only (not public)',
    openWeights: false,
    license: 'Proprietary',
    released: '2023-03',
    benchmark: 'FPB sentiment ~85%',
    capabilities: ['financial NER', 'sentiment', 'document classification', 'earnings analysis'],
    url: 'https://www.bloomberg.com/company/press/bloomberggpt-50-billion-parameter-llm-tuned-finance/',
    notes: 'Bloomberg\'s in-house finance LLM. Trained on a private 363B-token finance corpus. Reference for "what does a finance-specialized base model look like" but not externally usable.',
  },

  // ── Music / audio ─────────────────────────────────────
  {
    id: 'suno-v4',
    name: 'Suno v4',
    publisher: 'Suno',
    domain: 'music',
    params: 'undisclosed',
    pricing: 'Subscription from $10/mo; API limited beta',
    openWeights: false,
    license: 'Proprietary',
    released: '2024-11',
    benchmark: null,
    capabilities: ['lyrics + music', 'genre control', 'instrumental', 'extend / remix'],
    url: 'https://suno.com',
    notes: 'Frontier music generation. v4 ships full-song generation up to 4 minutes with vocals. The default for music-gen agents that need polished output.',
  },
  {
    id: 'udio',
    name: 'Udio',
    publisher: 'Uncharted Labs',
    domain: 'music',
    params: 'undisclosed',
    pricing: 'Subscription from $10/mo',
    openWeights: false,
    license: 'Proprietary',
    released: '2024-04',
    benchmark: null,
    capabilities: ['music gen', 'extend', 'remix', 'lyrics or instrumental'],
    url: 'https://www.udio.com',
    notes: 'Suno competitor. Strong on instrumental quality and genre fidelity. Active legal contention with major labels in 2024-2026.',
  },
  {
    id: 'musicgen-large',
    name: 'MusicGen Large',
    publisher: 'Meta',
    domain: 'music',
    params: '3.3B',
    pricing: 'Open weights, free to self-host',
    openWeights: true,
    license: 'CC-BY-NC-4.0',
    released: '2023-06',
    benchmark: null,
    capabilities: ['instrumental music gen', 'melody conditioning', 'audio continuation'],
    url: 'https://huggingface.co/facebook/musicgen-large',
    notes: 'Open instrumental music model. Non-commercial license. Lower fidelity than Suno/Udio but the strongest open option for research.',
  },
  {
    id: 'stable-audio-2',
    name: 'Stable Audio 2.0',
    publisher: 'Stability AI',
    domain: 'music',
    params: 'undisclosed',
    pricing: 'API from $0.10 per 30s; free tier',
    openWeights: false,
    license: 'Stability commercial',
    released: '2024-04',
    benchmark: null,
    capabilities: ['music + SFX gen', '3min clips', 'audio-to-audio', 'instrumental focus'],
    url: 'https://stability.ai/news/stable-audio-2-0',
    notes: 'Stability\'s music + sound-effect model. Designed for sound design workflows; produces stems and SFX more cleanly than Suno.',
  },

  // ── 3D ────────────────────────────────────────────────
  {
    id: 'trellis',
    name: 'TRELLIS',
    publisher: 'Microsoft Research',
    domain: '3d',
    params: '2B',
    pricing: 'Open weights, free to self-host',
    openWeights: true,
    license: 'MIT',
    released: '2024-12',
    benchmark: null,
    capabilities: ['image to 3D', 'text to 3D', 'mesh + gaussian splat output', 'PBR materials'],
    url: 'https://github.com/microsoft/TRELLIS',
    notes: 'Microsoft Research 3D generative model. State-of-the-art image-to-3D quality. Outputs textured mesh, Gaussian splats, or radiance fields.',
  },
  {
    id: 'hunyuan3d-2',
    name: 'Hunyuan3D-2',
    publisher: 'Tencent',
    domain: '3d',
    params: '4.5B (texture model)',
    pricing: 'Open weights, free to self-host',
    openWeights: true,
    license: 'Tencent Hunyuan License',
    released: '2025-01',
    benchmark: null,
    capabilities: ['image to 3D mesh', 'PBR texture generation', 'animation rigging'],
    url: 'https://huggingface.co/tencent/Hunyuan3D-2',
    notes: 'Tencent\'s open 3D model. Two-stage: shape generation + texture model. Strongest open 3D output quality in early 2025.',
  },

  // ── Retrieval-specialized (beyond plain embeddings) ─
  {
    id: 'colpali',
    name: 'ColPali',
    publisher: 'ILLUIN Technology',
    domain: 'retrieval',
    params: '3B (PaliGemma-based)',
    pricing: 'Open weights, free to self-host',
    openWeights: true,
    license: 'Apache-2.0',
    released: '2024-07',
    benchmark: 'ViDoRe benchmark leader',
    capabilities: ['vision-document retrieval', 'late interaction', 'PDF / chart understanding'],
    url: 'https://huggingface.co/vidore/colpali',
    notes: 'Vision-document retrieval model. Embeds whole-page images directly, skipping OCR. Strong on PDFs with tables, charts, scientific figures.',
  },
  {
    id: 'splade-v3',
    name: 'SPLADE v3',
    publisher: 'Naver Labs',
    domain: 'retrieval',
    params: '110M',
    pricing: 'Open weights, free to self-host',
    openWeights: true,
    license: 'CC-BY-NC-4.0',
    released: '2024-03',
    benchmark: 'BEIR avg ~50.5',
    capabilities: ['sparse retrieval', 'BM25-compatible inverted index', 'lexical match expansion'],
    url: 'https://huggingface.co/naver/splade-v3',
    notes: 'Learned sparse retrieval. Drops into existing inverted-index infra (Elasticsearch, Lucene) without dense vector overhead. Strong hybrid-search complement to dense embeddings.',
  },
];

export const SPECIALIZED_MODELS_LAST_UPDATED = '2026-04-30';
