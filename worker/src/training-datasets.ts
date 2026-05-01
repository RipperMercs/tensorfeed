/**
 * AI training datasets registry.
 *
 * Pretraining corpora, instruction-tuning datasets, and DPO/RLHF
 * datasets that the open-source community uses to train and fine-tune
 * AI models. Each entry has size, license, source, what stage of
 * training it targets, and the upstream URL.
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/training-datasets (free, cached 600s).
 */

export interface TrainingDataset {
  id: string;
  name: string;
  publisher: string;
  /** What stage of training this targets. */
  stage: 'pretraining' | 'instruction-tuning' | 'dpo' | 'rlhf' | 'continued-pretraining' | 'multimodal';
  /** Format: text, code, multilingual, multimodal, conversation. */
  contentType: string;
  /** Approx token count, formatted (e.g. "15T", "1.5T", "60B"). */
  tokens: string;
  /** Approx item count where useful (number of conversations or pairs). */
  items: string | null;
  /** License (CC-BY, ODC-BY, MIT, Apache-2.0, custom, etc). */
  license: string;
  /** Languages covered (English-only, multilingual count). */
  languages: string;
  /** Released or last-updated date. */
  released: string;
  /** Hugging Face URL or homepage. */
  url: string;
  /** Notable strengths or known constraints. */
  notes: string;
}

