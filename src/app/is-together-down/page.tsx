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

async function fetchTogetherStatus(): Promise<StatusService | null> {
  try {
    const res = await fetch('https://tensorfeed.ai/api/status', { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.services?.length) {
        return (
          data.services.find(
            (s: StatusService) =>
              s.name === 'Together AI' || s.name.includes('Together') || s.provider === 'Together AI',
          ) || null
        );
      }
    }
  } catch {}
  return null;
}

export const metadata: Metadata = {
  title: 'Together AI Status: Is Together AI Down? Live Together API Tracker',
  description:
    "Check if Together AI is down right now. Real-time Together AI inference status with live updates from Together's official status page. Covers chat, vision, embeddings, image, and voice inference across the full Together model catalog.",
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/is-together-down',
    title: 'Together AI Status: Is Together AI Down? Live Together API Tracker',
    description: "Check if Together AI is down right now. Real-time Together AI inference status with live updates.",
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Together AI Status: Is Together AI Down? Live Together API Tracker',
    description: "Real-time Together AI inference status across chat, vision, embeddings, image, and voice.",
  },
};

function StatusDot({ status }: { status: string }) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_DOTS[status] || STATUS_DOTS.unknown}`} />;
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'operational':
      return 'Together AI is up and running normally. All inference categories (chat, vision, embeddings, image, voice) are operational.';
    case 'degraded':
      return 'Together AI is experiencing degraded performance. Some inference requests may be slower or intermittently failing.';
    case 'down':
      return 'Together AI is currently down. The Together team is likely aware and working on a fix.';
    default:
      return 'Unable to determine Together AI status at this time. Check back shortly.';
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
      return 'Together AI is Operational';
    case 'degraded':
      return 'Together AI is Degraded';
    case 'down':
      return 'Together AI is Down';
    default:
      return 'Together AI Status Unknown';
  }
}

function getDynamicFaqAnswer(status: string): string {
  switch (status) {
    case 'operational':
      return 'No, Together AI is not down right now. The Together inference API is operational across all model categories.';
    case 'degraded':
      return 'Together AI is currently experiencing degraded performance. Some inference requests may be slower than usual.';
    case 'down':
      return 'Yes, Together AI appears to be down right now. The Together team is likely investigating.';
    default:
      return 'We are currently unable to determine Together AI status. Check back shortly for an update.';
  }
}

export default async function IsTogetherDownPage() {
  const service = await fetchTogetherStatus();
  const status = service?.status || 'unknown';

  const faqs = [
    { question: 'Is Together AI down right now?', answer: getDynamicFaqAnswer(status) },
    {
      question: 'How do you monitor Together AI?',
      answer:
        "We pull Together's status page at status.together.ai every 2 minutes. Together hosts on Better Stack which gives a clear all-clear or active-incident signal we surface here.",
    },
    {
      question: 'Which Together models are affected when Together is down?',
      answer:
        "All Together-hosted inference: Llama 3.x family (8B, 70B, 405B), DeepSeek V3.1 and R1, Qwen, Gemma, Mistral, FLUX image models, Whisper voice, embeddings (Multilingual E5), rerank, and moderation. If you access the same models through DeepSeek's own API or another provider, those are independent.",
    },
    {
      question: 'What do I do when Together AI is down?',
      answer:
        'For the same model on different infra: Fireworks AI hosts a similar catalog with separate inference; OpenRouter routes across multiple providers and can fail over automatically; or hit the model owner directly (DeepSeek, Mistral, etc). Check tensorfeed.ai/status for the live status of every major AI provider in one place.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name="Is Together AI Down? Live Together AI Status Monitor"
        description="Real-time Together AI inference status across the full Together model catalog. Pulls every 2 minutes."
        url="https://tensorfeed.ai/is-together-down"
      />
      <FAQPageJsonLd faqs={faqs} />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Is Together AI Down?</h1>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green" />
          </span>
        </div>
        <p className="text-text-muted text-sm">Live Together AI status. Auto-refreshes every 2 minutes.</p>
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
