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

async function fetchRunwayStatus(): Promise<StatusService | null> {
  try {
    const res = await fetch('https://tensorfeed.ai/api/status', { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.services?.length) {
        return (
          data.services.find(
            (s: StatusService) => s.name === 'Runway' || s.name.toLowerCase().includes('runway'),
          ) || null
        );
      }
    }
  } catch {}
  return null;
}

export const metadata: Metadata = {
  title: 'Runway Status: Is Runway Down? Live Runway ML Tracker',
  description:
    "Check if Runway is down right now. Real-time Runway ML status with live updates from Runway's official Statuspage. Covers the Runway app, backend, billing, and the Runway public API for video generation.",
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/is-runway-down',
    title: 'Runway Status: Is Runway Down? Live Runway ML Tracker',
    description: "Real-time Runway ML status across the app, backend, and public API.",
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Runway Status: Is Runway Down? Live Runway ML Tracker',
    description: "Real-time Runway ML status across the app, backend, and public API.",
  },
};

function StatusDot({ status }: { status: string }) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_DOTS[status] || STATUS_DOTS.unknown}`} />;
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'operational':
      return 'Runway is up and running normally. The app, backend, and public API are operational.';
    case 'degraded':
      return 'Runway is experiencing degraded performance. Video generation may be slower or queueing longer than usual.';
    case 'down':
      return 'Runway is currently down. The Runway team is likely aware and working on a fix.';
    default:
      return 'Unable to determine Runway status at this time. Check back shortly.';
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
      return 'Runway is Operational';
    case 'degraded':
      return 'Runway is Degraded';
    case 'down':
      return 'Runway is Down';
    default:
      return 'Runway Status Unknown';
  }
}

function getDynamicFaqAnswer(status: string): string {
  switch (status) {
    case 'operational':
      return 'No, Runway is not down right now. The Runway app and API are operational.';
    case 'degraded':
      return 'Runway is currently experiencing degraded performance. Video generation may be slower than usual.';
    case 'down':
      return 'Yes, Runway appears to be down right now. The Runway team is likely investigating.';
    default:
      return 'We are currently unable to determine Runway status. Check back shortly for an update.';
  }
}

export default async function IsRunwayDownPage() {
  const service = await fetchRunwayStatus();
  const status = service?.status || 'unknown';

  const faqs = [
    { question: 'Is Runway down right now?', answer: getDynamicFaqAnswer(status) },
    {
      question: 'How do you monitor Runway?',
      answer:
        "We pull Runway's official Statuspage at status.runwayml.com every 2 minutes. Their published status covers the app, backend, billing, support, and the public API.",
    },
    {
      question: 'Which Runway features are affected when Runway is down?',
      answer:
        'It depends on the component. App being down stops the web interface; Backend being down stops generations queueing or completing; Public API being down stops programmatic access for the Gen-3, Gen-4, and Act-One models. The component list above shows exactly what is impacted.',
    },
    {
      question: 'What do I do when Runway is down?',
      answer:
        'For video generation alternatives: Luma AI Dream Machine and Pika both offer comparable text-to-video. Check tensorfeed.ai/is-luma-down for Luma status, and tensorfeed.ai/status for the live status of every major AI provider.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name="Is Runway Down? Live Runway ML Status Monitor"
        description="Real-time Runway ML status across the app, backend, and public API."
        url="https://tensorfeed.ai/is-runway-down"
      />
      <FAQPageJsonLd faqs={faqs} />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Is Runway Down?</h1>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green" />
          </span>
        </div>
        <p className="text-text-muted text-sm">Live Runway status. Auto-refreshes every 2 minutes.</p>
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

      {service && service.components.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Component Status</h2>
          <div className="bg-bg-secondary border border-border rounded-xl divide-y divide-border">
            {service.components.map((comp) => (
              <div key={comp.name} className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-text-secondary">{comp.name}</span>
                <div className="flex items-center gap-2">
                  <StatusDot status={comp.status} />
                  <span className={`text-sm capitalize ${STATUS_COLORS[comp.status] || STATUS_COLORS.unknown}`}>
                    {comp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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
