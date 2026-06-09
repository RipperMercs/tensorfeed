import { Metadata } from 'next';
import Link from 'next/link';
import { Activity, ArrowRight, HelpCircle } from 'lucide-react';
import { WebApplicationJsonLd, FAQPageJsonLd, BreadcrumbListJsonLd, ServiceJsonLd } from '@/components/seo/JsonLd';
import LiveServiceStatus from '@/components/status/LiveServiceStatus';
import EarlyWarningIncidents from '@/components/status/EarlyWarningIncidents';

interface StatusService {
  name: string;
  provider: string;
  status: string;
  statusPageUrl?: string;
  components: { name: string; status: string }[];
  lastChecked?: string;
}

async function fetchClaudeStatus(): Promise<StatusService | null> {
  try {
    const res = await fetch('https://tensorfeed.ai/api/status', { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.services?.length) {
        return data.services.find((s: StatusService) => s.name === 'Claude API') || null;
      }
    }
  } catch {}
  return null;
}

export const metadata: Metadata = {
  title: 'Claude Status: Is Claude Down Right Now? Live Anthropic API Tracker',
  description:
    'Check if Claude is down right now. Real-time Claude API status monitoring with live updates. See current outages, degraded performance, and component status for Anthropic Claude.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/is-claude-down',
    title: 'Claude Status: Is Claude Down Right Now? Live Anthropic API Tracker',
    description:
      'Check if Claude is down right now. Real-time Claude API status monitoring with live updates. See current outages, degraded performance, and component status for Anthropic Claude.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Claude Status: Is Claude Down Right Now? Live Anthropic API Tracker',
    description:
      'Check if Claude is down right now. Real-time Claude API status monitoring with live updates. See current outages, degraded performance, and component status for Anthropic Claude.',
  },
};

function getDynamicFaqAnswer(status: string): string {
  switch (status) {
    case 'operational':
      return 'No, Claude is not down right now. All systems are operational and functioning normally.';
    case 'degraded':
      return 'Claude is currently experiencing degraded performance. Some features may be slower than usual or intermittently unavailable.';
    case 'down':
      return 'Yes, Claude appears to be down right now. Anthropic is likely investigating the issue. Check back here for live updates.';
    default:
      return 'We are currently unable to determine Claude status. Visit status.anthropic.com or check back shortly for an update.';
  }
}

