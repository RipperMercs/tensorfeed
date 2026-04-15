import { Metadata } from 'next';
import { Users, Target, Globe, Mail, Cpu, Rss, Bot, FileText, Code, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About TensorFeed | AI News Hub for Humans and Agents',
  description: 'Learn about TensorFeed.ai: our mission, how we work, what tensor means, and why we built the leading real-time AI news aggregator.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/about',
    title: 'About TensorFeed | AI News Hub for Humans and Agents',
    description: 'Learn about TensorFeed.ai: our mission, how we work, what tensor means, and why we built the leading real-time AI news aggregator.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'About TensorFeed | AI News Hub for Humans and Agents',
    description: 'Learn about TensorFeed.ai: our mission, how we work, what tensor means, and why we built the leading real-time AI news aggregator.',
  },
};

const SISTER_SITES = [
  {
    name: 'TerminalFeed.io',
    url: 'https://terminalfeed.io',
    description:
      'Real-time financial data and market news aggregation for traders and developers. Live tickers, economic calendars, and API access for building trading tools.',
  },
  {
    name: 'Phreak.fm',
    url: 'https://phreak.fm',
    description:
      'Signals, frequencies, and the people who bend them. Hacker culture, electronic music, and technology through a retro lens.',
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
            TensorFeed exists because tracking the AI space meant jumping between a dozen sources
            every morning: Twitter, arXiv, Discord servers, company blogs, status pages. So we built
            the thing we wanted to use, and here we are.
          </p>
          <p>
            TensorFeed.ai aggregates AI news from 15+ sources, monitors service status in real time,
            tracks model releases and API pricing, and publishes original editorial analysis. Every
            data feed is structured for both human readers and AI agents. Fast, clean, no noise.
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

      {/* Who We Are */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-accent-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">Who We Are</h2>
        </div>
        <div className="space-y-4 text-text-secondary leading-relaxed">
          <p>
            TensorFeed was founded in March 2026 by Evan (&quot;Ripper&quot;), a software engineer and
            entrepreneur with over a decade of experience building web applications, real-time data
            systems, and developer tools. The project grew out of a personal frustration: keeping up
            with AI news required checking too many sources every day, and none of them served both
            human readers and AI agents well.
          </p>
          <p>
            The editorial team includes Ripper (founder, lead developer, and primary writer),
            Kira Nolan (contributing editor covering AI safety, open source, and agent ecosystems),
            and Marcus Chen (contributing editor covering API economics, pricing analysis, and
            enterprise AI). Together, we bring perspectives from software engineering, data science,
            and technology journalism.
          </p>
          <p>
            TensorFeed is operated by Pizza Robot Studios LLC, based in Los Angeles, California.
            We are an independent publication with no venture capital funding, no investor
            obligations, and no editorial conflicts. Our opinions are our own.
          </p>
        </div>
      </section>

      {/* Editorial Standards */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-accent-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">Editorial Standards</h2>
        </div>
        <div className="space-y-4 text-text-secondary leading-relaxed">
          <p>
            We hold ourselves to a clear set of standards. Aggregated news always links back to the
            original source. We never republish full articles from other outlets. Our original
            editorial content is clearly labeled, fact-checked against primary sources, and written
            by named authors. When we express opinions, we make that clear.
          </p>
          <p>
            Our data (model pricing, benchmark scores, service status) is sourced directly from
            provider APIs, official documentation, and public benchmark datasets. We update pricing
            and model data daily, status monitoring runs every 2 to 5 minutes, and news feeds
            refresh every 10 minutes. If you spot an error, email us at{' '}
            <a href="mailto:feedback@tensorfeed.ai" className="text-accent-primary hover:underline">
              feedback@tensorfeed.ai
            </a>{' '}
            and we will correct it promptly.
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
        </div>
      </section>
    </div>
  );
}
