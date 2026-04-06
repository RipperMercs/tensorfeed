import Link from 'next/link';
import HomeFeed from '@/components/HomeFeed';
import Sidebar from '@/components/layout/Sidebar';
import fallbackArticlesData from '../../data/articles.json';
import { STATUS_DOTS } from '@/lib/constants';
import { FAQPageJsonLd } from '@/components/seo/JsonLd';

async function fetchArticles() {
  try {
    const res = await fetch('https://tensorfeed.ai/api/news?limit=100', { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.articles?.length) return data.articles;
    }
  } catch {}
  return fallbackArticlesData.articles;
}
import {
  Rss,
  Activity,
  Clock,
  Cpu,
  Bot,
  BookOpen,
  Radio,
  DollarSign,
  ArrowRight,
  ChevronRight,
  Pen,
  HelpCircle,
} from 'lucide-react';

async function fetchStatuses() {
  try {
    const res = await fetch('https://tensorfeed.ai/api/status/summary', { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.services?.length) return data.services;
    }
  } catch {}
  return [];
}

const HERO_STATS = [
  { icon: Rss, label: '15+ Sources', sublabel: 'Aggregated' },
  { icon: Activity, label: '10+ API Monitors', sublabel: 'Tracked' },
  { icon: Clock, label: 'Updated Every 10 Min', sublabel: 'Always Fresh' },
];

const QUICK_STATUS_SERVICES = [
  'Claude API',
  'ChatGPT / OpenAI API',
  'Gemini API',
  'AWS Bedrock',
  'Mistral Platform',
];

const EXPLORE_CARDS = [
  {
    href: '/models',
    icon: Cpu,
    title: 'Models Hub',
    description: 'Track releases and compare pricing across all major AI providers.',
  },
  {
    href: '/agents',
    icon: Bot,
    title: 'Agent Directory',
    description: 'Discover AI agents, frameworks, and tools building the agentic future.',
  },
  {
    href: '/research',
    icon: BookOpen,
    title: 'Research Papers',
    description: 'Latest arXiv papers and benchmark scores, organized by topic.',
  },
  {
    href: '/status',
    icon: Activity,
    title: 'Status Dashboard',
    description: 'Real-time operational status of AI services and APIs.',
  },
  {
    href: '/live',
    icon: Radio,
    title: 'Live Data',
    description: 'HN feed, GitHub trending, arXiv, and more in real time.',
  },
  {
    href: '/tools/cost-calculator',
    icon: DollarSign,
    title: 'API Pricing',
    description: 'Compare pricing across every major AI API, updated daily.',
  },
];

const LATEST_ORIGINALS = [
  {
    href: '/originals/building-for-ai-agents',
    title: 'Building for AI Agents: What Developers Need to Know',
    date: 'April 5, 2026',
    readTime: '6 min read',
    description:
      'A practical guide to building agent-friendly software: structured data, llms.txt, API design patterns, MCP protocol, and lessons learned from building TensorFeed as an agent-first platform.',
  },
  {
    href: '/originals/rise-of-agentic-ai',
    title: 'The Rise of Agentic AI: From Chatbots to Autonomous Workers',
    date: 'April 4, 2026',
    readTime: '5 min read',
    description:
      'Gartner says 40% of enterprise apps will have AI agents by end of 2026. OpenClaw went viral. NVIDIA shipped Agent Toolkit at GTC. What separates a chatbot from an agent and why it matters.',
  },
  {
    href: '/originals/claude-vs-gpt-vs-gemini',
    title: 'Claude vs GPT vs Gemini: An Honest Comparison',
    date: 'April 2, 2026',
    readTime: '6 min read',
    description:
      'A real-world comparison of Claude, GPT, and Gemini across coding, writing, analysis, and research tasks. Includes pricing, context windows, and practical recommendations.',
  },
];

