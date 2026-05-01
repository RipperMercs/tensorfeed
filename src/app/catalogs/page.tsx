import Link from 'next/link';
import {
  Cpu, DollarSign, Server, Microchip, Boxes, Database, Network, Image as ImageIcon,
  Wrench, Plug, Code, Trophy, Activity, BarChart2, Shield, Calendar, Scale, Store,
  AudioLines, FileText, Terminal, ClipboardList, GitBranch, TrendingUp, Layers,
  Globe, Mic, Package,
} from 'lucide-react';

interface CatalogEntry {
  href: string;
  apiHref: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: string;
}

interface CatalogGroup {
  id: string;
  title: string;
  blurb: string;
  entries: CatalogEntry[];
}

const GROUPS: CatalogGroup[] = [
  {
    id: 'compute',
    title: 'Compute',
    blurb: 'The chips, the rentals, what training costs, where to run it.',
    entries: [
      { href: '/ai-hardware', apiHref: '/api/ai-hardware', title: 'AI Hardware Specs', description: 'NVIDIA Hopper + Blackwell, AMD Instinct, Google TPU, AWS Trainium, Apple Silicon, Cerebras, Groq. FP16/FP8/FP4 FLOPS, VRAM, bandwidth.', icon: Microchip, count: '18 chips' },
      { href: '/gpu-pricing', apiHref: '/api/gpu/pricing', title: 'GPU Pricing', description: 'Live cheapest hourly rental rates across cloud GPU marketplaces. Refreshed every 4 hours.', icon: Cpu, count: 'live' },
      { href: '/training-runs', apiHref: '/api/training-runs', title: 'Training Run Economics', description: 'Disclosed and estimated training cost for frontier and notable open AI models. Param count, GPU hours, USD millions.', icon: DollarSign, count: '11 runs' },
      { href: '/compute-providers', apiHref: '/api/compute-providers', title: 'Compute Providers', description: 'Lambda, CoreWeave, Crusoe, Nebius, AWS, Azure, GCP, Oracle, Modal, Replicate, Cerebras, SambaNova. Pricing model + AI services.', icon: Server, count: '18 providers' },
    ],
  },
  {
    id: 'models',
    title: 'Models',
    blurb: 'Every model worth picking from, by tier.',
    entries: [
      { href: '/models', apiHref: '/api/models', title: 'AI Models (closed-source LLMs)', description: 'Anthropic, OpenAI, Google, Meta, Mistral, Cohere, DeepSeek with pricing, specs, capabilities.', icon: Boxes },
      { href: '/open-weights', apiHref: '/api/open-weights', title: 'Open-Weights Deployment', description: 'Llama 4 Maverick/Scout, DeepSeek V4, Qwen 2.5, Mixtral, Gemma 3 with quantization x VRAM x GPU class.', icon: GitBranch, count: '9 models' },
      { href: '/specialized-models', apiHref: '/api/specialized-models', title: 'Specialized Models', description: 'Code, medical, legal, finance, music, 3D, retrieval-specialized models. Codestral, Med-Gemini, SaulLM, FinGPT, Suno, TRELLIS, ColPali.', icon: Layers, count: '21 models' },
      { href: '/embeddings', apiHref: '/api/embeddings', title: 'Embeddings + Rerankers', description: 'OpenAI, Voyage, Cohere, Google, Mistral, Jina, Nomic, Mixedbread, BAAI. Dimensions, $/1M tokens, MTEB.', icon: Network, count: '18 models' },
      { href: '/multimodal', apiHref: '/api/multimodal', title: 'Multimodal Models', description: 'Image, video, TTS, STT. Sora 2, Veo 3, FLUX, ElevenLabs, Cartesia, Whisper. Modality-native pricing.', icon: ImageIcon, count: '23 models' },
      { href: '/inference-providers', apiHref: '/api/inference-providers', title: 'Inference Provider Matrix', description: 'Same open-weight model across Together, Fireworks, Groq, DeepInfra, OpenRouter, Replicate, Anyscale, DeepSeek.', icon: Server },
    ],
  },
  {
    id: 'training',
    title: 'Training & Customization',
    blurb: 'Datasets, fine-tuning paths, what training actually costs.',
    entries: [
      { href: '/training-datasets', apiHref: '/api/training-datasets', title: 'Training Datasets', description: 'Pretraining (FineWeb, RedPajama, Dolma, The Pile, The Stack v2), instruction-tuning (Tulu 3, OpenHermes, AgentInstruct), DPO (UltraFeedback).', icon: Database, count: '19 datasets' },
      { href: '/fine-tuning', apiHref: '/api/fine-tuning', title: 'Fine-Tuning Providers', description: 'OpenAI, Anthropic via Bedrock, Google Vertex, Mistral, Together, Fireworks, OpenPipe, Predibase, AWS, Replicate, Modal.', icon: Wrench, count: '12 providers' },
    ],
  },
  {
    id: 'agents',
    title: 'Agent Infrastructure',
    blurb: 'Frameworks, harnesses, MCP, the APIs agents wire in.',
    entries: [
      { href: '/frameworks', apiHref: '/api/frameworks', title: 'Agent Frameworks', description: 'LangChain, LangGraph, LlamaIndex, AutoGen, CrewAI, Pydantic AI, Mastra, OpenAI/Claude Agent SDKs, Vercel AI SDK, Agno, smolagents.', icon: Boxes, count: '15 frameworks' },
      { href: '/harnesses', apiHref: '/api/harnesses', title: 'Coding Harnesses', description: 'Claude Code, Cursor Agent, Codex CLI, Aider, OpenHands, Devin, Cline, Windsurf, Amp, Continue, Roo Code.', icon: Code, count: '11 harnesses' },
      { href: '/mcp-servers', apiHref: '/api/mcp-servers', title: 'MCP Servers', description: 'Filesystem, web search, browser, GitHub, Slack, Notion, databases, AWS, Cloudflare, Sentry, Stripe, ElevenLabs.', icon: Plug, count: '30 servers' },
      { href: '/agent-apis', apiHref: '/api/agent-apis', title: 'Agent APIs', description: 'Search, scraping, weather, finance, maps, email, SMS, payments, code execution, OCR. Tavily, Firecrawl, OpenWeather, Stripe.', icon: Globe, count: '25 APIs' },
      { href: '/oss-tools', apiHref: '/api/oss-tools', title: 'OSS AI Tools', description: 'Ollama, LM Studio, llama.cpp, MLX, vLLM, SGLang, TGI, Unsloth, Axolotl, Open WebUI, ComfyUI, lm-eval-harness.', icon: Wrench, count: '25 tools' },
    ],
  },
  {
    id: 'eval',
    title: 'Evaluation & Safety',
    blurb: 'Benchmarks, registries, what the labs say about their models, real production usage.',
    entries: [
      { href: '/benchmarks', apiHref: '/api/benchmarks', title: 'Benchmarks (with scores)', description: 'Model x score data for SWE-bench, MMLU-Pro, HumanEval, GPQA Diamond, MATH.', icon: BarChart2 },
      { href: '/benchmark-registry', apiHref: '/api/benchmark-registry', title: 'Benchmark Registry', description: 'Meta-catalog of 25+ AI evaluation benchmarks. Scope, contamination risk, frontier scores.', icon: ClipboardList, count: '25+ evals' },
      { href: '/model-cards', apiHref: '/api/model-cards', title: 'Model Cards & Safety', description: 'System cards, safety evals, red-team reports per frontier model. Anthropic RSP, OpenAI Preparedness, METR autonomy evals.', icon: Shield },
      { href: '/usage-rankings', apiHref: '/api/usage-rankings', title: 'Usage Rankings', description: 'Real production token volume per AI model from OpenRouter. The market signal beneath benchmarks.', icon: BarChart2, count: '20 models' },
    ],
  },
  {
    id: 'live',
    title: 'Live Signals',
    blurb: 'Real-time operational data we measure ourselves.',
    entries: [
      { href: '/status', apiHref: '/api/status', title: 'AI Service Status', description: 'Live operational status of 12+ AI services. Polled every 5 minutes.', icon: Activity },
      { href: '/incidents', apiHref: '/api/incidents', title: 'Incidents Feed', description: 'Active and recent AI service incidents.', icon: Activity },
      { href: '/attention', apiHref: '/api/attention', title: 'AI Attention Index', description: 'Live 0-100 attention score per provider from news + GitHub trending + agent traffic. Daily snapshots.', icon: TrendingUp },
      { href: '/agent-traffic', apiHref: '/api/agents/activity', title: 'Agent Traffic Dashboard', description: 'Live AI bot activity on TensorFeed. Per-bot breakdown, top endpoints, rolling tail.', icon: Activity },
    ],
  },
  {
    id: 'discovery',
    title: 'Discovery & Ecosystem',
    blurb: 'Where to play, where to find more, where the conversation lives.',
    entries: [
      { href: '/playground', apiHref: '/api/meta', title: 'API Playground', description: 'No-auth in-browser query tool against every free TensorFeed endpoint.', icon: Terminal },
      { href: '/marketplaces', apiHref: '/api/marketplaces', title: 'AI Marketplaces', description: 'GPT Store, Claude Skills, HF Spaces, Replicate, MCP Registry, CrewAI, Apify, Replit, Vercel.', icon: Store, count: '12 marketplaces' },
      { href: '/public-leaderboards', apiHref: '/api/public-leaderboards', title: 'Public Leaderboards', description: 'LMSYS Chatbot Arena, Artificial Analysis, HF Open LLM, SWE-bench, Aider, ARC Prize, MMMU, OSWorld.', icon: Trophy, count: '20 leaderboards' },
      { href: '/voice-leaderboards', apiHref: '/api/voice-leaderboards', title: 'Voice Leaderboards', description: 'Live TTS Arena Elo + Open ASR Leaderboard WER rankings.', icon: AudioLines },
      { href: '/conferences', apiHref: '/api/conferences', title: 'AI Conferences', description: 'NeurIPS, ICLR, ICML, COLM, GTC, OpenAI DevDay, AWS re:Invent. Dates, deadlines, themes.', icon: Calendar, count: '18 events' },
    ],
  },
  {
    id: 'industry',
    title: 'Industry Context',
    blurb: 'Money flowing in. Rules being written.',
    entries: [
      { href: '/funding', apiHref: '/api/funding', title: 'Funding Rounds', description: 'OpenAI, Anthropic, Cursor, Cognition, Mistral, Sierra, Glean, Perplexity, Cohere, Groq, Together, Crusoe, ElevenLabs, Cartesia.', icon: DollarSign, count: '21 rounds' },
      { href: '/ai-policy', apiHref: '/api/ai-policy', title: 'AI Policy Tracker', description: 'EU AI Act, US GUARD Act, California AB 2013, China Generative AI Measures, Korea Basic Act, NIST AI RMF, ISO 42001.', icon: Scale, count: '10 items' },
    ],
  },
  {
    id: 'developers',
    title: 'For Developers',
    blurb: 'Where to start if you are wiring TensorFeed into something.',
    entries: [
      { href: '/developers', apiHref: '/api/meta', title: 'Developer Docs', description: 'Free, no-auth JSON API. CORS enabled. No API key needed. Code examples for JavaScript and Python.', icon: FileText },
      { href: '/developers/agent-payments', apiHref: '/api/payment/info', title: 'Premium Agent API', description: 'Pay-per-call premium tier via USDC on Base. No accounts, no API keys, no traditional processors.', icon: Package },
      { href: '/developers/frameworks', apiHref: '/api/meta', title: 'Framework Integrations', description: 'Drop-in tools and document loaders for LangChain, LlamaIndex, CrewAI. pip install tensorfeed[langchain].', icon: Boxes },
      { href: '/api-reference', apiHref: '/api/meta', title: 'API Reference', description: 'Per-endpoint docs with parameters, response schema, code samples, MCP tool name.', icon: FileText },
      { href: '/agent-fair-trade', apiHref: '/.well-known/agent-fair-trade.json', title: 'Agent Fair-Trade Agreement', description: 'Code-enforced no-charge guarantees, Ed25519-signed receipts, public on-chain payment rail.', icon: Shield },
    ],
  },
];

