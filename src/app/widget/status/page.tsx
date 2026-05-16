import type { Metadata } from 'next';
import StatusWidget from './StatusWidget';

/**
 * Embeddable AI provider status widget.
 *
 * Real-time status from /api/status/summary plus p95 latency from
 * /api/probe/latest, client-polled every 120s (matches the ~2 minute
 * server refresh). Drop into any site via:
 *
 *   <iframe src="https://tensorfeed.ai/widget/status"
 *           width="100%" height="560" frameborder="0"
 *           title="AI provider status by TensorFeed"></iframe>
 *
 * Theme: append ?theme=light or ?theme=auto to the src.
 *
 * No chrome (no nav, footer, or cookie banner) so host pages get a clean
 * drop-in. Frame policy lives in public/_headers (CSP frame-ancestors *
 * for /widget/*); embedding is not controlled from page metadata.
 *
 * The human-facing showcase + copy-paste snippets live at /embed.
 *
 * Follow-up formats (not yet built): /widget/status/[provider] single
 * card, and a minimal status badge SVG for README embedding.
 */

export const metadata: Metadata = {
  title: 'AI Provider Status Widget | TensorFeed',
  description:
    'Embeddable real-time status across Anthropic, OpenAI, Google, Mistral, and other major AI providers, with p95 latency. Free iframe widget powered by TensorFeed.ai.',
  alternates: { canonical: 'https://tensorfeed.ai/embed' },
  robots: {
    // The widget route exists to be embedded, not to rank. The indexable
    // discovery surface is /embed.
    index: false,
    follow: true,
  },
};

const widgetJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'TensorFeed AI Provider Status Widget',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any',
  url: 'https://tensorfeed.ai/widget/status',
  description:
    'Free embeddable widget showing real-time operational status and p95 latency for major AI providers (Claude, OpenAI, Gemini, Mistral, Cohere and more).',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: {
    '@type': 'Organization',
    name: 'TensorFeed',
    url: 'https://tensorfeed.ai',
  },
  isBasedOn: [
    'https://tensorfeed.ai/api/status/summary',
    'https://tensorfeed.ai/api/probe/latest',
  ],
  mainEntityOfPage: 'https://tensorfeed.ai/status',
};

export default function StatusWidgetPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(widgetJsonLd) }}
      />
      <StatusWidget />
    </>
  );
}
