import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Server, ArrowRight, Zap, Droplet, Factory, AlertTriangle, Satellite } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import MachineReadableLink from '@/components/MachineReadableLink';
import LastUpdatedFooter from '@/components/LastUpdatedFooter';
import projectsData from '../../../data/ai-infrastructure-projects.json';

interface Project {
  id: string;
  name: string;
  operator: string;
  partners: string[];
  location: { city: string; state: string; country: string };
  status: 'announced' | 'permitted' | 'construction' | 'operational';
  capacity_mw_announced: number | null;
  power_source: string;
  announced_date: string;
  target_operational: string;
  capex_usd_billion: number | null;
  context: string;
  primary_sources: string[];
}

const PROJECTS = (projectsData.projects as Project[]).slice();

const STATUS_STYLES: Record<Project['status'], { label: string; classes: string }> = {
  announced: {
    label: 'Announced',
    classes: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  permitted: {
    label: 'Permitted',
    classes: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  construction: {
    label: 'Construction',
    classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  operational: {
    label: 'Operational',
    classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
};

const POWER_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  nuclear: Zap,
  default: Factory,
};

const FAQS = [
  {
    question: 'What does this page cover?',
    answer:
      'Major AI buildout projects across four operator categories: hyperscalers selling capacity (Microsoft, Google, Amazon, Meta, Apple), frontier-lab compute farms consuming capacity (Stargate, Colossus, the Anthropic TPU commit), AI-specialized GPU clouds (CoreWeave, Lambda), and Bitcoin-pivot AI hosting (IREN, Hut 8). Plus the nuclear PPAs and restarts powering them and a concept-stage orbital entry. Editorial curation, every entry sourced to public records. Free JSON at /api/ai-infrastructure/projects.json.',
  },
  {
    question: 'Why a separate page for this?',
    answer:
      'AI infrastructure is the physical substrate of every model, every API call, every agent on this site. We already cover the model layer, the pricing layer, and the funding layer. This is the layer underneath them all. The next two years will be defined by which projects come online on time, which slip, and which utility relationships hold up.',
  },
  {
    question: 'Is xAI a hyperscaler?',
    answer:
      'Strictly speaking, no. The traditional definition of hyperscaler is a cloud provider operating at massive scale that sells capacity to third parties: AWS, Microsoft Azure, Google Cloud, Oracle Cloud, plus arguably Meta and Apple operating hyperscale infrastructure for internal use. xAI Colossus today is a single-tenant frontier-lab compute farm: xAI builds it to train Grok, not to rent capacity. But the buzz term has expanded. Reporters and analysts increasingly use "hyperscaler" to mean "any operator running compute at hyperscale", which includes xAI. Elon has also signaled that future Colossus generations may open multi-tenant capacity, which would make the strict definition apply too. We track xAI Colossus as a frontier-lab compute farm in this registry, but flagging the terminology drift here so the search-term traffic finds the right entry.',
  },
  {
    question: 'How are projects added?',
    answer:
      'Editorial cadence. An entry is added when an authoritative source (company announcement, regulatory filing, utility commission docket, or established trade reporting) confirms a project at the gigawatt class or with an unusual structural feature (nuclear PPA, dedicated build, grid-bypass). We would rather ship 10 well-sourced entries than 100 stale ones.',
  },
  {
    question: 'Why no opinions on the politics?',
    answer:
      'Because the politics changes faster than the steel and concrete. We track the physical buildout, the power deals, the timelines, and the announced capacity. Reasonable people disagree on whether a 2 GW data center is good or bad for a community; reasonable people do not disagree on whether it is being built. We stay on the latter.',
  },
  {
    question: 'How does this connect to the rest of TensorFeed?',
    answer:
      'Cross-linked with /funding/portfolio (the capital flowing into AI infrastructure), /pricing (the model prices these data centers serve), and /status (the live state of the operators that run them). Together they form a closed-loop view of the AI ecosystem from capital to silicon to inference.',
  },
  {
    question: 'Will you cover environmental impact?',
    answer:
      'Yes, factually. Water draws, grid strain, peaker plant filings, emissions, and community pushback all appear in the context paragraph of relevant entries with their primary sources. Pros and cons both get reported. No endorsements, no advocacy, just sourced facts.',
  },
];

function formatCapacity(mw: number | null): string {
  if (mw === null) return 'capacity not disclosed';
  if (mw >= 1000) return `${(mw / 1000).toFixed(1)} GW`;
  return `${mw} MW`;
}

function formatCapex(b: number | null): string {
  if (b === null) return 'capex not disclosed';
  if (b >= 100) return `$${b}B capex`;
  if (b >= 1) return `$${b}B capex`;
  return `$${(b * 1000).toFixed(0)}M capex`;
}

export const metadata: Metadata = {
  title: 'AI Infrastructure: Hyperscaler & Data Center Buildout Tracker | TensorFeed',
  description:
    'Hand-curated registry of hyperscaler campuses, frontier-lab compute farms, AI-specialized GPU clouds, nuclear PPAs, and gigawatt-class buildouts. 15 major projects tracked with status, capacity, power source, capex, and primary sources. Free JSON at /api/ai-infrastructure/projects.json.',
  alternates: { canonical: 'https://tensorfeed.ai/ai-infrastructure' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/ai-infrastructure',
    title: 'TensorFeed AI Infrastructure Tracker',
    description:
      'Hyperscaler campuses, frontier-lab compute farms, AI-specialized GPU clouds, nuclear PPAs. Status, capacity, power source, capex, sources.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'TensorFeed AI Infrastructure Tracker',
    description:
      'Gigawatt-class AI buildouts, nuclear PPAs, hyperscaler campuses. Free JSON.',
  },
};

export default function AIInfrastructurePage() {
  const operational = PROJECTS.filter((p) => p.status === 'operational').length;
  const construction = PROJECTS.filter((p) => p.status === 'construction').length;
  const permitted = PROJECTS.filter((p) => p.status === 'permitted').length;
  const totalAnnouncedMW = PROJECTS.reduce(
    (acc, p) => acc + (p.capacity_mw_announced ?? 0),
    0,
  );
  const totalDisclosedCapex = PROJECTS.reduce(
    (acc, p) => acc + (p.capex_usd_billion ?? 0),
    0,
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DatasetJsonLd
        name="TensorFeed AI Infrastructure Tracker"
        description="Hand-curated registry of major AI data center campuses, nuclear PPAs, gigawatt-class buildouts, and long-dated compute commitments."
        url="https://tensorfeed.ai/ai-infrastructure"
        jsonUrl="/api/ai-infrastructure/projects.json"
        keywords={[
          'ai data centers',
          'hyperscaler buildout',
          'gigawatt class compute',
          'nuclear ppa',
          'frontier lab compute farms',
          'gpu cloud capacity',
          'ai infrastructure tracker',
        ]}
      />
      <FAQPageJsonLd faqs={FAQS} />

      {/*
        Hero with photo background. The desert data center image evokes the
        actual geography of most AI buildouts (Texas, Arizona, Nevada). We
        layer dark + grid overlays on top to keep text legible and match
        TF's dark editorial aesthetic. Image is 2400px wide WebP, ~65KB.
      */}
      <section className="relative isolate overflow-hidden rounded-xl border border-bg-tertiary mb-10 px-6 sm:px-8 py-12 sm:py-20">
        <Image
          src="/ai-infrastructure-hero-desert.webp"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1280px"
          className="object-cover -z-20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(to bottom, rgba(2,6,23,0.55) 0%, rgba(2,6,23,0.70) 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-[0.04]"
          style={{
            backgroundImage: [
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
              'linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            ].join(', '),
            backgroundSize: '48px 48px',
          }}
        />

        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/15 backdrop-blur-sm">
            <Server className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-md">AI Infrastructure</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl mb-4 drop-shadow">
          The physical buildout behind the AI ecosystem: gigawatt-class data centers, nuclear power
          deals, hyperscaler campuses, and the long-dated compute commitments backing them.
        </p>
        <MachineReadableLink endpoint="/api/ai-infrastructure/projects.json" className="mt-2" />
        <div className="text-text-secondary leading-relaxed max-w-3xl space-y-3 text-sm">
          <p>
            We cover the model layer at{' '}
            <Link href="/pricing" className="text-accent-primary hover:underline">
              /pricing
            </Link>
            , the funding layer at{' '}
            <Link href="/funding/portfolio" className="text-accent-primary hover:underline">
              /funding/portfolio
            </Link>
            , and the live operator state at{' '}
            <Link href="/status" className="text-accent-primary hover:underline">
              /status
            </Link>
            . This page covers the layer underneath all of them. It is the answer to the question{' '}
            <em className="text-text-primary not-italic">where does the AI actually run, and how
            does it get the power.</em>
          </p>
          <p>
            Editorial curation. Every entry sourced to a public announcement, regulatory filing, or
            established trade report. We track the physical buildout and the announced capacity, not
            the politics. The politics changes faster than the steel.
          </p>
        </div>
      </section>

      <section className="mb-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Projects tracked</div>
          <div className="text-2xl font-bold text-text-primary font-mono">{PROJECTS.length}</div>
        </div>
        <div className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Operational</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{operational}</div>
        </div>
        <div className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Construction</div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{construction + permitted}</div>
        </div>
        <div className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Announced capacity</div>
          <div className="text-2xl font-bold text-text-primary font-mono">
            {(totalAnnouncedMW / 1000).toFixed(1)} GW
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Tracked projects</h2>
        <div className="space-y-4">
          {PROJECTS.map((p) => {
            const statusStyle = STATUS_STYLES[p.status];
            const PowerIcon =
              p.power_source.includes('nuclear') ? POWER_ICON.nuclear : POWER_ICON.default;
            return (
              <article
                key={p.id}
                className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50 hover:bg-bg-secondary transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-1">{p.name}</h3>
                    <div className="text-sm text-text-secondary">
                      <span className="text-text-primary font-medium">{p.operator}</span>
                      {p.partners.length > 0 && (
                        <span className="text-text-muted"> with {p.partners.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded border font-medium shrink-0 ${statusStyle.classes}`}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 mb-3 text-xs">
                  <div className="bg-bg-tertiary/50 rounded px-2 py-1.5">
                    <div className="text-text-muted">Location</div>
                    <div className="text-text-primary font-medium truncate">
                      {p.location.city}, {p.location.state}
                    </div>
                  </div>
                  <div className="bg-bg-tertiary/50 rounded px-2 py-1.5">
                    <div className="text-text-muted">Capacity</div>
                    <div className="text-text-primary font-medium font-mono">
                      {formatCapacity(p.capacity_mw_announced)}
                    </div>
                  </div>
                  <div className="bg-bg-tertiary/50 rounded px-2 py-1.5">
                    <div className="text-text-muted flex items-center gap-1">
                      <PowerIcon className="w-3 h-3" />
                      Power
                    </div>
                    <div className="text-text-primary font-medium truncate" title={p.power_source}>
                      {p.power_source}
                    </div>
                  </div>
                  <div className="bg-bg-tertiary/50 rounded px-2 py-1.5">
                    <div className="text-text-muted">Online</div>
                    <div className="text-text-primary font-medium font-mono">{p.target_operational}</div>
                  </div>
                </div>

                <p className="text-sm text-text-secondary leading-relaxed mb-3">{p.context}</p>

                <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-3 text-text-muted">
                    {p.capex_usd_billion !== null && (
                      <span className="font-mono">{formatCapex(p.capex_usd_billion)}</span>
                    )}
                    <span>announced {p.announced_date}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.primary_sources.map((url, i) => {
                      const host = new URL(url).host.replace('www.', '');
                      return (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-primary hover:underline"
                        >
                          {host}
                        </a>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="border border-bg-tertiary rounded-lg p-5 bg-bg-secondary/50 mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Free agent endpoint</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <code className="bg-bg-tertiary px-2 py-0.5 rounded text-accent-primary">
              /api/ai-infrastructure/projects.json
            </code>
            <span className="text-text-secondary ml-2 block mt-1">
              Full registry as static JSON. Each entry returns id, name, operator, partners,
              location, status, capacity_mw_announced, power_source, announced_date,
              target_operational, capex_usd_billion, context, and primary_sources. License: TF
              curation CC-BY-4.0; underlying sources retain their original license.
            </span>
          </li>
        </ul>
      </div>

      <div className="border border-bg-tertiary rounded-lg p-5 bg-amber-500/5 mb-10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-text-secondary leading-relaxed">
            <strong className="text-text-primary">Capacity is announced, not measured.</strong> The
            numbers on this page reflect what operators have publicly committed to. Real delivered
            capacity tracks announced capacity loosely and tends to slip. Use these figures for
            relative magnitude and pipeline timing, not as guaranteed power draw at the wall.
          </div>
        </div>
      </div>

      {/*
        Long-arc thesis visual. The lunar / orbital image pairs with the
        concept-stage entry in the registry and the dedicated orbital
        deep-dive original. Dark overlay keeps text legible against the
        bright Earth in the source image. Image is 1800px wide WebP, ~220KB.
      */}
      <section className="relative isolate overflow-hidden rounded-xl border border-bg-tertiary mb-10 px-6 sm:px-8 py-12 sm:py-16">
        <Image
          src="/ai-infrastructure-orbital.webp"
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 768px) 100vw, 1280px"
          className="object-cover -z-20"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(to bottom right, rgba(2,6,23,0.78) 0%, rgba(2,6,23,0.55) 60%, rgba(2,6,23,0.78) 100%)',
          }}
        />

        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3 text-xs uppercase tracking-wider text-accent-cyan font-mono">
            <Satellite className="w-4 h-4" />
            Long-arc thesis
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 drop-shadow-md">
            When terrestrial runs out of room, the steel goes up.
          </h2>
          <p className="text-text-secondary leading-relaxed mb-5 drop-shadow">
            The four constraints terrestrial AI infrastructure hits (grid, water, permits, NIMBY)
            all go away in orbit. Continuous solar plus vacuum cooling sidesteps the bottlenecks
            that are hardening on the ground. The catch is launch cost, and that is the one
            curve actively bending in the right direction. Concept-stage today; 2030-plus
            timeline. We track it on this page as it moves from feasibility into engineering.
          </p>
          <Link
            href="/originals/ai-compute-orbital-thesis"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-cyan hover:text-white transition-colors"
          >
            Read the orbital thesis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <div className="border-t border-bg-tertiary pt-6 mb-10">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Related on TensorFeed</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/originals/ai-buildout-explained"
            className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50 hover:bg-bg-secondary transition-colors group"
          >
            <div className="text-xs text-accent-primary mb-1">Editorial</div>
            <div className="text-sm font-medium text-text-primary mb-1">
              The AI Buildout, Plain English
            </div>
            <div className="text-xs text-text-muted flex items-center gap-1">
              Read article
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
          <Link
            href="/funding/portfolio"
            className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50 hover:bg-bg-secondary transition-colors group"
          >
            <div className="text-xs text-accent-primary mb-1">Capital layer</div>
            <div className="text-sm font-medium text-text-primary mb-1">Funding Portfolio</div>
            <div className="text-xs text-text-muted flex items-center gap-1">
              View registry
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
          <Link
            href="/status"
            className="border border-bg-tertiary rounded-lg p-4 bg-bg-secondary/50 hover:bg-bg-secondary transition-colors group"
          >
            <div className="text-xs text-accent-primary mb-1">Operator layer</div>
            <div className="text-sm font-medium text-text-primary mb-1">Live AI Status</div>
            <div className="text-xs text-text-muted flex items-center gap-1">
              See now
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      <div className="border-t border-bg-tertiary pt-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Frequently asked questions</h2>
        <dl className="space-y-4 text-sm">
          {FAQS.map((faq) => (
            <div key={faq.question}>
              <dt className="font-semibold text-text-primary mb-1">{faq.question}</dt>
              <dd className="text-text-secondary leading-relaxed">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </div>

      <LastUpdatedFooter path="/ai-infrastructure" />
    </div>
  );
}
