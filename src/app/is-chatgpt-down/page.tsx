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

async function fetchChatGPTStatus(): Promise<StatusService | null> {
  try {
    const res = await fetch('https://tensorfeed.ai/api/status', { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.services?.length) {
        return data.services.find((s: StatusService) => s.name === 'OpenAI API') || null;
      }
    }
  } catch {}
  return null;
}

export const metadata: Metadata = {
  title: 'ChatGPT Status: Is ChatGPT Down Right Now? Live OpenAI API Tracker',
  description:
    'Check if ChatGPT is down right now. Real-time OpenAI API status monitoring with live updates. See current outages, degraded performance, and component status for ChatGPT and OpenAI.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/is-chatgpt-down',
    title: 'ChatGPT Status: Is ChatGPT Down Right Now? Live OpenAI API Tracker',
    description:
      'Check if ChatGPT is down right now. Real-time OpenAI API status monitoring with live updates. See current outages, degraded performance, and component status for ChatGPT and OpenAI.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'ChatGPT Status: Is ChatGPT Down Right Now? Live OpenAI API Tracker',
    description:
      'Check if ChatGPT is down right now. Real-time OpenAI API status monitoring with live updates. See current outages, degraded performance, and component status for ChatGPT and OpenAI.',
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
      return 'ChatGPT is up and running normally. All systems are operational.';
    case 'degraded':
      return 'ChatGPT is experiencing degraded performance. Some features may be slower or intermittently unavailable.';
    case 'down':
      return 'ChatGPT is currently down. OpenAI is likely aware and working on a fix.';
    default:
      return 'Unable to determine ChatGPT status at this time. Check back shortly.';
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
      return 'ChatGPT is Operational';
    case 'degraded':
      return 'ChatGPT is Degraded';
    case 'down':
      return 'ChatGPT is Down';
    default:
      return 'ChatGPT Status Unknown';
  }
}

function getDynamicFaqAnswer(status: string): string {
  switch (status) {
    case 'operational':
      return 'No, ChatGPT is not down right now. All systems are operational and functioning normally.';
    case 'degraded':
      return 'ChatGPT is currently experiencing degraded performance. Some features may be slower than usual or intermittently unavailable.';
    case 'down':
      return 'Yes, ChatGPT appears to be down right now. OpenAI is likely investigating the issue. Check back here for live updates.';
    default:
      return 'We are currently unable to determine ChatGPT status. Visit status.openai.com or check back shortly for an update.';
  }
}

