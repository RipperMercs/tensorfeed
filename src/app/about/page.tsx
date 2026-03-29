import { Metadata } from 'next';
import { Users, Target, Globe, Mail, ExternalLink, Cpu, Rss, Bot, FileText, Code, Zap } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
};

const SISTER_SITES = [
  {
    name: 'TerminalFeed.io',
    url: 'https://terminalfeed.io',
    description:
      'Real-time financial data and market news aggregation for traders and developers. Live tickers, economic calendars, and API access for building trading tools.',
  },
  {
    name: 'VR.org',
    url: 'https://vr.org',
    description:
      'The community hub for virtual reality enthusiasts, covering headset reviews, game releases, and the latest in spatial computing and immersive technology.',
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">About</h1>
        </div>
      </div>

      {/* About TensorFeed */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">About TensorFeed.ai</h2>
        <div className="space-y-4 text-text-secondary leading-relaxed">
          <p>
            Hi, I am Evan. I built TensorFeed because I was tired of piecing together AI news from
            a dozen different sources every morning. I wanted one place where I could see new model
            releases, API status updates, research papers, and benchmark results without jumping
            between Twitter, arXiv, and a handful of Discord servers. So I built the thing I wanted
            to use, and here we are.
          </p>
          <p>
            TensorFeed.ai is a project from{' '}
            <span className="text-text-primary font-medium">Pizza Robot Studios LLC</span>, the
            same team behind{' '}
            <a href="https://vr.org" className="text-accent-primary hover:underline">
              VR.org
            </a>{' '}
            and{' '}
            <a href="https://terminalfeed.io" className="text-accent-primary hover:underline">
              TerminalFeed.io
            </a>
            . We have a thing for building fast, useful data feeds. If you have been to any of our
            other sites, you will feel right at home here. We care about speed, clean design, and
            giving people the information they need without the noise.
          </p>
        </div>
      </section>

      {/* Our Mission */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-accent-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">Our Mission</h2>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <p className="text-text-secondary leading-relaxed">
            TensorFeed.ai delivers real-time AI news, model updates, and research data for both
            humans and AI agents. Whether you are a developer checking the latest API changes over
            coffee or an autonomous agent pulling structured data through our feeds, we aim to be the
            fastest and most reliable source of truth for everything happening in AI.
          </p>
        </div>
      </section>

      {/* What Does Tensor Mean? */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-accent-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">What Does Tensor Mean?</h2>
        </div>
        <div className="space-y-4 text-text-secondary leading-relaxed">
          <p>
            A tensor is a mathematical object used throughout machine learning and physics. In the
            simplest terms, a scalar is a single number, a vector is a list of numbers, a matrix is
            a grid of numbers, and a tensor is the generalization of all three to any number of
            dimensions.
          </p>
          <p>
            In machine learning, tensors are the fundamental data structure. Every piece of data
            flowing through a neural network (images, text embeddings, model weights, gradients) is
            stored and processed as tensors. Google named their AI chip the &quot;Tensor Processing
            Unit&quot; and their ML framework &quot;TensorFlow&quot; after this concept.
          </p>
          <p>
            &quot;TensorFeed&quot; means a feed of AI and ML data. The name captures what the site
            does: delivering structured, machine-readable data about the AI ecosystem.
          </p>
        </div>
      </section>

      {/* How TensorFeed Works */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Rss className="w-5 h-5 text-accent-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">How TensorFeed Works</h2>
        </div>
        <div className="space-y-4 text-text-secondary leading-relaxed">
          <p>
            TensorFeed aggregates headlines and brief snippets from public RSS feeds published by AI
            companies, tech news outlets, and research platforms. Every article links directly back
            to its original source.
          </p>
          <p>
            We do not host, reproduce, or republish full articles. The RSS feeds we pull from are
            published intentionally by their owners for exactly this purpose. This is the same model
            used by Google News, Feedly, Techmeme, and every major news aggregator.
          </p>
          <p>
            Our original articles under /originals are written by our editorial team and are the
            only content we create ourselves. Everything else is properly attributed and linked.
          </p>
        </div>
      </section>

      {/* Built for AI Agents */}
      <section className="mb-10">
        <div className="bg-gradient-to-br from-accent-primary/10 via-bg-secondary to-accent-cyan/10 border border-accent-primary/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-6 h-6 text-accent-primary" />
            <h2 className="text-xl font-semibold text-text-primary">Built for AI Agents</h2>
          </div>
          <p className="text-text-secondary leading-relaxed mb-5">
            TensorFeed is designed as a primary data source for AI agents. Access our structured
            feeds, JSON APIs, and full-context documentation bundle. No CAPTCHAs, no bot detection.
            Agents are welcome here.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <a
              href="/llms.txt"
              className="flex items-center gap-2 bg-bg-primary/60 border border-border rounded-lg px-3 py-2.5 hover:border-accent-primary transition-colors group"
            >
              <FileText className="w-4 h-4 text-accent-primary shrink-0" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">llms.txt</span>
            </a>
            <a
              href="/feed.json"
              className="flex items-center gap-2 bg-bg-primary/60 border border-border rounded-lg px-3 py-2.5 hover:border-accent-primary transition-colors group"
            >
              <Code className="w-4 h-4 text-accent-primary shrink-0" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">JSON Feed</span>
            </a>
            <a
              href="/api/meta"
              className="flex items-center gap-2 bg-bg-primary/60 border border-border rounded-lg px-3 py-2.5 hover:border-accent-primary transition-colors group"
            >
              <Zap className="w-4 h-4 text-accent-primary shrink-0" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">Agent API</span>
            </a>
            <a
              href="/llms-full.txt"
              className="flex items-center gap-2 bg-bg-primary/60 border border-border rounded-lg px-3 py-2.5 hover:border-accent-primary transition-colors group"
            >
              <Rss className="w-4 h-4 text-accent-primary shrink-0" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">Full Docs</span>
            </a>
          </div>
        </div>
      </section>

      {/* Sister Sites */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-accent-cyan" />
          <h2 className="text-xl font-semibold text-text-primary">Sister Sites</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {SISTER_SITES.map((site) => (
            <a
              key={site.name}
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-bg-secondary border border-border rounded-lg p-5 hover:border-accent-primary transition-colors"
            >
              <h3 className="text-text-primary font-semibold mb-2">{site.name}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{site.description}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-accent-primary" />
          <h2 className="text-xl font-semibold text-text-primary">Contact</h2>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-text-muted" />
            <a
              href="mailto:feedback@tensorfeed.ai"
              className="text-accent-primary hover:underline text-sm"
            >
              feedback@tensorfeed.ai
            </a>
          </div>
          <div className="flex items-center gap-3">
            <ExternalLink className="w-4 h-4 text-text-muted" />
            <a
              href="https://github.com/evanatpizzarobot/tensorfeed"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline text-sm"
            >
              github.com/evanatpizzarobot/tensorfeed
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
