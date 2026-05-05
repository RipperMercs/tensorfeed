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

async function fetchBedrockStatus(): Promise<StatusService | null> {
  try {
    const res = await fetch('https://tensorfeed.ai/api/status', { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.services?.length) {
        return (
          data.services.find(
            (s: StatusService) =>
              s.name === 'AWS Bedrock' ||
              s.name.includes('Bedrock') ||
              (s.provider === 'AWS' && s.name.toLowerCase().includes('bedrock')),
          ) || null
        );
      }
    }
  } catch {}
  return null;
}

export const metadata: Metadata = {
  title: 'AWS Bedrock Status: Is Amazon Bedrock Down? Live Bedrock API Tracker',
  description:
    'Check if AWS Bedrock is down right now. Real-time Amazon Bedrock status monitoring with live updates from AWS Health. See current outages, regional impact, and per-region issues for the Bedrock inference API.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/is-bedrock-down',
    title: 'AWS Bedrock Status: Is Amazon Bedrock Down? Live Bedrock API Tracker',
    description:
      'Check if AWS Bedrock is down right now. Real-time Amazon Bedrock status monitoring with live updates from AWS Health.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'AWS Bedrock Status: Is Amazon Bedrock Down? Live Bedrock API Tracker',
    description:
      'Check if AWS Bedrock is down right now. Real-time monitoring of the AWS Bedrock inference API across regions.',
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
      return 'AWS Bedrock is up and running normally across all regions. No active events affecting the inference API.';
    case 'degraded':
      return 'AWS Bedrock is experiencing degraded performance in one or more regions. The components list below shows which regions are affected.';
    case 'down':
      return 'AWS Bedrock is currently experiencing a major outage. AWS is likely aware and working on a fix. Check the affected regions below.';
    default:
      return 'Unable to determine AWS Bedrock status at this time. Check back shortly.';
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
      return 'AWS Bedrock is Operational';
    case 'degraded':
      return 'AWS Bedrock is Degraded';
    case 'down':
      return 'AWS Bedrock is Experiencing an Outage';
    default:
      return 'AWS Bedrock Status Unknown';
  }
}

function getDynamicFaqAnswer(status: string): string {
  switch (status) {
    case 'operational':
      return 'No, AWS Bedrock is not down right now. The inference API is operational across all regions we monitor.';
    case 'degraded':
      return 'AWS Bedrock is currently experiencing degraded performance in at least one region. Check the affected regions list above for specifics.';
    case 'down':
      return 'Yes, AWS Bedrock appears to be experiencing a significant outage right now. AWS is likely investigating. Check the affected regions list above for which regions are impacted.';
    default:
      return 'We are currently unable to determine AWS Bedrock status. Check back shortly for an update.';
  }
}

export default async function IsBedrockDownPage() {
  const service = await fetchBedrockStatus();
  const status = service?.status || 'unknown';

  const faqs = [
    {
      question: 'Is AWS Bedrock down right now?',
      answer: getDynamicFaqAnswer(status),
    },
    {
      question: 'How do you monitor AWS Bedrock status?',
      answer:
        'We pull the AWS Health currentevents feed every 2 minutes and filter for events affecting Bedrock specifically (the AWS-wide status page mixes hundreds of services together). Active events for Bedrock surface here with their region and severity. Resolved events drop off.',
    },
    {
      question: 'Bedrock is down in one region but not others. What does this page show?',
      answer:
        'AWS publishes Bedrock as one logical service split across regions. If any region we observe is degraded or out, we surface that as a degraded headline with the affected region listed below. The "operational" green only appears when no region-specific events are active.',
    },
    {
      question: 'What do I do when AWS Bedrock is down?',
      answer:
        'Switch your inference traffic to another region (multi-region failover is the standard pattern), or fall back to a different provider like Claude API or OpenAI. Check tensorfeed.ai/status for the live status of every major AI provider in one place.',
    },
    {
      question: 'How fast does this page detect a Bedrock outage?',
      answer:
        'Within 2 minutes. We poll the AWS Health feed every 2 min and the page auto-refreshes on that cadence, so you generally see incidents here within minutes of AWS publishing them.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name="Is AWS Bedrock Down? Live Amazon Bedrock Status Monitor"
        description="Real-time AWS Bedrock status monitoring with per-region detail. Pulls the AWS Health feed every 2 minutes and surfaces only events affecting the Bedrock inference API."
        url="https://tensorfeed.ai/is-bedrock-down"
      />
      <FAQPageJsonLd faqs={faqs} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Is AWS Bedrock Down?</h1>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green" />
          </span>
        </div>
        <p className="text-text-muted text-sm">
          Live AWS Bedrock status from AWS Health. Auto-refreshes every 2 minutes.
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
        <p className="text-text-secondary text-lg max-w-xl mx-auto">{getStatusMessage(status)}</p>
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

      {/* Affected Regions */}
      {service && service.components.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Active Events</h2>
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