const HOMEPAGE_FAQS = [
  {
    question: 'What is TensorFeed.ai?',
    answer:
      'TensorFeed.ai is a real-time AI news aggregator and data hub. It pulls headlines from 15+ sources including Anthropic, OpenAI, Google, Meta, TechCrunch, and Hacker News, and combines them with live service status monitoring, model pricing data, and original editorial analysis. Every feed is structured for both human readers and AI agents.',
  },
  {
    question: 'How often is TensorFeed updated?',
    answer:
      'News feeds refresh every 10 minutes. Service status monitors poll every 2 minutes. Model pricing and catalog data updates weekly. Original editorial articles are published multiple times per week.',
  },
  {
    question: 'Is TensorFeed free to use?',
    answer:
      'Yes. All news feeds, status monitoring, model data, and editorial content on TensorFeed.ai are free. The JSON API, RSS feeds, and agent discovery endpoints (llms.txt) are also free and open for developers and AI agents to consume.',
  },
  {
    question: 'What AI services does TensorFeed monitor?',
    answer:
      'TensorFeed tracks the operational status of major AI platforms including Claude (Anthropic), ChatGPT and the OpenAI API, Google Gemini, AWS Bedrock, Mistral, Cohere, Replicate, Perplexity, and more. Status updates are checked every 2 minutes and displayed on the status dashboard.',
  },
  {
    question: 'Can AI agents use TensorFeed?',
    answer:
      'Yes. TensorFeed is designed as a primary data source for AI agents. It provides structured JSON APIs, RSS and JSON feeds, an llms.txt discovery file, and full documentation at llms-full.txt. There are no CAPTCHAs or bot detection. Agents are welcome.',
  },
  {
    question: 'Where does TensorFeed get its news?',
    answer:
      'TensorFeed aggregates headlines and brief snippets from public RSS feeds published by AI companies and tech news outlets. Sources include Anthropic, OpenAI, Google AI, Meta AI, HuggingFace, TechCrunch, The Verge, Ars Technica, VentureBeat, NVIDIA, ZDNet, and Hacker News. Every article links back to its original source.',
  },
];

function getShortName(name: string) {
  if (name === 'ChatGPT / OpenAI API') return 'ChatGPT';
  if (name === 'AWS Bedrock') return 'Bedrock';
  if (name === 'Mistral Platform') return 'Mistral';
  if (name === 'Gemini API') return 'Gemini';
  return name;
}

