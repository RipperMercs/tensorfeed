import { Metadata } from 'next';
import { History } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Changelog | What We Shipped',
  description: 'Public build log for TensorFeed.ai. Every feature, fix, and improvement we ship, documented in real time.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/changelog',
    title: 'Changelog | What We Shipped',
    description: 'Public build log for TensorFeed.ai. Every feature, fix, and improvement we ship, documented in real time.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Changelog | What We Shipped',
    description: 'Public build log for TensorFeed.ai. Every feature, fix, and improvement we ship, documented in real time.',
  },
};

const CHANGELOG = [
  {
    date: 'March 29, 2026',
    entries: [
      'Launched TensorFeed.ai with 12 RSS sources aggregating AI news',
      'Built AI service status dashboard monitoring 6 providers in real time',
      'Created developer API docs page with code examples at /developers',
      'Added /is-claude-down and /is-chatgpt-down live status pages',
      'Expanded to 8+ "Is X Down?" pages for all major AI services',
      'Integrated TerminalFeed.io live data feeds (GitHub trending, predictions, cyber threats, internet pulse)',
      'Built agent activity tracking with live sidebar widget',
      'Created llms.txt, llms-full.txt (63KB), and .md page variants for AI agent discovery',
      'Added FAQ sections with FAQPage JSON-LD schema to all 6 pillar guide pages',
      'Implemented IndexNow for instant search engine notification on content updates',
      'Connected Google AdSense with ads.txt verification',
      'Set up GitHub Actions auto-deploy for Cloudflare Worker',
      'Added Cloudflare Cache API layer to reduce KV operations by ~90%',
      'Source diversity balancing (35% cap per source in feed)',
      'Source color-coded left borders on article cards',
      'Real-time news feed fetching from Worker API (replaced static build data)',
      'Dark mode as default, with light mode toggle',
      'Subtle breathing animation on navbar logo',
      'Security headers (nosniff, DENY framing, strict referrer)',
      'robots.txt welcoming 15+ AI crawler User-Agents',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <History className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Changelog</h1>
        </div>
        <p className="text-text-secondary text-lg">
          Everything we ship, documented in real time. Built in public by Ripper.
        </p>
      </div>

      <div className="space-y-10">
        {CHANGELOG.map((release) => (
          <section key={release.date}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-accent-primary shrink-0" />
              <h2 className="text-xl font-semibold text-text-primary">{release.date}</h2>
            </div>
            <div className="ml-6 border-l-2 border-border pl-6">
              <ul className="space-y-2">
                {release.entries.map((entry, i) => (
                  <li key={i} className="text-text-secondary text-sm leading-relaxed">
                    {entry}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
