import type { Metadata } from 'next';
import StatusWidget from './StatusWidget';

/**
 * Embeddable status widget. Star-trek-ish tabbed view across major AI
 * providers, real-time status from /api/status/summary, polled every
 * 60 seconds. Designed to drop into any site via:
 *
 *   <iframe src="https://tensorfeed.ai/widget/status"
 *           width="420" height="320" frameborder="0"></iframe>
 *
 * No chrome (no nav, no footer, no cookie banner) so host pages get a
 * clean drop-in. Aggressive cache: static export at build + 60s edge
 * cache + 60s client poll.
 *
 * URL variants (all planned):
 *   /widget/status                — full board (this page)
 *   /widget/status/[provider]     — single provider card (TODO)
 *   /widget/status/badge          — minimal badge (TODO)
 */

export const metadata: Metadata = {
  title: 'AI Provider Status Widget | TensorFeed',
  description: 'Real-time operational status across Anthropic, OpenAI, Google, Mistral, and other major AI providers. Embeddable iframe widget powered by TensorFeed.ai.',
  robots: {
    index: false,    // Widget pages should not show up in search results;
    follow: false,   // they exist to be embedded, not discovered directly.
  },
  other: {
    // Allow iframe embedding from any origin. The widget IS the
    // embeddable surface; restricting frame-ancestors defeats the
    // purpose. Cloudflare may set its own X-Frame-Options at the edge;
    // public/_headers contains the override for /widget/* routes.
    'X-Frame-Options': 'ALLOWALL',
  },
};

export default function StatusWidgetPage() {
  return <StatusWidget />;
}
