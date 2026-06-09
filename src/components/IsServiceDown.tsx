import Link from 'next/link';
import { Activity, ArrowRight, HelpCircle } from 'lucide-react';
import { WebApplicationJsonLd, FAQPageJsonLd, BreadcrumbListJsonLd, ServiceJsonLd } from '@/components/seo/JsonLd';
import LiveServiceStatus from '@/components/status/LiveServiceStatus';
import EarlyWarningIncidents from '@/components/status/EarlyWarningIncidents';
import type { IsDownService } from '@/lib/is-down-services';

/**
 * Shared renderer for the /is-<slug>-down high-intent status pages. Driven by
 * an IsDownService config so all the monitored providers stay in sync: live
 * status (polled from /api/status by the config's statusServiceName), a "what
 * to do" failover section, a provider-specific FAQ, and Service +
 * BreadcrumbList + WebApplication + FAQPage JSON-LD. Async server component;
 * each page passes its config and Next resolves the status fetch at build/edge.
 */

interface StatusService {
  name: string;
  provider: string;
  status: string;
  statusPageUrl?: string;
  components: { name: string; status: string }[];
  lastChecked?: string;
}

async function fetchService(statusServiceName: string): Promise<StatusService | null> {
  if (!statusServiceName) return null;
  try {
    const res = await fetch('https://tensorfeed.ai/api/status', { next: { revalidate: 120 } });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.services?.length) {
        return data.services.find((s: StatusService) => s.name === statusServiceName) || null;
      }
    }
  } catch {}
  return null;
}

export default async function IsServiceDown({ service }: { service: IsDownService }) {
  const live = await fetchService(service.statusServiceName);
  const name = service.displayName;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <WebApplicationJsonLd
        name={`Is ${name} Down? Live ${name} Status Monitor`}
        description={`Real-time ${name} status monitoring. Check if ${name} is down, experiencing degraded performance, or fully operational.`}
        url={`https://tensorfeed.ai/is-${service.slug}-down`}
      />
      <ServiceJsonLd
        serviceName={`${name} API`}
        providerName={service.providerName}
        providerUrl={service.providerUrl}
        url={`https://tensorfeed.ai/is-${service.slug}-down`}
        description={service.serviceDescription}
      />
      <BreadcrumbListJsonLd
        items={[
          { name: 'Home', url: 'https://tensorfeed.ai' },
          { name: 'AI Service Status', url: 'https://tensorfeed.ai/status' },
          { name: `Is ${name} Down?`, url: `https://tensorfeed.ai/is-${service.slug}-down` },
        ]}
      />
      <FAQPageJsonLd faqs={service.faqs} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Is {name} Down?</h1>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green" />
          </span>
        </div>
        <p className="text-text-muted text-sm">
          Live {name} status. Auto-refreshes every 2 minutes.
        </p>
      </div>

      {/* Live status indicator + component breakdown (polls /api/status every 2 min) */}
      <LiveServiceStatus
        serviceName={service.statusServiceName}
        providerName={name}
        initial={live}
        statusPageUrl={service.statusPageUrl}
      />

      {/* Early-warning probe callout + last-10 incident history (polls every 2 min) */}
      <EarlyWarningIncidents
        serviceName={service.statusServiceName}
        provider={service.providerName}
      />

      {/* What to do when X is down */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">What to do when {name} is down</h2>
        <div className="space-y-3">
          {service.failover.map((block) => (
            <div key={block.title} className="bg-bg-secondary border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-2">{block.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{block.text}</p>
              {block.links.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                  {block.links.map((l) => (
                    <Link key={l.href} href={l.href} className="text-accent-primary hover:underline">
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Check Other Services */}
      <div className="mb-10">
        <Link
          href="/status"
          className="inline-flex items-center gap-2 bg-bg-secondary border border-border rounded-lg px-5 py-3 hover:border-accent-primary transition-colors group"
        >
          <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">Check other AI services</span>
          <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
        </Link>
      </div>

      {/* FAQ */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-accent-secondary" />
          <h2 className="text-xl font-semibold text-text-primary">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {service.faqs.map((faq) => (
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
