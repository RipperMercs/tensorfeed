import Link from 'next/link';
import { ArrowRight, Code2 } from 'lucide-react';

/**
 * Live widget showcase + get-it actions, rendered at the bottom of
 * /status. We dogfood our own embeddable widget here: the iframe below
 * is the exact production widget anyone else would embed, pointed at
 * the same origin. Seeing it run on our own status page is the
 * strongest possible trust signal, and it doubles as the download hub
 * (embed code, npm component, extension). Kept as one self-contained
 * component so the touch to status/page.tsx stays a single line.
 */
export default function EmbedCallout() {
  return (
    <section aria-labelledby="embed-showcase-heading" className="mt-12">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 rounded-lg bg-accent-primary/15 shrink-0">
          <Code2 className="w-6 h-6 text-accent-primary" />
        </div>
        <h2 id="embed-showcase-heading" className="text-xl font-bold text-text-primary">
          The embeddable widget, running live
        </h2>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed max-w-2xl mb-5">
        This is not a screenshot. It is the exact production widget anyone can drop on their own
        site, embedded here on our own status page. Free, one line of HTML, no API key, no
        tracking. It is the same live data you just scrolled through, surfaced for anyone who
        wants it.
      </p>

      <div
        className="rounded-xl border border-bg-tertiary overflow-hidden flex justify-center mb-5"
        style={{ background: '#04070d' }}
      >
        <iframe
          src="/widget/status?accent=blue&utm_source=status&utm_medium=showcase"
          title="TensorFeed live AI status widget, running"
          loading="lazy"
          style={{ width: '100%', height: 620, border: 0, display: 'block' }}
        />
      </div>

      <div
        className="rounded-xl border border-bg-tertiary p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div>
          <h3 className="text-base font-bold text-text-primary mb-1">Put it on your site</h3>
          <p className="text-sm text-text-secondary leading-relaxed max-w-xl">
            One line of HTML, or the zero-dependency component:{' '}
            <code className="text-text-primary">npm i @tensorfeed/status-widget</code>. The
            browser extension is live on{' '}
            <a
              href="https://chrome.google.com/webstore/detail/pdmcjopgilbnggocemjjncpcenpmglde"
              className="text-accent-cyan hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chrome
            </a>{' '}
            and{' '}
            <a
              href="https://addons.mozilla.org/addon/tensorfeed-ai-status/"
              className="text-accent-cyan hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Firefox
            </a>
            .
          </p>
        </div>
        <Link
          href="/embed?utm_source=status&utm_medium=callout"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap text-white self-start sm:self-auto"
          style={{ background: 'var(--accent-primary)' }}
        >
          Get the embed code <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