export const TRAINING_DATASETS: TrainingDataset[] = [
  // ── Pretraining corpora ──────────────────────────────────
  {
    id: 'fineweb',
    name: 'FineWeb',
    publisher: 'Hugging Face',
    stage: 'pretraining',
    contentType: 'web text',
    tokens: '15T',
    items: '24B documents',
    license: 'ODC-BY-1.0',
    languages: 'English',
    released: '2024-04',
    url: 'https://huggingface.co/datasets/HuggingFaceFW/fineweb',
    notes: 'Refined CommonCrawl with aggressive quality filtering. Replaces RedPajama-1T as the de facto open pretraining corpus. The dataset behind most 2024-2025 open base models.',
  },
  {
    id: 'fineweb-edu',
    name: 'FineWeb-Edu',
    publisher: 'Hugging Face',
    stage: 'pretraining',
    contentType: 'educational web text',
    tokens: '1.3T',
    items: '1.3B documents',
    license: 'ODC-BY-1.0',
    languages: 'English',
    released: '2024-05',
    url: 'https://huggingface.co/datasets/HuggingFaceFW/fineweb-edu',
    notes: 'FineWeb subset filtered to educational content via Llama-3-70B classifier. Smaller models trained on FineWeb-Edu beat counterparts trained on full FineWeb at the same compute.',
  },
  {
    id: 'common-crawl',
    name: 'Common Crawl',
    publisher: 'Common Crawl Foundation',
    stage: 'pretraining',
    contentType: 'web text',
    tokens: 'petabyte-scale raw',
    items: '250B+ webpages',
    license: 'CC-0',
    languages: 'multilingual (200+)',
    released: 'monthly since 2008',
    url: 'https://commoncrawl.org',
    notes: 'The raw web crawl every other web pretraining dataset is built on. Released monthly. Most labs filter it heavily before training.',
  },
  {
    id: 'redpajama-v2',
    name: 'RedPajama v2',
    publisher: 'Together AI',
    stage: 'pretraining',
    contentType: 'web text',
    tokens: '30T',
    items: '100B+ documents',
    license: 'MIT (filters), CC-BY (subsets)',
    languages: 'English, German, French, Spanish, Italian',
    released: '2023-10',
    url: 'https://huggingface.co/datasets/togethercomputer/RedPajama-Data-V2',
    notes: 'Together AI\'s open reproduction of LLaMA-style pretraining data. v2 ships with 40+ pre-computed quality filters so labs can apply their own thresholds.',
  },
  {
    id: 'the-pile',
    name: 'The Pile',
    publisher: 'EleutherAI',
    stage: 'pretraining',
    contentType: 'mixed (web + books + papers + code)',
    tokens: '825GB / 300B',
    items: '22 sub-corpora',
    license: 'mixed (per-subcorpus)',
    languages: 'English-focused',
    released: '2020',
    url: 'https://pile.eleuther.ai',
    notes: 'The original open pretraining corpus. Largely superseded by FineWeb / RedPajama for new training runs but still cited. Note: Books3 subset removed for copyright.',
  },
  {
    id: 'dolma',
    name: 'Dolma',
    publisher: 'Allen AI (AI2)',
    stage: 'pretraining',
    contentType: 'web + code + books + papers',
    tokens: '3T',
    items: 'mixed',
    license: 'AI2 ImpACT (Medium Risk)',
    languages: 'English',
    released: '2024-02',
    url: 'https://huggingface.co/datasets/allenai/dolma',
    notes: 'AI2\'s open pretraining corpus (the dataset behind OLMo). Documents source provenance and offers reproducible filters. The most-academically-cited open pretraining set.',
  },
  {
    id: 'refinedweb',
    name: 'RefinedWeb',
    publisher: 'TII',
    stage: 'pretraining',
    contentType: 'web text',
    tokens: '5T',
    items: '600M documents',
    license: 'ODC-BY-1.0',
    languages: 'English',
    released: '2023-06',
    url: 'https://huggingface.co/datasets/tiiuae/falcon-refinedweb',
    notes: 'Behind the Falcon series. Aggressive deduplication and filtering. Older but cleaner than CommonCrawl raw.',
  },
  {
    id: 'the-stack-v2',
    name: 'The Stack v2',
    publisher: 'BigCode (HuggingFace + ServiceNow)',
    stage: 'pretraining',
    contentType: 'source code',
    tokens: '67TB / 17B files',
    items: '17B files across 600+ languages',
    license: 'permissive only (filtered)',
    languages: '600+ programming languages',
    released: '2024-02',
    url: 'https://huggingface.co/datasets/bigcode/the-stack-v2',
    notes: 'The reference open code-pretraining corpus. v2 is sourced from Software Heritage, dedup\'d at file and near-dup level. Behind StarCoder 2 and most open code models.',
  },
  {
    id: 'starcoderdata',
    name: 'StarCoderData',
    publisher: 'BigCode',
    stage: 'pretraining',
    contentType: 'source code + jupyter + GitHub issues',
    tokens: '305B',
    items: '86 languages',
    license: 'mixed permissive',
    languages: '86 programming languages',
    released: '2023-05',
    url: 'https://huggingface.co/datasets/bigcode/starcoderdata',
    notes: 'Pre-cleaned subset of The Stack used to train StarCoder. Smaller than The Stack v2 but easier to work with for small-scale code-model experiments.',
  },

  // ── Instruction-tuning ───────────────────────────────────
  {
    id: 'tulu-3-sft-mix',
    name: 'Tulu 3 SFT Mixture',
    publisher: 'Allen AI',
    stage: 'instruction-tuning',
    contentType: 'instruction-response pairs',
    tokens: null as unknown as string,
    items: '939K instructions',
    license: 'ODC-BY-1.0',
    languages: 'English',
    released: '2024-11',
    url: 'https://huggingface.co/datasets/allenai/tulu-3-sft-mixture',
    notes: 'Tulu 3 is the strongest open post-training recipe in 2024-2025. The SFT mixture combines OpenAssistant, ShareGPT, math reasoning, code instructions, and persona-aligned prompts.',
  },
  {
    id: 'open-hermes-2.5',
    name: 'OpenHermes 2.5',
    publisher: 'Teknium / Nous Research',
    stage: 'instruction-tuning',
    contentType: 'multi-turn conversations',
    tokens: null as unknown as string,
    items: '1M conversations',
    license: 'mixed (per-source)',
    languages: 'English',
    released: '2023-12',
    url: 'https://huggingface.co/datasets/teknium/OpenHermes-2.5',
    notes: 'Aggregated from GPT-4 outputs, AiroborosLM, ShareGPT, and others. The dataset behind Nous Hermes and many community fine-tunes.',
  },
  {
    id: 'glaive-function-calling',
    name: 'Glaive Function Calling v2',
    publisher: 'Glaive AI',
    stage: 'instruction-tuning',
    contentType: 'function-calling traces',
    tokens: null as unknown as string,
    items: '113K examples',
    license: 'Apache-2.0',
    languages: 'English',
    released: '2023-12',
    url: 'https://huggingface.co/datasets/glaiveai/glaive-function-calling-v2',
    notes: 'Synthetic function-calling traces. The most-cited dataset for fine-tuning open models to do reliable JSON tool use.',
  },
  {
    id: 'open-orca',
    name: 'OpenOrca',
    publisher: 'Open Orca team',
    stage: 'instruction-tuning',
    contentType: 'reasoning traces',
    tokens: null as unknown as string,
    items: '4.2M GPT-4 + 0.7M GPT-3.5 examples',
    license: 'MIT',
    languages: 'English',
    released: '2023-07',
    url: 'https://huggingface.co/datasets/Open-Orca/OpenOrca',
    notes: 'Reproduction of Microsoft Orca paper. Augments FLAN tasks with GPT-4 chain-of-thought traces. Strong base for math/reasoning fine-tunes.',
  },
  {
    id: 'agent-instruct',
    name: 'AgentInstruct',
    publisher: 'Microsoft Research',
    stage: 'instruction-tuning',
    contentType: 'agentic task traces',
    tokens: null as unknown as string,
    items: '25M agent-shaped instruction pairs',
    license: 'CDLA-Permissive-2.0',
    languages: 'English',
    released: '2024-07',
    url: 'https://huggingface.co/datasets/microsoft/AgentInstruct-1M-v1',
    notes: 'Synthetic dataset for agent training. Multi-step tool-use, reading comprehension, code, RAG, brain teasers, content creation. Behind Orca-3 and used in Phi-3.5.',
  },

  // ── DPO / preference data ────────────────────────────────
  {
    id: 'ultrafeedback',
    name: 'UltraFeedback',
    publisher: 'OpenBMB',
    stage: 'dpo',
    contentType: 'preference pairs',
    tokens: null as unknown as string,
    items: '64K instructions x 4 model responses',
    license: 'MIT',
    languages: 'English',
    released: '2023-10',
    url: 'https://huggingface.co/datasets/openbmb/UltraFeedback',
    notes: 'Most-used DPO dataset for open models. GPT-4 ranks 4 candidate responses per prompt across helpfulness, honesty, instruction-following, truthfulness.',
  },
  {
    id: 'tulu-3-pref',
    name: 'Tulu 3 Preference Mixture',
    publisher: 'Allen AI',
    stage: 'dpo',
    contentType: 'preference pairs',
    tokens: null as unknown as string,
    items: '270K preference pairs',
    license: 'ODC-BY-1.0',
    languages: 'English',
    released: '2024-11',
    url: 'https://huggingface.co/datasets/allenai/llama-3.1-tulu-3-70b-preference-mixture',
    notes: 'Curated preference pairs for the Tulu 3 DPO stage. The strongest open preference data for post-training in late 2024.',
  },
  {
    id: 'helpsteer-2',
    name: 'HelpSteer 2',
    publisher: 'NVIDIA',
    stage: 'dpo',
    contentType: 'preference pairs (5-attribute)',
    tokens: null as unknown as string,
    items: '21K conversations',
    license: 'CC-BY-4.0',
    languages: 'English',
    released: '2024-06',
    url: 'https://huggingface.co/datasets/nvidia/HelpSteer2',
    notes: 'NVIDIA preference data labeled across helpfulness, correctness, coherence, complexity, verbosity. Strong for multi-attribute reward modeling.',
  },

  // ── Multimodal pretraining ──────────────────────────────
  {
    id: 'laion-5b',
    name: 'LAION-5B',
    publisher: 'LAION',
    stage: 'multimodal',
    contentType: 'image-text pairs',
    tokens: null as unknown as string,
    items: '5.85B image-text pairs',
    license: 'CC-BY-4.0',
    languages: 'multilingual',
    released: '2022-03',
    url: 'https://laion.ai/blog/laion-5b/',
    notes: 'Largest open image-text dataset. Behind Stable Diffusion and many open image models. Original release was withdrawn for review; v2 reissued 2023.',
  },
  {
    id: 'datacomp-1b',
    name: 'DataComp-1B',
    publisher: 'DataComp',
    stage: 'multimodal',
    contentType: 'image-text pairs',
    tokens: null as unknown as string,
    items: '1.4B filtered pairs',
    license: 'mixed',
    languages: 'multilingual',
    released: '2023',
    url: 'https://www.datacomp.ai',
    notes: 'Filtered subset of CommonPool. Reproducible filtering recipes are part of the contribution. Behind several open CLIP-class models trained in 2024.',
  },
];

export const TRAINING_DATASETS_LAST_UPDATED = '2026-04-30';
