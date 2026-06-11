import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  title: 'We Made AI Status Embeddable: One Line of HTML, Live on Any Site',
  description:
    'We shipped a free, self-contained widget that puts real-time operational status and latency for every major AI provider into any site with one line of HTML. Here is how it works, why it is honest by construction, and why a trust widget never carries an ad.',
  alternates: { canonical: 'https://tensorfeed.ai/originals/live-ai-status-widget' },
  openGraph: {
    title: 'We Made AI Status Embeddable: One Line of HTML, Live on Any Site',
    description:
      'A free embeddable live AI status console. Sixteen LLMs and counting, real latency where we probe and real 7-day uptime where we do not, no cry-wolf, no ads. One line of HTML, an npm component, or a browser extension.',
    type: 'article',
    url: 'https://tensorfeed.ai/originals/live-ai-status-widget',
    publishedTime: '2026-05-15T22:00:00Z',
    authors: ['Adrian Vale'],
    images: [{ url: '/originals/live-ai-status-widget/hero.jpg', width: 1200, height: 675 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'We Made AI Status Embeddable: One Line of HTML',
    description:
      'Free live AI status console you can drop on any site. Honest by construction, no ads. iframe, npm, or extension.',
    images: ['/originals/live-ai-status-widget/hero.jpg'],
  },
};

export default function LiveAiStatusWidgetPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="We Made AI Status Embeddable: One Line of HTML, Live on Any Site"
        description="We shipped a free, self-contained widget that puts real-time operational status and latency for every major AI provider into any site with one line of HTML. How it works, why it is honest by construction, and why a trust widget never carries an ad."
        datePublished="2026-05-15"
        author="Adrian Vale"
        image="https://tensorfeed.ai/originals/live-ai-status-widget/hero.jpg"
        url="https://tensorfeed.ai/originals/live-ai-status-widget"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <ArticleHero
        mode="photo"
        src="/originals/live-ai-status-widget/hero.jpg"
        alt="The TensorFeed Live Monitor widget: a sci-fi console showing sixteen AI providers, each with status and latency, against a dark nebula background."
        caption="The Live Monitor widget, the actual production render, embeddable on any site."
      />

      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          We Made AI Status Embeddable: One Line of HTML, Live on Any Site
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-05-15">May 15, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/live-ai-status-widget"
        title="We Made AI Status Embeddable: One Line of HTML, Live on Any Site"
      />

      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Every team building on AI depends on APIs it does not control. Claude, GPT, Gemini,
          Mistral, the gateways in front of them. When one of those degrades, the blast radius is
          everyone downstream, and the first thing a developer wants is a single honest answer to
          a single question: is it them, or is it me. We just made that answer embeddable.
        </p>

        <p>
          The TensorFeed Live Monitor is a free, self-contained widget. One line of HTML drops a
          real-time status console for every major AI provider onto any site. It is the same live
          data behind our{' '}
          <Link href="/status" className="text-accent-primary hover:underline">
            status dashboard
          </Link>
          , surfaced for your pages instead of ours. Showcase, live preview, and the copy-paste
          snippet are at{' '}
          <Link href="/embed" className="text-accent-primary hover:underline">
            tensorfeed.ai/embed
          </Link>
          .
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          A status widget that lies is worse than no widget
        </h2>

        <p>
          The entire value of this thing is trust. The moment it shows a green provider as red, or
          invents a number it does not have, it is a liability on whatever site embedded it. So we
          built it honest by construction, and that constraint drove most of the engineering.
        </p>

        <p>
          Vendor status is authoritative. We measure p95 latency for the providers we actively
          probe, and for those we show the real number. For the providers we do not latency-probe,
          we do not draw a fake chart and we do not print a placeholder that looks broken. We show
          their real seven-day uptime percentage, computed from minute-resolution polling, because
          that is a true number we actually have. Every row carries real data or it carries
          nothing, never something that looks like data and is not.
        </p>

        <p>
          The hardest call was the cry-wolf trap. Our own synthetic probe will sometimes report a
          provider as failing when the real cause is our probe key hitting a quota, not the
          provider being down. A public widget that tells the world a healthy provider is critical
          because of our internal limits would destroy the credibility that makes it worth
          embedding. So the probe never overrides vendor status. A provider with no status source
          is labeled NO DATA, shown in grey, and explicitly not counted as an outage. Condition
          Green never sits next to an implied failure. The dramatic red alert chrome is real and it
          fires, but only when something is actually down.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Why a widget, and why free
        </h2>

        <p>
          Distribution for an agent-first product is not banner ads. It is being the surface other
          people choose to put on their own site, and being the source an agent cites when asked.
          Every embed is three things at once: a backlink, a brand impression, and a
          machine-readable pointer back to the canonical feeds, on a site we do not own and did
          not have to pay for. The Detail control on every row deep-links to the per-provider page
          on TensorFeed. The discovery loop closes itself, for humans and for agents, and it
          compounds.
        </p>

        <p>
          It is free and it will stay free, with no ads. That is not generosity, it is the
          business model being coherent. Our revenue is premium data for agents, not attention
          arbitrage. An ad on a trust widget erodes the exact credibility that makes the widget
          spread. If this ever does numbers that make an ad conversation tempting, the right answer
          will still be no, because the asset is the trust.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Three ways to embed it</h2>

        <p>
          One line of HTML, anywhere:
        </p>

        <pre className="bg-bg-secondary border border-border-primary rounded p-4 overflow-x-auto text-sm text-text-primary"><code>{`<iframe src="https://tensorfeed.ai/widget/status"
        title="TensorFeed live AI status" width="100%" height="600"
        loading="lazy" style="border:0;max-width:720px"></iframe>`}</code></pre>

        <p>
          A zero-dependency component for anything with a build step. It is a framework-agnostic
          web component plus a helper for React, MIT licensed, SSR-safe:
        </p>

        <pre className="bg-bg-secondary border border-border-primary rounded p-4 overflow-x-auto text-sm text-text-primary"><code>{`npm install @tensorfeed/status-widget

import '@tensorfeed/status-widget';
<tensorfeed-status accent="blue" poll="30"></tensorfeed-status>`}</code></pre>

        <p>
          And a browser extension: the same live console in a toolbar popup, with a badge that
          quietly turns amber or red the moment a provider degrades, so you see AI health without
          opening anything. It is{' '}
          <a
            href="https://chrome.google.com/webstore/detail/pdmcjopgilbnggocemjjncpcenpmglde"
            className="text-accent-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            live on the Chrome Web Store
          </a>
          ; Firefox build is next.{' '}
          <Link
            href="/originals/ai-status-extension-live"
            className="text-accent-primary hover:underline"
          >
            Full write-up here
          </Link>
          .
        </p>

        <p>
          Default look is a light-blue bridge spine with green status indicators, which keeps the
          contrast legible at a glance. Add{' '}
          <code>?accent=auto</code> to make the whole console go green when every system is
          nominal, or <code>?accent=green</code> to force it. Add <code>?poll=60</code> to slow the
          refresh on a low-traffic page. No API key, no tracking, no host-page CSS dependency. It
          cannot break your site and your site cannot break it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Where this goes</h2>

        <p>
          It already covers sixteen LLM providers and a set of services, and it grows itself: when
          we add a provider to monitoring, it appears in every embed automatically, with no
          redeploy on anyone&apos;s part. The next layer is sharper detection, teaching the probe
          to tell our own infrastructure limits apart from a real provider failure, so the widget
          can flag a degradation before the vendor status page admits it. That is the difference
          between a status mirror and an early-warning system, and it is the direction.
        </p>

        <p>
          For now: it is live, it is honest, it is free, and it is one line of HTML. Drop it on
          your status page, your docs, your internal dashboard, or your portfolio. Preview every
          option and grab the snippet at{' '}
          <Link href="/embed" className="text-accent-primary hover:underline">
            tensorfeed.ai/embed
          </Link>
          . If you are building agents, the same truth is one fetch away at{' '}
          <Link href="/developers" className="text-accent-primary hover:underline">
            the developer API
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