export default function CatalogsPage() {
  const totalEntries = GROUPS.reduce((n, g) => n + g.entries.length, 0);

  const FAQ_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the TensorFeed catalogs index?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Single index page that lists every TensorFeed agent-shaped data catalog (${totalEntries} surfaces) grouped by domain: compute, models, training, agent infrastructure, evaluation, live signals, discovery, industry context, and developer resources. Each entry links to the human-facing page and the matching JSON endpoint.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Are all TensorFeed catalogs free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Every catalog listed on /catalogs is free with no auth. The 19 paid premium endpoints (routing, history series, watches, deep-dives, comparison) live under /developers/agent-payments and are billed in USDC on Base via the Agent Fair-Trade Agreement.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do agents discover all of this programmatically?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Three discovery surfaces: /api/meta returns the full endpoint catalog as JSON; /llms.txt is the canonical machine-readable site index; /openapi.json is the OpenAPI 3.1 spec. Combined with /.well-known/agent-fair-trade.json and /.well-known/x402.json, an agent can fully self-onboard from a single root URL.',
        },
      },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />

      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">All Catalogs</h1>
        <p className="text-text-secondary text-lg max-w-3xl leading-relaxed">
          Every TensorFeed catalog and signal surface in one place. {totalEntries} free, machine-readable agent-shaped data sources covering compute, models, training, agent infrastructure, evaluation, live signals, discovery, and industry context.
        </p>
        <p className="text-text-secondary text-sm max-w-3xl leading-relaxed mt-3">
          For programmatic discovery, agents should use{' '}
          <Link href="/api/meta" className="text-accent-primary hover:underline font-mono">/api/meta</Link>,{' '}
          <Link href="/llms.txt" className="text-accent-primary hover:underline font-mono">/llms.txt</Link>, or{' '}
          <Link href="/openapi.json" className="text-accent-primary hover:underline font-mono">/openapi.json</Link>.
        </p>
      </div>

      {/* Jump to section */}
      <nav className="bg-bg-secondary border border-border rounded-lg p-3 mb-8 flex flex-wrap gap-2">
        {GROUPS.map(g => (
          <a key={g.id} href={`#${g.id}`} className="text-xs px-3 py-1 rounded-full border border-border hover:border-accent-primary text-text-secondary hover:text-accent-primary transition-colors">
            {g.title}
          </a>
        ))}
      </nav>

      {/* Groups */}
      {GROUPS.map(group => (
        <section key={group.id} id={group.id} className="mb-10 scroll-mt-20">
          <div className="border-b border-border pb-2 mb-4">
            <h2 className="text-xl font-semibold text-text-primary">{group.title}</h2>
            <p className="text-sm text-text-muted mt-0.5">{group.blurb}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.entries.map(e => {
              const Icon = e.icon;
              return (
                <Link key={e.href} href={e.href} className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded bg-accent-primary/10 shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-accent-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-text-primary text-sm">{e.title}</span>
                        {e.count && <span className="text-xs text-text-muted font-mono">{e.count}</span>}
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed mb-2">{e.description}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <code className="font-mono text-accent-primary">{e.href}</code>
                        <span className="text-text-muted">·</span>
                        <code className="font-mono text-text-muted">{e.apiHref}</code>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>
          Missing something? The catalog grows weekly. Editorial cadence is roughly weekly for fast-changing surfaces (funding, leaderboards, attention) and on redeploy for slower ones (frameworks, hardware specs). Send feedback to{' '}
          <a href="mailto:feedback@tensorfeed.ai" className="text-accent-primary hover:underline">feedback@tensorfeed.ai</a>.
        </p>
      </div>
    </div>
  );
}