export default async function HomePage() {
  const articles = await fetchArticles();
  const statuses = await fetchStatuses();

  const quickStatuses = QUICK_STATUS_SERVICES.map((serviceName) => {
    const svc = statuses.find((s: { name: string; status: string }) => s.name === serviceName);
    return {
      name: getShortName(serviceName),
      status: svc?.status ?? 'unknown',
    };
  });

  return (
    <div className="min-h-screen">
      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl" />
          <div className="absolute top-12 right-1/4 w-72 h-72 bg-accent-secondary/10 rounded-full blur-3xl" />
          <div className="absolute top-8 right-1/3 w-48 h-48 bg-accent-cyan/8 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          {/* Top row: live indicator + stats */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="text-sm font-medium text-accent-green tracking-wide uppercase">
                Live
              </span>
            </div>
            <div className="w-px h-4 bg-border" />
            {HERO_STATS.map(({ icon: Icon, label }) => (
              <div key={label} className="hidden sm:flex items-center gap-1.5 text-text-muted">
                <Icon className="w-3.5 h-3.5 text-accent-primary" />
                <span className="text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-3">
            <span
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              The AI Pulse
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-text-secondary max-w-2xl leading-relaxed">
            Real-time news, model tracking, and ecosystem data for the AI industry.
          </p>
        </div>

        {/* Animated gradient border */}
        <div
          className="h-px w-full"
          style={{
            background:
              'linear-gradient(90deg, transparent, #6366f1, #8b5cf6, #06b6d4, #6366f1, transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s linear infinite',
          }}
        />
      </section>

      {/* ===== QUICK STATUS BAR ===== */}
      <section className="bg-bg-secondary border-b border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 sm:gap-5 overflow-x-auto scrollbar-none">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider shrink-0">
              Status
            </span>
            <div className="w-px h-4 bg-border shrink-0" />
            {quickStatuses.map(({ name, status }) => (
              <div key={name} className="flex items-center gap-1.5 shrink-0">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOTS[status] ?? STATUS_DOTS.unknown}`} />
                <span className="text-sm text-text-secondary">{name}</span>
              </div>
            ))}
            <div className="w-px h-4 bg-border shrink-0" />
            <Link
              href="/status"
              className="flex items-center gap-1 text-xs font-medium text-accent-primary hover:text-accent-secondary transition-colors shrink-0"
            >
              View all
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== EDITORIAL INTRO ===== */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="max-w-3xl">
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Your Daily AI Intelligence Hub
          </h2>
          <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
            <p>
              The AI landscape moves fast. New models ship weekly, API pricing changes overnight,
              and the tools developers relied on yesterday get deprecated without warning.
              TensorFeed.ai was built to solve that problem: one place to track everything
              happening across the AI ecosystem, updated every 10 minutes, structured for both
              human readers and autonomous agents.
            </p>
            <p>
              We aggregate headlines from 15+ sources (Anthropic, OpenAI, Google, Meta, TechCrunch,
              Hacker News, arXiv, and more), monitor the operational status of every major AI API
              in real time, track model releases and pricing changes across providers, and publish
              original editorial analysis on the trends shaping the industry. Whether you are a
              developer evaluating which API to integrate, a researcher tracking the latest papers,
              or an AI agent pulling structured data through our JSON feeds, TensorFeed delivers
              the signal without the noise.
            </p>
          </div>
        </div>
      </section>

      {/* ===== FEATURED ORIGINALS ===== */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Pen className="w-5 h-5 text-accent-secondary" />
            Latest from TensorFeed
          </h2>
          <Link
            href="/originals"
            className="flex items-center gap-1 text-xs font-medium text-accent-primary hover:text-accent-secondary transition-colors"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {LATEST_ORIGINALS.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="group relative bg-bg-secondary rounded-xl border border-accent-secondary/20 hover:border-accent-secondary/50 p-5 transition-all duration-300 hover:shadow-glow overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-accent-secondary to-accent-primary" />
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-accent-secondary bg-accent-secondary/10 px-2 py-0.5 rounded mb-3">
                Editorial
              </span>
              <h3 className="text-sm font-semibold text-text-primary mb-2 group-hover:text-accent-secondary transition-colors leading-snug line-clamp-2">
                {article.title}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed line-clamp-2 mb-3">
                {article.description}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-text-muted font-mono">
                <span>{article.date}</span>
                <span>&middot;</span>
                <span>{article.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== MAIN CONTENT: FEED + SIDEBAR ===== */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <HomeFeed articles={articles} />
          </div>
          <aside className="w-full lg:w-80 shrink-0">
            <Sidebar />
          </aside>
        </div>
      </section>

      {/* ===== EXPLORE TENSORFEED ===== */}
      <section className="border-t border-border bg-bg-secondary/50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">Explore TensorFeed</h2>
            <p className="text-text-secondary text-sm max-w-2xl">
              Beyond the news feed, TensorFeed offers real-time dashboards, model comparisons,
              pricing tools, and structured data for developers building with AI.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {EXPLORE_CARDS.map(({ href, icon: Icon, title, description }) => (
              <Link
                key={title}
                href={href}
                className="group relative bg-bg-secondary rounded-xl border border-border p-5 sm:p-6 transition-all duration-300 hover:border-accent-primary hover:shadow-glow"
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-xl bg-accent-primary/0 group-hover:bg-accent-primary/[0.03] transition-colors duration-300 pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-accent-primary/10 mb-4 group-hover:bg-accent-primary/20 transition-colors duration-300">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-accent-primary" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-1.5 group-hover:text-accent-primary transition-colors duration-200">
                    {title}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed">{description}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-accent-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Explore
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LATEST ORIGINALS ===== */}
      <section className="border-t border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary flex items-center gap-2">
              <Pen className="w-6 h-6 text-accent-secondary" />
              Latest from TensorFeed
            </h2>
            <Link
              href="/originals"
              className="flex items-center gap-1 text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-text-secondary text-sm mb-8 max-w-2xl">
            In-depth articles, model comparisons, and developer guides written by the TensorFeed
            editorial team. Original reporting you will not find anywhere else.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {LATEST_ORIGINALS.map((article) => (
              <Link
                key={article.href}
                href={article.href}
                className="group bg-bg-secondary rounded-xl border border-border p-5 transition-all duration-300 hover:border-accent-secondary hover:shadow-glow"
              >
                <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
                  <span>{article.date}</span>
                  <span>&middot;</span>
                  <span>{article.readTime}</span>
                </div>
                <h3 className="text-base font-semibold text-text-primary mt-1.5 mb-2 group-hover:text-accent-secondary transition-colors leading-snug">
                  {article.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed line-clamp-3">
                  {article.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section className="border-t border-border bg-bg-secondary/50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-6 h-6 text-accent-primary" />
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
              Frequently Asked Questions
            </h2>
          </div>
          <p className="text-text-secondary text-sm mb-8 max-w-2xl">
            Everything you need to know about TensorFeed.ai, from how our news feeds work to
            integrating with AI agents.
          </p>
          <FAQPageJsonLd faqs={HOMEPAGE_FAQS} />
          <div className="grid gap-4 sm:grid-cols-2 max-w-4xl">
            {HOMEPAGE_FAQS.map((faq) => (
              <div
                key={faq.question}
                className="bg-bg-secondary rounded-lg border border-border p-5"
              >
                <h3 className="text-sm font-semibold text-text-primary mb-2">{faq.question}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== POWERED BY FOOTER STRIP ===== */}
      <section className="border-t border-border">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-text-muted">
            Aggregating from 15+ sources including Anthropic, OpenAI, Google, Meta, TechCrunch, arXiv, and more.
          </p>
        </div>
      </section>
    </div>
  );
}