export default async function IsChatGPTDownPage() {
  const service = await fetchChatGPTStatus();
  const status = service?.status || 'unknown';

  const faqs = [
    {
      question: 'Is ChatGPT down right now?',
      answer: getDynamicFaqAnswer(status),
    },
    {
      question: 'How do I check if ChatGPT is down?',
      answer:
        'Three options: (1) this page, which polls OpenAI every two minutes, (2) status.openai.com directly, (3) the @OpenAI account on X for incident commentary. Our page combines the official status feed with component-level detail (ChatGPT, GPT-4, GPT-5, DALL-E, Sora, Whisper) and adds historical context the official page does not show.',
    },
    {
      question: 'What do I do when ChatGPT is down?',
      answer:
        'Switch to Claude or Gemini for chat-style work. For developer API workloads, the OpenAI API and ChatGPT often go down together but not always: api.openai.com sometimes stays up while chat.openai.com is degraded. Check the component-level status above. Subscribe to outage alerts from TensorFeed if you want to be notified the moment status changes.',
    },
    {
      question: 'How often does ChatGPT go down?',
      answer:
        'OpenAI has historically maintained 99.4 to 99.7% uptime across ChatGPT and the API. Major outages (>30 min impact) happen a few times per quarter, often correlated with the launch of new model variants. Brief degradation events (slow responses, intermittent failures) happen multiple times per month and usually clear within 15 minutes.',
    },
    {
      question: 'Is the OpenAI API the same as ChatGPT?',
      answer:
        'No. The OpenAI API (api.openai.com) is the developer endpoint that powers ChatGPT and every third-party integration. ChatGPT (chat.openai.com) is the consumer chat interface that runs on top of the API plus session, billing, and feature layers. They share the same model infrastructure but have different status surfaces. When the API is down, ChatGPT is too. When ChatGPT is down for auth or rate-limit reasons, the API may still work fine.',
    },
    {
      question: 'Where can I see ChatGPT incident history?',
      answer:
        'OpenAI publishes incident history at status.openai.com. Our incidents endpoint at tensorfeed.ai/incidents aggregates incidents across every tracked AI provider in one feed, so you can compare ChatGPT alongside Claude, Gemini, and others to evaluate reliability.',
    },
    {
      question: 'Why does ChatGPT keep going down?',
      answer:
        'ChatGPT has the highest user load of any AI chatbot and historically gets hit hardest by major news events that drive a traffic spike. Outages also frequently coincide with new feature launches (new models, voice mode updates, image-generation capacity) where infrastructure capacity needs to ramp. Most outages are short and resolve within an hour.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name="Is ChatGPT Down? Live OpenAI API Status Monitor"
        description="Real-time OpenAI API status monitoring. Check if ChatGPT is down, experiencing degraded performance, or fully operational."
        url="https://tensorfeed.ai/is-chatgpt-down"
      />
      <ServiceJsonLd
        serviceName="OpenAI ChatGPT"
        providerName="OpenAI"
        providerUrl="https://openai.com"
        url="https://tensorfeed.ai/is-chatgpt-down"
        description="OpenAI's ChatGPT consumer chat interface and the underlying OpenAI API (GPT-4o, GPT-5, o-series, DALL-E, Whisper, Sora). Used by AI agents and millions of consumer users worldwide."
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'AI Service Status', url: 'https://tensorfeed.ai/status' },
          { name: 'Is ChatGPT Down?', url: 'https://tensorfeed.ai/is-chatgpt-down' },
        ]}
      />
      <FAQPageJsonLd faqs={faqs} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Is ChatGPT Down?</h1>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green" />
          </span>
        </div>
        <p className="text-text-muted text-sm">
          Live OpenAI API status. Auto-refreshes every 2 minutes.
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

      {/* What to do when ChatGPT is down */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">What to do when ChatGPT is down</h2>
        <p className="text-text-secondary text-sm leading-relaxed mb-4">
          ChatGPT outages typically resolve within 30 to 90 minutes. Major outages occasionally
          last several hours during peak load events. Three practical alternatives while you wait:
        </p>
        <div className="space-y-3">
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">For chat and writing: Claude or Gemini</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Both are at the top of our{' '}
              <Link href="/best-ai-chatbots" className="text-accent-primary hover:underline">
                AI chatbot comparison
              </Link>{' '}
              and produce comparable quality on most tasks. Claude leads on coding and careful
              writing; Gemini wins on long-document analysis and Google Workspace integration.
              Live status:{' '}
              <Link href="/is-claude-down" className="text-accent-primary hover:underline">
                Is Claude down?
              </Link>{' '}
              and{' '}
              <Link href="/is-gemini-down" className="text-accent-primary hover:underline">
                Is Gemini down?
              </Link>
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">For developers: try the API directly</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              api.openai.com sometimes stays up while chat.openai.com is degraded. Check the
              component-level status above. If the API is also affected, route through{' '}
              <Link href="/api/openrouter/models" className="text-accent-primary hover:underline">
                OpenRouter
              </Link>{' '}
              which automatically falls back across providers when any single one returns errors.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">For image generation: DALL-E alternatives</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              When DALL-E is degraded inside ChatGPT, alternatives include{' '}
              <Link href="/is-midjourney-down" className="text-accent-primary hover:underline">
                Midjourney
              </Link>{' '}
              (separate Discord bot, often unaffected when OpenAI is down), Stable Diffusion via
              Replicate, or Gemini&apos;s image-generation feature inside Google AI Studio.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Get notified when status changes</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Subscribe to{' '}
              <Link href="/alerts" className="text-accent-primary hover:underline">
                TensorFeed outage alerts
              </Link>{' '}
              to get an email the moment ChatGPT (or any tracked AI service) goes degraded or down,
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
