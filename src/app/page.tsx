import Link from 'next/link';
import NewsFeed from '@/components/news/NewsFeed';
import Sidebar from '@/components/layout/Sidebar';
import articlesData from '../../data/articles.json';
import { STATUS_DOTS } from '@/lib/constants';
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
    href: '/live',
    icon: DollarSign,
    title: 'API Pricing',
    description: 'Compare pricing across every major AI API, updated daily.',
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
  const articles = articlesData.articles;
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

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          {/* Live indicator */}
          <div className="flex items-center gap-2 mb-6">
            <span className="live-dot" />
            <span className="text-sm font-medium text-accent-green tracking-wide uppercase">
              Live Feed
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-4">
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
          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mb-10 leading-relaxed">
            Real-time news, model tracking, and ecosystem data for the AI industry.
          </p>

          {/* Stat counters */}
          <div className="flex flex-wrap gap-4 sm:gap-6">
            {HERO_STATS.map(({ icon: Icon, label, sublabel }) => (
              <div
                key={label}
                className="flex items-center gap-3 bg-bg-secondary/80 backdrop-blur-sm border border-border rounded-lg px-4 py-3"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-primary/10">
                  <Icon className="w-5 h-5 text-accent-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-text-primary">{label}</div>
                  <div className="text-xs text-text-muted">{sublabel}</div>
                </div>
              </div>
            ))}
          </div>
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

      {/* ===== MAIN CONTENT: FEED + SIDEBAR ===== */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <NewsFeed articles={articles} />
          </div>
          <aside className="w-full lg:w-80 shrink-0">
            <Sidebar />
          </aside>
        </div>
      </section>

      {/* ===== EXPLORE TENSORFEED ===== */}
      <section className="border-t border-border bg-bg-secondary/50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">Explore TensorFeed</h2>
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
