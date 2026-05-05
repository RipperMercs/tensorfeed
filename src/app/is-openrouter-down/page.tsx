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

async function fetchOpenRouterStatus(): Promise<StatusService | null> {
  try {
    const res = await fetch('https://tensorfeed.ai/api/status', { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.services?.length) {
        return (
          data.services.find(
            (s: StatusService) =>
              s.name === 'OpenRouter' || s.name.toLowerCase().includes('openrouter'),
          ) || null
        );
      }
    }
  } catch {}
  return null;
}

export const metadata: Metadata = {
  title: 'OpenRouter Status: Is OpenRouter Down? Live OpenRouter API Tracker',
  description:
    "Check if OpenRouter is down right now. Real-time OpenRouter API status with live updates. OpenRouter routes across hundreds of models from dozens of upstream providers, so a single OpenRouter outage can impact many model integrations at once.",
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/is-openrouter-down',
    title: 'OpenRouter Status: Is OpenRouter Down? Live OpenRouter API Tracker',
    description: "Check if OpenRouter is down right now. Real-time OpenRouter API status with live updates.",
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'OpenRouter Status: Is OpenRouter Down? Live OpenRouter API Tracker',
    description: "Real-time OpenRouter routing-API status across the hundreds of models OpenRouter aggregates.",
  },
};

function StatusDot({ status }: { status: string }) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_DOTS[status] || STATUS_DOTS.unknown}`} />;
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'operational':
      return 'OpenRouter is up and running normally. The chat completion API and data API are operational.';
    case 'degraded':
      return 'OpenRouter is experiencing degraded performance. Routing across upstream providers may be slower or partially failing.';
    case 'down':
      return 'OpenRouter is currently down. Note that even when OpenRouter is down, you can call upstream providers directly using their own APIs.';
    default:
      return 'Unable to determine OpenRouter status at this time. Check back shortly.';
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
      return 'OpenRouter is Operational';
    case 'degraded':
      return 'OpenRouter is Degraded';
    case 'down':
      return 'OpenRouter is Down';
    default:
      return 'OpenRouter Status Unknown';
  }
}

function getDynamicFaqAnswer(status: string): string {
  switch (status) {
    case 'operational':
      return 'No, OpenRouter is not down right now. The OpenRouter routing API is operational.';
    case 'degraded':
      return 'OpenRouter is currently experiencing degraded performance. Routing requests may be slower than usual.';
    case 'down':
      return 'Yes, OpenRouter appears to be down right now. The OpenRouter team is likely investigating.';
    default:
      return 'We are currently unable to determine OpenRouter status. Check back shortly for an update.';
  }
}

export default async function IsOpenRouterDownPage() {
  const service = await fetchOpenRouterStatus();
  const status = service?.status || 'unknown';

  const faqs = [
    { question: 'Is OpenRouter down right now?', answer: getDynamicFaqAnswer(status) },
    {
      question: 'How do you monitor OpenRouter?',
      answer:
        "We pull OpenRouter's status page at status.openrouter.ai every 2 minutes. OpenRouter publishes uptime for the chat API, data API, and homepage.",
    },
    {
      question: 'OpenRouter is down. Can I still use Claude/GPT-4/Llama?',
      answer:
        'Yes. OpenRouter is a routing layer over upstream providers (Anthropic, OpenAI, Google, Together, Fireworks, DeepSeek, etc). When OpenRouter itself is down, the upstream providers are typically still up. Switch your client to call them directly using their native APIs (most are drop-in compatible with OpenRouter\'s OpenAI-style format).',
    },
    {
      question: 'What do I do when OpenRouter is degraded?',
      answer:
        "Degraded routing usually means OpenRouter is having trouble reaching one or more upstream providers. If you're seeing failures for a specific model, check that upstream's own status (Anthropic, OpenAI, etc) on tensorfeed.ai/status. Our /leaderboard ranks every monitored provider by uptime so you can pick the most reliable upstream right now.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name="Is OpenRouter Down? Live OpenRouter Status Monitor"
        description="Real-time OpenRouter routing API status. Pulls the official OpenRouter status page every 2 minutes."
        url="https://tensorfeed.ai/is-openrouter-down"
      />
      <FAQPageJsonLd faqs={faqs} />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Is OpenRouter Down?</h1>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green" />
          </span>
        </div>
        <p className="text-text-muted text-sm">Live OpenRouter status. Auto-refreshes every 2 minutes.</p>
      </div>

      <div className={`bg-gradient-to-br ${getStatusBg(status)} border rounded-xl p-8 mb-8 text-center`}>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className={`inline-block w-5 h-5 rounded-full ${STATUS_DOTS[status] || STATUS_DOTS.unknown}`} />
          <h2 className="text-2xl font-bold text-text-primary">{getStatusHeading(status)}</h2>
        </div>
        <p className="text-text-secondary text-lg max-w-xl mx-auto">{getStatusMessage(status)}</p>
        {service?.lastChecked && (
          <p className="text-text-muted text-xs mt-4">
            Last checked:{' '}
            <span className="font-mono">
              {new Date(service.lastChecked).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </p>
        )}
      </div>

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

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-accent-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="bg-bg-secondary border border-border rounded-lg p-5">
              <h3 className="text-text-primary font-semibold mb-2">{faq.question}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