export default async function IsClaudeDownPage() {
  const service = await fetchClaudeStatus();
  const status = service?.status || 'unknown';

  const faqs = [
    {
      question: 'Is Claude down right now?',
      answer: getDynamicFaqAnswer(status),
    },
    {
      question: 'How do I check if Claude is down?',
      answer:
        'Three options: (1) this page, which polls Anthropic every two minutes, (2) status.anthropic.com directly, (3) the @AnthropicAI account on X for incident commentary. Our page combines the official status feed with component-level detail (Claude API, Console, Workbench) and adds historical context the official page does not show.',
    },
    {
      question: 'What do I do when Claude is down?',
      answer:
        'Switch to ChatGPT or Gemini for chat-style work, or use the OpenRouter cross-provider catalog for API workloads since it routes around individual provider outages. For coding tasks specifically, Claude Code agents will retry automatically once the API recovers. Subscribe to outage alerts from TensorFeed if you want to be notified the moment status changes.',
    },
    {
      question: 'How often does Claude go down?',
      answer:
        'Claude has historically maintained 99.5%+ uptime across the API and chat surface. Major outages (>30 min impact) happen roughly once per quarter; brief degradation events (a few minutes of elevated latency or partial Workbench unavailability) happen a few times per month. Most issues are resolved within 15 to 60 minutes.',
    },
    {
      question: 'Is the Claude API the same as claude.ai?',
      answer:
        'No. The Claude API (api.anthropic.com) is the developer endpoint that powers Claude integrations and Claude Code. claude.ai is the consumer chat interface that runs on top of the API plus session/auth/billing layers. They share underlying model infrastructure but they have separate status surfaces. When the API goes down, claude.ai usually goes down too. When claude.ai goes down for auth or rate-limit reasons, the API may still be fine.',
    },
    {
      question: 'Where can I see Claude incident history?',
      answer:
        'Anthropic publishes incident history at status.anthropic.com. Our incidents endpoint at tensorfeed.ai/incidents aggregates incidents across every tracked AI provider in one feed, so you can see Claude alongside ChatGPT, Gemini, and others to compare reliability.',
    },
    {
      question: 'Does Claude Code work when Claude is down?',
      answer:
        'No. Claude Code calls the same Anthropic API as the chat app. When the API is down, Claude Code commands will fail with a network or 5xx error. Claude Code agents do automatically retry once the API recovers, so many short outages are invisible to in-progress workflows.',
    },
    {
      question: 'Why is Claude down right now?',
      answer:
        'Most Claude outages trace to one of a few causes: a spike in API traffic that overwhelms capacity, a bad deploy that Anthropic rolls back within minutes, an upstream cloud or networking issue, or elevated error rates on a single component (the API, Console, or Workbench) rather than the whole service. The status box above reflects the current state. When it shows degraded or down, Anthropic is typically already investigating. When it shows operational but you are still seeing errors, the cause is more likely on your side: an expired API key, a hit rate limit, or a local network issue.',
    },
    {
      question: 'Is it just me, or is Claude down for everyone?',
      answer:
        'This page checks Anthropic\'s own status feed, so it reflects the global picture, not your individual connection. If the status above is green but Claude is failing for you, the problem is almost certainly local: a rate limit on your account, an expired or wrong API key, a browser extension or VPN interfering with claude.ai, or your own network. If the status shows degraded or down, it is affecting everyone and waiting it out (or switching to a fallback) is the move.',
    },
    {
      question: 'How long do Claude outages usually last?',
      answer:
        'Most Claude incidents resolve within 15 to 60 minutes. Brief degradation (a few minutes of elevated latency or a partial Workbench issue) is the most common kind and usually clears on its own. Full API outages are rarer and tend to be the ones Anthropic posts about on status.anthropic.com with a running incident timeline. If an outage runs past an hour, switching to a fallback like ChatGPT, Gemini, or OpenRouter is usually faster than waiting.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name="Is Claude Down? Live Claude API Status Monitor"
        description="Real-time Claude API status monitoring. Check if Claude is down, experiencing degraded performance, or fully operational."
        url="https://tensorfeed.ai/is-claude-down"
      />
      <ServiceJsonLd
        serviceName="Claude API"
        providerName="Anthropic"
        providerUrl="https://www.anthropic.com"
        url="https://tensorfeed.ai/is-claude-down"
        description="Anthropic's Claude family of large language model APIs, including Opus, Sonnet, and Haiku. Used by AI agents, Claude Code, and the claude.ai consumer chat interface."
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'AI Service Status', url: 'https://tensorfeed.ai/status' },
          { name: 'Is Claude Down?', url: 'https://tensorfeed.ai/is-claude-down' },
        ]}
      />
      <FAQPageJsonLd faqs={faqs} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Is Claude Down?</h1>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green" />
          </span>
        </div>
        <p className="text-text-muted text-sm">
          Live Claude API status from Anthropic. Auto-refreshes every 2 minutes.
        </p>
      </div>

      {/* Live status indicator + component breakdown (polls /api/status every 2 min) */}
      <LiveServiceStatus serviceName="Claude API" providerName="Claude" initial={service} />

      {/* Early-warning probe callout + last-10 incident history (polls every 2 min) */}
      <EarlyWarningIncidents serviceName="Claude API" provider="Anthropic" />

      {/* What to do when Claude is down */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">What to do when Claude is down</h2>
        <p className="text-text-secondary text-sm leading-relaxed mb-4">
          Claude API outages typically resolve within 15 to 60 minutes. Three practical options
          while you wait, ranked by quality of fallback for typical Claude use cases:
        </p>
        <div className="space-y-3">
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">For chat and writing: ChatGPT or Gemini</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Both are at the top of our{' '}
              <Link href="/best-ai-chatbots" className="text-accent-primary hover:underline">
                AI chatbot comparison
              </Link>{' '}
              and are the closest substitutes for Claude on quality. Live status:{' '}
              <Link href="/is-chatgpt-down" className="text-accent-primary hover:underline">
                Is ChatGPT down?
              </Link>{' '}
              and{' '}
              <Link href="/is-gemini-down" className="text-accent-primary hover:underline">
                Is Gemini down?
              </Link>
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">For coding agents: keep retrying or fall back to GPT-5.5</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Claude Code retries automatically once the API recovers, so brief outages are often
              invisible to in-progress work. For larger outages, switch your CLI agent to GPT-5.5
              or Gemini 2.5 Pro temporarily; both produce strong code, just with slightly different
              conventions than Claude.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">For API workloads: route through OpenRouter</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              OpenRouter automatically falls back across providers when any single one returns
              errors. See the{' '}
              <Link href="/api/openrouter/models" className="text-accent-primary hover:underline">
                OpenRouter model catalog
              </Link>{' '}
              for the full list of available models, including Claude variants when they recover.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Get notified when status changes</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Subscribe to{' '}
              <Link href="/alerts" className="text-accent-primary hover:underline">
                TensorFeed outage alerts
              </Link>{' '}
              to get an email the moment Claude (or any tracked AI service) goes degraded or down,
              and again when it recovers. Free, no account required.
            </p>
          </div>
        </div>
      </section>

      {/* Check Other Services */}
      <div className="mb-10">
        <Link
          href="/status"
          className="inline-flex items-center gap-2 bg-bg-secondary border border-border rounded-lg px-5 py-3 hover:border-accent-primary transition-colors group"
        >
          <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
            Check other AI services
          </span>
          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
        </Link>
      </div>

      {/* FAQ Section */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-accent-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="bg-bg-secondary border border-border rounded-lg p-5"
            >
              <h3 className="text-text-primary font-semibold mb-2">{faq.question}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
