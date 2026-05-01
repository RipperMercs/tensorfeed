/**
 * Public AI leaderboards aggregator.
 *
 * Pointers to live, public AI leaderboards across domains. Different
 * from /api/benchmark-registry (which is the eval suites themselves)
 * and /api/usage-rankings (real OpenRouter traffic). This is the meta
 * catalog of where to find live model rankings.
 *
 * Editorial; refreshed on redeploy.
 *
 * Served at /api/public-leaderboards (free, cached 600s).
 */

export interface PublicLeaderboard {
  id: string;
  name: string;
  publisher: string;
  /** What is being ranked. */
  scope: string;
  /** Update cadence. */
  updateCadence: string;
  /** Score type: Elo, accuracy, WER, etc. */
  scoreType: string;
  /** What domain this covers. */
  domain: 'general' | 'code' | 'math' | 'reasoning' | 'multimodal' | 'agent' | 'safety' | 'voice' | 'image' | 'video' | 'long-context' | 'open-models';
  /** Whether the leaderboard is live (auto-updating) or editorial. */
  live: boolean;
  /** API or scrape availability. */
  hasAPI: boolean;
  /** Direct URL. */
  url: string;
  /** What makes this leaderboard distinct. */
  notes: string;
}

export const PUBLIC_LEADERBOARDS: PublicLeaderboard[] = [
  // ── General capability ──────────────────────────────
  {
    id: 'lmsys-arena',
    name: 'LMSYS Chatbot Arena',
    publisher: 'LMArena',
    scope: 'General chat capability across all major models',
    updateCadence: 'continuous (live)',
    scoreType: 'Elo (human pairwise vote)',
    domain: 'general',
    live: true,
    hasAPI: false,
    url: 'https://lmarena.ai',
    notes: 'The most-cited model ranking. 1M+ human pairwise votes. Multiple categories: hard prompts, coding, multi-turn, vision, etc. The standard \'is this model good\' answer in 2024-2026.',
  },
  {
    id: 'artificial-analysis',
    name: 'Artificial Analysis',
    publisher: 'Artificial Analysis',
    scope: 'Quality + price + latency across models and providers',
    updateCadence: 'daily',
    scoreType: 'Composite quality index',
    domain: 'general',
    live: true,
    hasAPI: true,
    url: 'https://artificialanalysis.ai',
    notes: 'Independent benchmark + market-data aggregator. Synthesizes capability scores, latency measurements, and price into one Quality Index. Great cross-provider comparison.',
  },
  {
    id: 'hf-open-llm',
    name: 'Open LLM Leaderboard',
    publisher: 'Hugging Face',
    scope: 'Open-weights models across 6 academic benchmarks (IFEval, BBH, MATH, GPQA, MUSR, MMLU-Pro)',
    updateCadence: 'continuous (auto-eval)',
    scoreType: 'Average of normalized benchmarks',
    domain: 'open-models',
    live: true,
    hasAPI: true,
    url: 'https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard',
    notes: 'The largest auto-evaluation pipeline for open models. Anyone can submit; HuggingFace runs the evals. Filters by license, parameter count, model type.',
  },

  // ── Code ────────────────────────────────────────────
  {
    id: 'swebench-verified',
    name: 'SWE-bench Verified Leaderboard',
    publisher: 'SWE-bench team',
    scope: 'Coding agents on 500 real GitHub issues',
    updateCadence: 'as submissions land',
    scoreType: '% issues resolved',
    domain: 'code',
    live: true,
    hasAPI: false,
    url: 'https://www.swebench.com',
    notes: 'The benchmark every coding-agent product reports against. Frontier ~75% as of 2026. TensorFeed mirrors top entries at /harnesses.',
  },
  {
    id: 'aider-leaderboard',
    name: 'Aider Polyglot Leaderboard',
    publisher: 'Aider',
    scope: '225 hardest Exercism exercises across 6 languages',
    updateCadence: 'as runs land',
    scoreType: '% pass@2',
    domain: 'code',
    live: true,
    hasAPI: false,
    url: 'https://aider.chat/docs/leaderboards/',
    notes: 'Edit-by-diff coding benchmark. Strong cross-language test. Maintained by the Aider community. ~85% frontier as of 2026.',
  },
  {
    id: 'livecodebench',
    name: 'LiveCodeBench',
    publisher: 'UC Berkeley + UW',
    scope: 'Competitive programming problems released after model training cutoff',
    updateCadence: 'monthly (new problems)',
    scoreType: '% pass@1',
    domain: 'code',
    live: true,
    hasAPI: false,
    url: 'https://livecodebench.github.io/leaderboard.html',
    notes: 'Contamination-free by construction (problems pulled from after training cutoff). The contamination-resistant complement to HumanEval.',
  },
  {
    id: 'bigcodebench',
    name: 'BigCodeBench',
    publisher: 'BigCode',
    scope: '1140 hard programming tasks with library usage',
    updateCadence: 'as submissions land',
    scoreType: '% pass@1',
    domain: 'code',
    live: true,
    hasAPI: false,
    url: 'https://huggingface.co/spaces/bigcode/bigcodebench-leaderboard',
    notes: 'Multi-library code benchmark. Tests realistic code that imports + composes external libraries. Harder than HumanEval/MBPP for the same models.',
  },
  {
    id: 'terminal-bench',
    name: 'Terminal-Bench Leaderboard',
    publisher: 'Stanford + Anthropic',
    scope: 'Agentic terminal tasks with deterministic post-conditions',
    updateCadence: 'as submissions land',
    scoreType: '% solved',
    domain: 'agent',
    live: true,
    hasAPI: false,
    url: 'https://www.tbench.ai',
    notes: 'The terminal-shaped agent benchmark. Tests the loop, not just the model. Frontier ~52% as of 2026.',
  },

  // ── Reasoning / Math ────────────────────────────────
  {
    id: 'arc-prize',
    name: 'ARC Prize Leaderboard',
    publisher: 'ARC Prize Foundation',
    scope: 'Abstract pattern-matching (ARC-AGI-1 + ARC-AGI-2)',
    updateCadence: 'as submissions land',
    scoreType: '% solved',
    domain: 'reasoning',
    live: true,
    hasAPI: false,
    url: 'https://arcprize.org/leaderboard',
    notes: 'Francois Chollet\'s benchmark. ARC-AGI-2 is the contamination-resistant successor. Most models lag far behind humans.',
  },
  {
    id: 'mmlu-pro',
    name: 'MMLU-Pro Leaderboard',
    publisher: 'TIGER Lab',
    scope: 'General knowledge + reasoning across 57 subjects',
    updateCadence: 'as submissions land',
    scoreType: '% accuracy',
    domain: 'general',
    live: true,
    hasAPI: false,
    url: 'https://huggingface.co/spaces/TIGER-Lab/MMLU-Pro',
    notes: 'Successor to MMLU. The standard knowledge + reasoning benchmark in 2024-2026.',
  },
  {
    id: 'hle-leaderboard',
    name: 'Humanity\'s Last Exam',
    publisher: 'CAIS + Scale AI',
    scope: '3,000 expert-validated PhD-hard questions across 100+ disciplines',
    updateCadence: 'as submissions land',
    scoreType: '% accuracy',
    domain: 'reasoning',
    live: true,
    hasAPI: false,
    url: 'https://lastexam.ai',
    notes: 'Hardest broad-knowledge benchmark in 2025-2026. Frontier ~30%. Every major lab reports against this.',
  },

  // ── Multimodal / Vision ─────────────────────────────
  {
    id: 'mmmu',
    name: 'MMMU Leaderboard',
    publisher: 'TIGER Lab',
    scope: 'College-level multimodal questions across 30 subjects',
    updateCadence: 'as submissions land',
    scoreType: '% accuracy',
    domain: 'multimodal',
    live: true,
    hasAPI: false,
    url: 'https://mmmu-benchmark.github.io',
    notes: 'Standard vision-LLM benchmark. Frontier ~78% as of 2026.',
  },
  {
    id: 'video-arena',
    name: 'Artificial Analysis Video Arena',
    publisher: 'Artificial Analysis',
    scope: 'Video generation models (Sora, Veo, Kling, HappyHorse, Runway)',
    updateCadence: 'continuous',
    scoreType: 'Elo (human pairwise vote)',
    domain: 'video',
    live: true,
    hasAPI: false,
    url: 'https://artificialanalysis.ai/text-to-video/arena',
    notes: 'Live Elo for video models. Alibaba HappyHorse 1.0 leads as of late April 2026.',
  },
  {
    id: 'image-arena',
    name: 'Artificial Analysis Image Arena',
    publisher: 'Artificial Analysis',
    scope: 'Image generation models (FLUX, Midjourney, DALL-E, Imagen, Recraft)',
    updateCadence: 'continuous',
    scoreType: 'Elo (human pairwise vote)',
    domain: 'image',
    live: true,
    hasAPI: false,
    url: 'https://artificialanalysis.ai/text-to-image/arena',
    notes: 'Live Elo for image models. FLUX 1.1 Pro Ultra and Recraft v3 trade the top spot through 2025-2026.',
  },

  // ── Voice / Speech ──────────────────────────────────
  {
    id: 'tts-arena',
    name: 'TTS Arena',
    publisher: 'Hugging Face',
    scope: 'TTS models (ElevenLabs, Cartesia, OpenAI, Deepgram)',
    updateCadence: 'continuous',
    scoreType: 'Elo (human pairwise vote)',
    domain: 'voice',
    live: true,
    hasAPI: false,
    url: 'https://huggingface.co/spaces/TTS-AGI/TTS-Arena',
    notes: 'Live Elo for TTS quality. Eleven v3 leads as of late April 2026. TensorFeed mirrors top entries at /voice-leaderboards.',
  },
  {
    id: 'open-asr',
    name: 'Open ASR Leaderboard',
    publisher: 'Hugging Face',
    scope: 'STT models on LibriSpeech + Common Voice + AMI + GigaSpeech',
    updateCadence: 'as submissions land',
    scoreType: 'Word Error Rate',
    domain: 'voice',
    live: true,
    hasAPI: true,
    url: 'https://huggingface.co/spaces/hf-audio/open_asr_leaderboard',
    notes: 'Aggregated ASR benchmark. AssemblyAI Universal-2 leads English WER as of late 2025.',
  },

  // ── Long context ────────────────────────────────────
  {
    id: 'ruler-leaderboard',
    name: 'RULER Leaderboard',
    publisher: 'NVIDIA',
    scope: 'Long-context retrieval and reasoning (effective vs claimed length)',
    updateCadence: 'as submissions land',
    scoreType: '% accuracy at varying context lengths',
    domain: 'long-context',
    live: true,
    hasAPI: false,
    url: 'https://github.com/NVIDIA/RULER',
    notes: 'Reveals the gap between claimed and effective context length. Frontier 1M-context models show ~256k effective.',
  },

  // ── Agents ───────────────────────────────────────────
  {
    id: 'gaia-leaderboard',
    name: 'GAIA Leaderboard',
    publisher: 'Hugging Face + Meta',
    scope: 'General assistant agents on 466 real-world questions',
    updateCadence: 'as submissions land',
    scoreType: '% accuracy by difficulty level',
    domain: 'agent',
    live: true,
    hasAPI: false,
    url: 'https://huggingface.co/spaces/gaia-benchmark/leaderboard',
    notes: 'Tests the full agent loop: web browsing, file ops, multi-step reasoning. Three difficulty levels.',
  },
  {
    id: 'webarena',
    name: 'WebArena Leaderboard',
    publisher: 'CMU + UW',
    scope: 'Browser agents on 812 tasks across 5 simulated websites',
    updateCadence: 'as submissions land',
    scoreType: '% solved',
    domain: 'agent',
    live: true,
    hasAPI: false,
    url: 'https://webarena.dev/leaderboard',
    notes: 'The browser-automation agent benchmark. Tests realistic web interaction. Frontier ~58% as of 2026.',
  },
  {
    id: 'osworld-leaderboard',
    name: 'OSWorld Leaderboard',
    publisher: 'HKU + Salesforce',
    scope: 'Computer-use agents on 369 tasks across Ubuntu, Windows, macOS',
    updateCadence: 'as submissions land',
    scoreType: '% solved',
    domain: 'agent',
    live: true,
    hasAPI: false,
    url: 'https://os-world.github.io',
    notes: 'Hardest agent benchmark in 2026. Real desktops, file management, app interaction. Frontier ~28%.',
  },
];

export const PUBLIC_LEADERBOARDS_LAST_UPDATED = '2026-04-30';
