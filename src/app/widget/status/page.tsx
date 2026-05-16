import type { Metadata } from 'next';
import Widget from './Widget';
import WarpField from './WarpField';

/**
 * Embeddable TensorFeed Live Monitor.
 *
 * Renders as its own document at /widget/status and drops into any site
 * via an iframe. Site chrome is route-gated off /widget/* (ChromeGate /
 * Navbar / ConditionalFooter); fonts load via the /widget layout's
 * next/font setup; styling is the design's drop-in tensorfeed.css.
 *
 * Background stage (nebula + perspective grid + warp canvas + vignette +
 * scanlines) per the design handoff section 6. All decorative layers are
 * aria-hidden; the warp canvas bails out under prefers-reduced-motion.
 *
 *   <iframe src="https://tensorfeed.ai/widget/status"
 *           width="100%" height="600" title="TensorFeed live monitor"
 *           style="border:0"></iframe>
 *
 * Accent: ?accent=auto (default, green when all nominal else blue) |
 * blue | green. Poll: ?poll=<seconds> (5 to 600, default 30).
 *
 * The human-facing showcase + copy-paste snippets live at /embed.
 */

export const metadata: Metadata = {
  title: 'TensorFeed Live Monitor Widget',
  description:
    'Embeddable real-time status monitor for major AI providers and services, with p95 latency. Free iframe widget powered by TensorFeed.ai.',
  alternates: { canonical: 'https://tensorfeed.ai/embed' },
  robots: { index: false, follow: true },
};

const widgetJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'TensorFeed Live Monitor Widget',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any',
  url: 'https://tensorfeed.ai/widget/status',
  description:
    'Free embeddable widget showing real-time operational status and p95 latency for major AI providers and services.',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@type': 'Organization', name: 'TensorFeed', url: 'https://tensorfeed.ai' },
  isBasedOn: ['https://tensorfeed.ai/api/status/summary', 'https://tensorfeed.ai/api/probe/latest'],
  mainEntityOfPage: 'https://tensorfeed.ai/status',
};

export default function StatusWidgetPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(widgetJsonLd) }}
      />
      <div className="tf-nebula" aria-hidden="true" />
      <div className="tf-grid" aria-hidden="true" />
      <WarpField speed={0.5} />
      <div className="tf-arc" aria-hidden="true" />
      <div className="tf-scanlines" aria-hidden="true" />
      <div className="tf-stage">
        <Widget />
      </div>
    </>
  );
}
