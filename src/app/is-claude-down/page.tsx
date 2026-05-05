import { Metadata } from 'next';
import Link from 'next/link';
import { Activity, ArrowRight, HelpCircle } from 'lucide-react';
import { STATUS_DOTS, STATUS_COLORS } from '@/lib/constants';
import { WebApplicationJsonLd, FAQPageJsonLd, BreadcrumbListJsonLd, ServiceJsonLd } from '@/components/seo/JsonLd';

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

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_DOTS[status] || STATUS_DOTS.unknown}`}
    />
  );
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'operational':
      return 'Claude is up and running normally. All systems are operational.';
    case 'degraded':
      return 'Claude is experiencing degraded performance. Some features may be slower or intermittently unavailable.';
    case 'down':
      return 'Claude is currently down. Anthropic is likely aware and working on a fix.';
    default:
      return 'Unable to determine Claude status at this time. Check back shortly.';
  }
}

function getStatusBg(status: string): string {
  switch (status) {
    case 'operational':
      return 'from-accent-green/20 to-accent-green/5 border-accent-green/40';
    case 'degraded':
      return 'from-accent-amber/20 to-accent-amber/5 border-accent-amber/40';
    case 'down':
      return 'from-accent-red/20 to-accent-red/5 border-accent-red/40';
    default:
      return 'from-bg-tertiary to-bg-secondary border-border';
  }
}

function getStatusHeading(status: string): string {
  switch (status) {
    case 'operational':
      return 'Claude is Operational';
    case 'degraded':
      return 'Claude is Degraded';
    case 'down':
      return 'Claude is Down';
    default:
      return 'Claude Status Unknown';
  }
}

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

      {/* Big Status Indicator */}
      <div
        className={`bg-gradient-to-br ${getStatusBg(status)} border rounded-xl p-8 mb-8 text-center`}
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <span
            className={`inline-block w-5 h-5 rounded-full ${STATUS_DOTS[status] || STATUS_DOTS.unknown}`}
          />
          <h2 className="text-2xl font-bold text-text-primary">{getStatusHeading(status)}</h2>
        </div>
        <p className="text-text-secondary text-lg max-w-xl mx-auto">
          {getStatusMessage(status)}
        </p>
        {service?.lastChecked && (
          <p className="text-text-muted text-xs mt-4">
            Last checked:{' '}
            <span className="font-mono">
              {new Date(service.lastChecked).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </p>
        )}
      </div>

      {/* Component Status */}
      {service && service.components.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Component Status</h2>
          <div className="bg-bg-secondary border border-border rounded-xl divide-y divide-border">
            {service.components.map((comp) => (
              <div key={comp.name} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-text-secondary">{comp.name}</span>
                <div className="flex items-center gap-2">
                  <StatusDot status={comp.status} />
                  <span
                    className={`text-sm capitalize ${STATUS_COLORS[comp.status] || STATUS_COLORS.unknown}`}
                  >
                    {comp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
