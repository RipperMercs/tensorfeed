import { Metadata } from 'next';
import { Users, Target, Globe, Mail, ExternalLink } from 'lucide-react';

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
              href="mailto:evan@pizzarobotstudios.com"
              className="text-accent-primary hover:underline text-sm"
            >
              evan@pizzarobotstudios.com
            </a>
          </div>
          <div className="flex items-center gap-3">
            <ExternalLink className="w-4 h-4 text-text-muted" />
            <a
              href="https://github.com/pizzarobotstudios"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline text-sm"
            >
              github.com/pizzarobotstudios
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
