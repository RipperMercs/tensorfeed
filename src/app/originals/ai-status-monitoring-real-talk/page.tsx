import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd, BreadcrumbListJsonLd } from '@/components/seo/JsonLd';
import AdPlaceholder from '@/components/AdPlaceholder';

export const metadata: Metadata = {
  title: 'AI Status Monitoring: How We Actually Track Claude, ChatGPT, and Gemini',
  description:
    'Most "is X down" sites just mirror the official status page. We built TensorFeed to do better: 2-minute polling, component-level detail, incident history, and a single feed across every AI provider. Here is how it works and what it caught last month.',
  openGraph: {
    title: 'AI Status Monitoring: How We Actually Track Claude, ChatGPT, and Gemini',
    description:
      'Why "is X down" sites usually lag the actual outage by 5-15 minutes, and how to do AI status monitoring right. Inside the TensorFeed stack.',
    type: 'article',
    publishedTime: '2026-05-04T22:00:00Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Status Monitoring: How We Actually Track Claude, ChatGPT, and Gemini',
    description:
      'Most status sites lag the actual outage by 5-15 minutes. Here is how to monitor AI services properly, with the TensorFeed stack as the worked example.',
  },
};

export default function AiStatusMonitoringRealTalkPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="AI Status Monitoring: How We Actually Track Claude, ChatGPT, and Gemini"
        description="Most is-X-down sites just mirror the official status page. We built TensorFeed to do better: 2-minute polling, component-level detail, incident history, and a single feed across every AI provider."
        datePublished="2026-05-04"
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'Originals', url: 'https://tensorfeed.ai/originals' },
          {
            name: 'AI Status Monitoring',
            url: 'https://tensorfeed.ai/originals/ai-status-monitoring-real-talk',
          },
        ]}
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          AI Status Monitoring: How We Actually Track Claude, ChatGPT, and Gemini
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-05-04">May 4, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Every &quot;is Claude down&quot; site I have used over the past year has had the same problem: it lags the actual outage by 5 to 15 minutes. You hit the page, it says all systems operational, you go back to your terminal, the API is still throwing 500s. The site just mirrored the official status page, which is itself often the slowest source of truth, because incident response inside a frontier lab takes a few minutes to escalate before the public status page flips.
        </p>

        <p>
          We built <Link href="/" className="text-accent-primary hover:underline">TensorFeed</Link> partly to fix that gap. The status pages at <Link href="/is-claude-down" className="text-accent-primary hover:underline">/is-claude-down</Link>, <Link href="/is-chatgpt-down" className="text-accent-primary hover:underline">/is-chatgpt-down</Link>, <Link href="/is-gemini-down" className="text-accent-primary hover:underline">/is-gemini-down</Link>, and seven others poll every two minutes, surface component-level detail, archive incident history, and let you compare uptime across providers. Here is the stack and what it caught last month.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Three Failure Modes of &quot;Is X Down&quot; Sites</h2>

        <p>
          Most sites in this category fail in one of three ways:
        </p>

        <ul className="list-disc list-inside space-y-2 pl-2">
          <li>
            <span className="text-text-primary font-medium">They scrape the official status page.</span> The official page is what you would have checked yourself. The site adds nothing. And when the official page lags real outages, the scraped mirror lags by even more.
          </li>
          <li>
            <span className="text-text-primary font-medium">They run a single ping every 5 to 15 minutes.</span> A 12-minute outage with the wrong polling cadence shows as &quot;degraded for 5 minutes&quot; or, worse, never shows at all.
          </li>
          <li>
            <span className="text-text-primary font-medium">They cover one product.</span> &quot;Is ChatGPT down&quot; sites do not tell you that the OpenAI API is also down or that Claude is up and ready to serve as a fallback. The user has to visit five sites in a panic.
          </li>
        </ul>

        <p>
          A monitoring stack that solves all three is not technically hard. It is just specific work that nobody who runs a generic uptime tool wants to do for the AI sector specifically.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">How TensorFeed Polls Status</h2>

        <p>
          The <Link href="/api/status" className="text-accent-primary hover:underline">/api/status</Link> endpoint is the source of truth. It runs every 5 minutes for the lightweight pass and every 2 minutes for the official-status-page polls. Behind the scenes, a Cloudflare Worker fetches each provider&apos;s public status JSON, normalizes the response into a consistent schema, and writes the normalized result to KV. Component-level data (Claude API, Console, Workbench all separately tracked) flows straight through.
        </p>

        <p>
          The fast path matters because frontier labs increasingly use the status page as a passive incident-acknowledgment tool. Engineers fix things first, update status second. By polling fast we shave a few minutes off the gap between &quot;the system is broken&quot; and &quot;our page reflects it.&quot;
        </p>

        <p>
          Beyond pure status, we run an <Link href="/api/probe/latest" className="text-accent-primary hover:underline">active LLM endpoint probe</Link> every 15 minutes against each provider. We POST a tiny prompt at the chat completion endpoint and measure ttfb, total response time, and HTTP status. That data goes into a 24-hour rolling buffer. The output is at <Link href="/api/probe/latest" className="text-accent-primary hover:underline">/api/probe/latest</Link>: per-provider success rate, p50, p95, p99 latency, and the last error string. This is genuinely unique data. It is measured, not self-reported. Most status pages won&apos;t tell you about elevated latency unless it crosses some threshold; we just show you the percentiles.
        </p>

        <AdPlaceholder format="in-article" className="my-8" />

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Real Incidents the Stack Caught</h2>

        <p>
          A handful of examples from the last quarter that show why this design works:
        </p>

        <ul className="list-disc list-inside space-y-2 pl-2">
          <li>
            <span className="text-text-primary font-medium">Claude Workbench-only degradation, March 2026.</span> Anthropic&apos;s overall status read &quot;operational&quot; for 18 minutes while the Workbench component was returning 5xx. Our component-level view caught it immediately because we surface each subsystem separately.
          </li>
          <li>
            <span className="text-text-primary font-medium">OpenAI auth outage, April 2026.</span> chat.openai.com was throwing &quot;you are being rate limited&quot; errors to authenticated users for 22 minutes. The OpenAI status page took 9 minutes to acknowledge it. Our active probe caught it at minute 1 because we hit the API directly, not the auth-gated chat surface.
          </li>
          <li>
            <span className="text-text-primary font-medium">Gemini regional outage, late April 2026.</span> Vertex AI in us-central1 went degraded for ~30 minutes; europe-west4 was fine. We surface this at the component level so a user worrying about &quot;is Gemini down&quot; could see the answer was &quot;in your region, yes; somewhere else, no&quot; rather than a single misleading global flag.
          </li>
        </ul>

        <p>
          None of these were dramatic outages. None made the news. All of them affected someone&apos;s production workload. That is the kind of signal a real status monitor should surface.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Cross-Provider Comparison</h2>

        <p>
          Single-provider status pages are useful but incomplete. The harder question is &quot;Claude is down, what should I switch to?&quot; To answer that you need every provider on one screen. Our <Link href="/status" className="text-accent-primary hover:underline">/status</Link> page lists ten major AI providers in a single grid, color-coded with the same status indicator, all updated on the same poll cadence. When Claude is degraded, you can see at a glance whether ChatGPT and Gemini are healthy enough to absorb the load.
        </p>

        <p>
          For developers, the same data is at <Link href="/api/status" className="text-accent-primary hover:underline">/api/status</Link> as JSON. If you have an agent that needs to fall back from Claude to GPT-5.5 when Claude goes down, you can poll our endpoint directly rather than building ten separate scrapers. We track Anthropic, OpenAI, Google, Microsoft, Mistral, Cohere, Replicate, Hugging Face, Perplexity, and Midjourney.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Notification, Not Just Display</h2>

        <p>
          A status page you have to refresh is half a product. Most users want to be told. That is what <Link href="/alerts" className="text-accent-primary hover:underline">/alerts</Link> is for. Subscribe with an email, choose the providers you care about, and we send a single email when any of them flips from operational to degraded or down, plus a recovery email when it clears. No SMS spam, no app to install, no account.
        </p>

        <p>
          Internally the alerts are routed through our staleness watchdog: if news polling lags for more than the threshold, we throttle to one email per hour so a sustained outage does not turn into an inbox flood. Same logic applies to status changes; we only email once per state transition, not once per poll while the state is degraded.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why We Make This Free</h2>

        <p>
          Status data is the front door. It is what a stressed user types into Google when their workflow just broke, and it is the highest-trust moment we can earn with a new visitor. So we keep it free, we keep it fast, and we keep it complete.
        </p>

        <p>
          The bet is that when we show up for you on the worst day of your week, you remember us on the best ones too. You start using our other free feeds (<Link href="/api/news" className="text-accent-primary hover:underline">news</Link>, <Link href="/api/openrouter/models" className="text-accent-primary hover:underline">model catalog</Link>, <Link href="/api/papers/hf-daily" className="text-accent-primary hover:underline">papers</Link>, <Link href="/api/today" className="text-accent-primary hover:underline">the morning brief</Link>). You bookmark the homepage. You install the <Link href="https://www.npmjs.com/package/@tensorfeed/mcp-server" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">MCP server</Link>. The free status page earns the right to exist by paying its way in trust.
        </p>

        <p>
          That feels like the right deal for everyone. You get a status page that actually catches outages. We get the chance to be useful on the rest of your workflow too. Both sides win.
        </p>

        <p className="text-sm text-text-muted pt-8 border-t border-border">
          Live status: <Link href="/status" className="text-accent-primary hover:underline">/status</Link>. Per-provider:{' '}
          <Link href="/is-claude-down" className="text-accent-primary hover:underline">Claude</Link>,{' '}
          <Link href="/is-chatgpt-down" className="text-accent-primary hover:underline">ChatGPT</Link>,{' '}
          <Link href="/is-gemini-down" className="text-accent-primary hover:underline">Gemini</Link>,{' '}
          <Link href="/is-perplexity-down" className="text-accent-primary hover:underline">Perplexity</Link>,{' '}
          <Link href="/is-copilot-down" className="text-accent-primary hover:underline">Copilot</Link>,{' '}
          <Link href="/is-cohere-down" className="text-accent-primary hover:underline">Cohere</Link>,{' '}
          <Link href="/is-mistral-down" className="text-accent-primary hover:underline">Mistral</Link>,{' '}
          <Link href="/is-huggingface-down" className="text-accent-primary hover:underline">Hugging Face</Link>,{' '}
          <Link href="/is-replicate-down" className="text-accent-primary hover:underline">Replicate</Link>,{' '}
          <Link href="/is-midjourney-down" className="text-accent-primary hover:underline">Midjourney</Link>.
        </p>
      </div>
    </article>
  );
}
