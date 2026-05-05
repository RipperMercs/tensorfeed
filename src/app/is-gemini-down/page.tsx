import { Metadata } from 'next';
import Link from 'next/link';
import { Activity, ArrowRight, HelpCircle } from 'lucide-react';
import { STATUS_DOTS, STATUS_COLORS } from '@/lib/constants';
import { WebApplicationJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';

interface StatusService {
  name: string;
  provider: string;
  status: string;
  statusPageUrl?: string;
  components: { name: string; status: string }[];
  lastChecked?: string;
}

async function fetchGeminiStatus(): Promise<StatusService | null> {
  try {
    const res = await fetch('https://tensorfeed.ai/api/status', { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.services?.length) {
        return (
          data.services.find(
            (s: StatusService) =>
              s.name === 'Gemini API' ||
              s.name.includes('Gemini') ||
              s.name.includes('Google AI')
          ) || null
        );
      }
    }
  } catch {}
  return null;
}

export const metadata: Metadata = {
  title: 'Gemini Status: Is Google Gemini Down? Live Google AI API Tracker',
  description:
    'Check if Gemini is down right now. Real-time Google Gemini API status monitoring with live updates. See current outages, degraded performance, and component status for Google AI.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/is-gemini-down',
    title: 'Gemini Status: Is Google Gemini Down? Live Google AI API Tracker',
    description:
      'Check if Gemini is down right now. Real-time Google Gemini API status monitoring with live updates. See current outages, degraded performance, and component status for Google AI.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Gemini Status: Is Google Gemini Down? Live Google AI API Tracker',
    description:
      'Check if Gemini is down right now. Real-time Google Gemini API status monitoring with live updates. See current outages, degraded performance, and component status for Google AI.',
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
      return 'Gemini is up and running normally. All systems are operational.';
    case 'degraded':
      return 'Gemini is experiencing degraded performance. Some features may be slower or intermittently unavailable.';
    case 'down':
      return 'Gemini is currently down. Google is likely aware and working on a fix.';
    default:
      return 'Unable to determine Gemini status at this time. Check back shortly.';
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
      return 'Gemini is Operational';
    case 'degraded':
      return 'Gemini is Degraded';
    case 'down':
      return 'Gemini is Down';
    default:
      return 'Gemini Status Unknown';
  }
}

function getDynamicFaqAnswer(status: string): string {
  switch (status) {
    case 'operational':
      return 'No, Gemini is not down right now. All systems are operational and functioning normally.';
    case 'degraded':
      return 'Gemini is currently experiencing degraded performance. Some features may be slower than usual or intermittently unavailable.';
    case 'down':
      return 'Yes, Gemini appears to be down right now. Google is likely investigating the issue. Check back here for live updates.';
    default:
      return 'We are currently unable to determine Gemini status. Visit the Google Cloud status page or check back shortly for an update.';
  }
}

export default async function IsGeminiDownPage() {
  const service = await fetchGeminiStatus();
  const status = service?.status || 'unknown';

  const faqs = [
    {
      question: 'Is Gemini down right now?',
      answer: getDynamicFaqAnswer(status),
    },
    {
      question: 'How do I check if Gemini is down?',
      answer:
        'Three options: (1) this page, which polls Google Cloud every two minutes, (2) the Google Cloud status dashboard at status.cloud.google.com directly, (3) the @GoogleAI account on X for incident commentary. Our page combines the official status feed with component-level detail (Gemini API, Vertex AI, Google AI Studio) and adds historical context the official page does not show.',
    },
    {
      question: 'What do I do when Gemini is down?',
      answer:
        'Switch to Claude or ChatGPT for chat-style work. For developer API workloads, the Gemini API is part of Vertex AI and Google AI Studio; sometimes one is degraded while the other still works. Check the component-level status above. Subscribe to outage alerts from TensorFeed if you want to be notified the moment status changes.',
    },
    {
      question: 'How often does Gemini go down?',
      answer:
        'Gemini has historically maintained 99.5%+ uptime backed by Google Cloud infrastructure. Major outages (>30 min impact) are less frequent than ChatGPT or Claude on average, often in the range of once per quarter. Brief degradation events tend to be region-specific and resolved quickly given Google Cloud&apos;s global redundancy.',
    },
    {
      question: 'Is Gemini API the same as gemini.google.com?',
      answer:
        'No. The Gemini API is the developer endpoint accessed through Vertex AI or Google AI Studio. gemini.google.com is the consumer chat interface. They share underlying model infrastructure but have separate status surfaces. When the API is down, the consumer chat usually is too. When gemini.google.com is down for auth or rate-limit reasons, the API may still work fine.',
    },
    {
      question: 'Where can I see Gemini incident history?',
      answer:
        'Google publishes Cloud incident history at status.cloud.google.com. Our incidents endpoint at tensorfeed.ai/incidents aggregates incidents across every tracked AI provider in one feed, so you can compare Gemini alongside Claude, ChatGPT, and others to evaluate reliability.',
    },
    {
      question: 'Is Bard the same as Gemini?',
      answer:
        'Bard was renamed to Gemini in February 2024 and the Bard URL now redirects to gemini.google.com. The "Bard is down" query is essentially the same query as "Gemini is down" today. We track the current Gemini surface; the Bard brand is fully retired.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name="Is Gemini Down? Live Google AI Status Monitor"
        description="Real-time Google Gemini API status monitoring. Check if Gemini is down, experiencing degraded performance, or fully operational."
        url="https://tensorfeed.ai/is-gemini-down"
      />
      <FAQPageJsonLd faqs={faqs} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Is Gemini Down?</h1>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green" />
          </span>
        </div>
        <p className="text-text-muted text-sm">
          Live Gemini API status from Google. Auto-refreshes every 2 minutes.
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

      {/* What to do when Gemini is down */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">What to do when Gemini is down</h2>
        <p className="text-text-secondary text-sm leading-relaxed mb-4">
          Gemini outages typically resolve within 15 to 45 minutes. Google Cloud&apos;s global
          redundancy means most degradations are region-specific. Three practical alternatives:
        </p>
        <div className="space-y-3">
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">For chat and writing: Claude or ChatGPT</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Both are at the top of our{' '}
              <Link href="/best-ai-chatbots" className="text-accent-primary hover:underline">
                AI chatbot comparison
              </Link>. Claude leads on coding and careful writing; ChatGPT wins on plugin
              ecosystem and image generation. Live status:{' '}
              <Link href="/is-claude-down" className="text-accent-primary hover:underline">
                Is Claude down?
              </Link>{' '}
              and{' '}
              <Link href="/is-chatgpt-down" className="text-accent-primary hover:underline">
                Is ChatGPT down?
              </Link>
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">For long documents: Claude Opus 4.7 or GPT-5.5</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Gemini&apos;s 1M-token context was its biggest differentiator until Claude Opus 4.7
              and GPT-5.5 caught up in 2026. Both now handle the same document sizes. Quality on
              long-context analysis is competitive across all three.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">For developers: try a different region or route through OpenRouter</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Vertex AI is region-scoped; an outage in us-central1 may not affect europe-west4.
              Try a different region first. For broader fallback, route through{' '}
              <Link href="/api/openrouter/models" className="text-accent-primary hover:underline">
                OpenRouter
              </Link>{' '}
              which automatically routes around individual provider outages.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Get notified when status changes</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Subscribe to{' '}
              <Link href="/alerts" className="text-accent-primary hover:underline">
                TensorFeed outage alerts
              </Link>{' '}
              to get an email the moment Gemini (or any tracked AI service) goes degraded or down,
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
