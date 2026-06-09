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

async function fetchGroqStatus(): Promise<StatusService | null> {
  try {
    const res = await fetch('https://tensorfeed.ai/api/status', { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.services?.length) {
        return data.services.find((s: StatusService) => s.name === 'Groq') || null;
      }
    }
  } catch {}
  return null;
}

export const metadata: Metadata = {
  title: 'Groq Status: Is Groq Down Right Now? Live Groq API Tracker',
  description:
    'Check if Groq is down right now. Real-time Groq API and GroqCloud status with live updates. See current outages, degraded performance, and per-model status for the Groq LPU inference platform.',
  alternates: { canonical: 'https://tensorfeed.ai/is-groq-down' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/is-groq-down',
    title: 'Groq Status: Is Groq Down Right Now? Live Groq API Tracker',
    description:
      'Check if Groq is down right now. Real-time Groq API and GroqCloud status with live updates. See current outages, degraded performance, and per-model status for the Groq LPU inference platform.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Groq Status: Is Groq Down Right Now? Live Groq API Tracker',
    description:
      'Check if Groq is down right now. Real-time Groq API and GroqCloud status with live updates and per-model component status.',
  },
};

function getDynamicFaqAnswer(status: string): string {
  switch (status) {
    case 'operational':
      return 'No, Groq is not down right now. GroqCloud and the API are operational and serving requests normally.';
    case 'degraded':
      return 'Groq is currently experiencing degraded performance. Some models may be slower than usual or intermittently unavailable.';
    case 'down':
      return 'Yes, Groq appears to be down right now. Groq is likely investigating. Check back here for live updates.';
    default:
      return 'We are currently unable to determine Groq status. Visit groqstatus.com or check back shortly for an update.';
  }
}

export default async function IsGroqDownPage() {
  const service = await fetchGroqStatus();
  const status = service?.status || 'unknown';

  const faqs = [
    {
      question: 'Is Groq down right now?',
      answer: getDynamicFaqAnswer(status),
    },
    {
      question: 'How do I check if Groq is down?',
      answer:
        'Three options: (1) this page, which polls Groq every two minutes, (2) groqstatus.com directly, (3) the @GroqInc account on X for incident commentary. Our page combines the official status feed with per-model component detail and adds historical context the official page does not show.',
    },
    {
      question: 'Is Groq the same as Grok?',
      answer:
        'No, and the names are confused constantly. Groq (with a q) is an inference hardware company whose LPU chips serve open models like Llama, Kimi, and Gemma at very high token speeds through GroqCloud. Grok (with a k) is xAI\'s chatbot and model family. Different companies, different products. This page tracks Groq the inference provider.',
    },
    {
      question: 'What do I do when Groq is down?',
      answer:
        'Groq runs open models, so the cleanest fallback is another inference provider serving the same weights: Together, Fireworks, or Cerebras for speed, or OpenRouter to route around a single provider outage automatically. Point your client at the substitute base URL, keep the model name, and you are usually back in minutes. Subscribe to TensorFeed outage alerts to know the moment status changes.',
    },
    {
      question: 'How often does Groq go down?',
      answer:
        'Groq has historically maintained high availability across GroqCloud, with most issues being brief per-model degradation (a model pulled for maintenance or elevated latency) rather than full outages. Major platform-wide outages are uncommon; most incidents resolve within 15 to 60 minutes.',
    },
    {
      question: 'Which models does Groq run?',
      answer:
        'Groq serves open-weight models on its own LPU inference hardware, including Llama 4 variants, Kimi K2, Gemma, and guard models, plus its own compound models. Because these are open weights, the same models are available on other providers, which is why failover is straightforward when Groq has an incident.',
    },
    {
      question: 'Where can I see Groq incident history?',
      answer:
        'Groq publishes status at groqstatus.com. Our incidents feed at tensorfeed.ai/incidents aggregates incidents across every tracked AI provider in one place, so you can compare Groq reliability against other inference providers like Together, Fireworks, and OpenRouter.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name="Is Groq Down? Live Groq API Status Monitor"
        description="Real-time Groq API and GroqCloud status monitoring. Check if Groq is down, experiencing degraded performance, or fully operational."
        url="https://tensorfeed.ai/is-groq-down"
      />
      <ServiceJsonLd
        serviceName="Groq API"
        providerName="Groq"
        providerUrl="https://groq.com"
        url="https://tensorfeed.ai/is-groq-down"
        description="Groq's LPU-based inference platform (GroqCloud), serving open-weight models such as Llama, Kimi, and Gemma at very high token throughput for AI agents and applications."
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'AI Service Status', url: 'https://tensorfeed.ai/status' },
          { name: 'Is Groq Down?', url: 'https://tensorfeed.ai/is-groq-down' },
        ]}
      />
      <FAQPageJsonLd faqs={faqs} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Is Groq Down?</h1>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green" />
          </span>
        </div>
        <p className="text-text-muted text-sm">
          Live Groq API status from GroqCloud. Auto-refreshes every 2 minutes.
        </p>
      </div>

      {/* Live status indicator + component breakdown (polls /api/status every 2 min) */}
      <LiveServiceStatus serviceName="Groq" providerName="Groq" initial={service} />

      {/* Early-warning probe callout + last-10 incident history (polls every 2 min) */}
      <EarlyWarningIncidents serviceName="Groq" provider="Groq" />

      {/* What to do when Groq is down */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">What to do when Groq is down</h2>
        <p className="text-text-secondary text-sm leading-relaxed mb-4">
          Groq serves open-weight models, so failover is unusually clean: the same model often runs
          on another provider. Three practical options while you wait, ranked by closeness of the
          fallback for typical Groq use cases:
        </p>
        <div className="space-y-3">
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">For speed: Cerebras, Together, or Fireworks</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              All three serve the same open weights at high throughput. Compare them on our{' '}
              <Link href="/inference-providers" className="text-accent-primary hover:underline">
                inference providers
              </Link>{' '}
              page. Live status:{' '}
              <Link href="/is-together-down" className="text-accent-primary hover:underline">
                Is Together down?
              </Link>{' '}
              and{' '}
              <Link href="/is-fireworks-down" className="text-accent-primary hover:underline">
                Is Fireworks down?
              </Link>
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">For automatic failover: route through OpenRouter</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              OpenRouter falls back across providers when any single one returns errors. See the{' '}
              <Link href="/is-openrouter-down" className="text-accent-primary hover:underline">
                OpenRouter status
              </Link>{' '}
              and the{' '}
              <Link href="/api/openrouter/models" className="text-accent-primary hover:underline">
                model catalog
              </Link>{' '}
              for the full list of routable models.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Keep the model, swap the base URL</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Because Groq runs open weights, you usually do not need to change your prompts or model
              choice during an outage, only the provider endpoint. Browse the same models on{' '}
              <Link href="/open-weights" className="text-accent-primary hover:underline">
                open-weights models
              </Link>{' '}
              to confirm which providers carry your model.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Get notified when status changes</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Subscribe to{' '}
              <Link href="/alerts" className="text-accent-primary hover:underline">
                TensorFeed outage alerts
              </Link>{' '}
              to get an email the moment Groq (or any tracked AI service) goes degraded or down, and
              again when it recovers. Free, no account required.
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
