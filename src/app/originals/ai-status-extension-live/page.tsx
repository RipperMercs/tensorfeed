import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';
import ShareBar from '@/components/originals/ShareBar';

const STORE_URL =
  'https://chrome.google.com/webstore/detail/pdmcjopgilbnggocemjjncpcenpmglde';

export const metadata: Metadata = {
  title:
    'TensorFeed AI Status Is Now a Chrome Extension. Live AI Health Sits in Your Toolbar.',
  description:
    'Our embeddable Live Monitor just shipped as a Chrome extension, approved and public on the Web Store. A toolbar popup with real status and real latency for every major AI provider, plus a badge that quietly turns amber or red the moment something degrades. One click to install, no account, no tracking.',
  alternates: {
    canonical: 'https://tensorfeed.ai/originals/ai-status-extension-live',
  },
  openGraph: {
    title:
      'TensorFeed AI Status Is Now a Chrome Extension. Live AI Health Sits in Your Toolbar.',
    description:
      'The Live Monitor, condensed into a toolbar popup with a passive degradation badge. Approved, public on the Chrome Web Store, free.',
    type: 'article',
    url: 'https://tensorfeed.ai/originals/ai-status-extension-live',
    publishedTime: '2026-05-20T18:00:00Z',
    authors: ['Ripper'],
    images: [
      {
        url: '/originals/live-ai-status-widget/hero.jpg',
        width: 1200,
        height: 675,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TensorFeed AI Status Is Now a Chrome Extension',
    description:
      'Live AI provider status in your toolbar. Public on the Chrome Web Store. Free, no account, no tracking.',
    images: ['/originals/live-ai-status-widget/hero.jpg'],
  },
};

export default function AiStatusExtensionLivePage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="TensorFeed AI Status Is Now a Chrome Extension. Live AI Health Sits in Your Toolbar."
        description="The TensorFeed Live Monitor shipped as a Chrome extension on May 20, 2026: a toolbar popup with real provider status and p95 latency, plus a passive degradation badge. Approved and public on the Chrome Web Store, free."
        datePublished="2026-05-20"
        author="Ripper"
        image="https://tensorfeed.ai/originals/live-ai-status-widget/hero.jpg"
        url="https://tensorfeed.ai/originals/ai-status-extension-live"
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
        alt="The TensorFeed Live Monitor, the same console that now ships as a Chrome extension popup."
        caption="The Live Monitor, now also a Chrome toolbar popup. Same live data, same honest rules."
      />

      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          TensorFeed AI Status Is Now a Chrome Extension. Live AI Health Sits in
          Your Toolbar.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-05-20">May 20, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />4 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/ai-status-extension-live"
        title="TensorFeed AI Status Is Now a Chrome Extension"
      />

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          As of today the TensorFeed Live Monitor is a Chrome extension,
          approved and public on the Chrome Web Store. One click installs a
          toolbar popup with real-time operational status and real p95 latency
          for every major AI provider, plus a passive badge that quietly turns
          amber or red the moment a provider degrades. Same live data,
          same honest-by-construction rules as the embeddable widget, in the
          surface that already lives next to your address bar.
        </p>

        <p>
          <a
            href={STORE_URL}
            className="text-accent-primary hover:underline font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Install TensorFeed AI Status on Chrome
          </a>
          . Free, no account, no tracking, no host-page permissions. It only
          talks to tensorfeed.ai.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Why a toolbar popup is the right surface
        </h2>

        <p>
          We{' '}
          <Link
            href="/originals/live-ai-status-widget"
            className="text-accent-primary hover:underline"
          >
            shipped the embeddable widget five days ago
          </Link>{' '}
          on the argument that the right surface for an AI health signal is the
          one you do not have to navigate to. An iframe on a status page is
          honest and useful, but a developer still has to remember to look.
          A toolbar extension closes the loop the other direction: the signal
          comes to you. When everything is nominal, the icon is calm. When a
          provider degrades, the badge changes color before you have any reason
          to suspect your own code is broken. Mean time to &ldquo;is it them or is it
          me&rdquo; goes from minutes of triage to a glance at the chrome of the
          browser itself.
        </p>

        <p>
          That is also the case for distribution. A widget compounds when other
          people embed it. An extension compounds when individual developers
          install it. Different fan-outs, same underlying truth, both pointing
          back at the same canonical feeds. Browser extension makes four
          distribution channels for the same data: the public dashboard, the
          embeddable widget, the npm component, and now the Chrome popup.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          The detail that almost killed the review
        </h2>

        <p>
          Chrome Web Store review is automated, strict, and unforgiving in ways
          that matter. Our first submission tripped a content-security-policy
          edge case: the extension popup embedded the same widget the public
          site embeds, and the widget&rsquo;s <code>frame-ancestors</code> directive
          had been written assuming only web origins. The Chrome extension
          context is{' '}
          <code>chrome-extension://&lt;id&gt;</code>, which is technically a
          frame ancestor and was technically not on the allow-list. The fix
          was a one-line CSP change at the widget origin to permit the
          extension scheme. Boring. Important. The kind of thing you only catch
          by actually shipping into a real review pipeline rather than testing
          locally.
        </p>

        <p>
          The discipline that fixed it is the same discipline behind the
          widget&rsquo;s no-fake-numbers rule: the popup either renders real live
          data from the same hardened endpoint everyone else hits, or it
          renders nothing. We did not paper over the CSP failure with a
          screenshot fallback or a cached snapshot. The popup is live or it is
          not present. That is what the review approved.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          What it does, exactly
        </h2>

        <p>
          Click the toolbar icon and you get the full Live Monitor: every LLM
          provider we cover, every service we monitor, with operational state,
          measured p95 latency where we actively probe, and real seven-day
          uptime where we do not. The detail control on every row deep-links
          to the per-provider page on TensorFeed for the full graph. Nothing
          in the popup is invented; if we do not have a number we do not draw
          one.
        </p>

        <p>
          The badge is the part that earns its keep. While you work, the
          extension polls the same <code>/api/status/summary</code> the
          dashboard does and updates the badge color: clear when everything is
          nominal, amber on degradation, red on a critical incident, grey when
          we are explicitly missing data for a provider rather than asserting
          a status we do not have. The cry-wolf rule the widget enforces holds
          in the extension too: a provider with no authoritative status source
          is labeled <span className="font-mono">NO DATA</span> and is not
          counted as an outage. Healthy providers do not get painted red because
          of our probe limits.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Permissions and what we do not ask for
        </h2>

        <p>
          The extension requests two things and only two things:{' '}
          <code>alarms</code> so the background worker can wake every few
          minutes to update the badge, and host access to{' '}
          <code>https://tensorfeed.ai/*</code> so the popup and worker can fetch
          our public status feeds. No <code>tabs</code>, no content scripts,
          no access to any other site, no analytics, no telemetry beacon. The
          set of things it can see is: TensorFeed&rsquo;s own public JSON. That is
          it. The review passed in part because the manifest is small enough
          that there is no ambiguity about what is going on.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Where this goes
        </h2>

        <p>
          Firefox build is queued next, same codebase, same manifest with the
          gecko-specific block already in place. After that the question is
          whether the badge should escalate from passive color change to an
          opt-in notification when a provider you have starred goes critical.
          The argument against is that notifications are noise debt; the
          argument for is that someone running an agent stack in production
          actually wants to know the second Claude starts returning 5xx, and
          the passive badge requires looking up. We will probably ship that
          gated behind explicit opt-in for the providers you mark as load-
          bearing, not on by default.
        </p>

        <p>
          For now: it is live, it is approved, it is free, and it is one
          click. Install it from the{' '}
          <a
            href={STORE_URL}
            className="text-accent-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Chrome Web Store
          </a>
          . If you want the embeddable version for your own site instead, the
          snippet, npm component, and live preview are at{' '}
          <Link
            href="/embed"
            className="text-accent-primary hover:underline"
          >
            tensorfeed.ai/embed
          </Link>
          . If you are building agents, the same truth is one fetch away at{' '}
          <Link
            href="/developers"
            className="text-accent-primary hover:underline"
          >
            the developer API
          </Link>
          .
        </p>
      </div>

      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/live-ai-status-widget"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              We Made AI Status Embeddable: One Line of HTML, Live on Any Site
            </span>
          </Link>
          <Link
            href="/originals/ai-status-monitoring-real-talk"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              AI Status Monitoring, Real Talk: What a Honest Board Owes You
            </span>
          </Link>
          <Link
            href="/originals/ai-service-outages-month"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              AI Service Outages: A Month at the Provider Layer
            </span>
          </Link>
        </div>
      </footer>

      <div className="flex flex-wrap items-center gap-4 mt-12 pt-6 border-t border-border text-sm">
        <Link
          href="/originals"
          className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Originals
        </Link>
        <Link
          href="/"
          className="text-text-muted hover:text-accent-primary transition-colors"
        >
          Back to Feed
        </Link>
      </div>
    </article>
  );
}
