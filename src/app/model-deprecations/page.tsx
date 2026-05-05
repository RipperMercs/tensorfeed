import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AI Model Deprecation Calendar - When Each Model Gets Retired',
  description:
    'A maintained registry of model retirements and deprecation announcements across OpenAI, Anthropic, Google, Cohere, and other providers. Each entry links back to the provider\'s own announcement and lists the recommended replacement model. Updated as new deprecations are announced.',
  alternates: { canonical: 'https://tensorfeed.ai/model-deprecations' },
  openGraph: {
    type: 'article',
    title: 'AI Model Deprecation Calendar',
    description:
      'When each provider retires each model, with replacement guidance and source links. Updated as deprecations are announced.',
    url: 'https://tensorfeed.ai/model-deprecations',
    siteName: 'TensorFeed',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Model Deprecation Calendar',
    description:
      'OpenAI, Anthropic, Google, Cohere, and others. When each model retires, what to migrate to, source links to verify.',
  },
};

interface DeprecationApiResponse {
  ok?: boolean;
  source?: string;
  lastUpdated?: string;
  count?: number;
  deprecations?: ModelDeprecation[];
}

interface ModelDeprecation {
  id: string;
  provider: string;
  model: string;
  modelDisplay?: string;
  status: 'announced' | 'deprecated' | 'sunsetted';
  announcedDate?: string;
  deprecationDate?: string;
  sunsetDate?: string;
  replacement?: string;
  notes?: string;
  sourceUrl: string;
}

const STATUS_LABEL: Record<ModelDeprecation['status'], string> = {
  announced: 'Announced',
  deprecated: 'Deprecated',
  sunsetted: 'Sunsetted',
};

const STATUS_COLOR: Record<ModelDeprecation['status'], string> = {
  announced: 'var(--accent-amber)',
  deprecated: 'var(--accent-amber)',
  sunsetted: 'var(--accent-red)',
};

async function fetchDeprecations(): Promise<DeprecationApiResponse> {
  try {
    const res = await fetch('https://tensorfeed.ai/api/model-deprecations', {
      next: { revalidate: 600 },
    });
    if (!res.ok) return { ok: false };
    return (await res.json()) as DeprecationApiResponse;
  } catch {
    return { ok: false };
  }
}

function formatDate(iso?: string): string {
  if (!iso) return 'n/a';
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function ModelDeprecationsPage() {
  const data = await fetchDeprecations();
  const deprecations = data.deprecations ?? [];

  // Group by provider for the section layout.
  const byProvider = new Map<string, ModelDeprecation[]>();
  for (const d of deprecations) {
    const list = byProvider.get(d.provider) ?? [];
    list.push(d);
    byProvider.set(d.provider, list);
  }
  const providers = Array.from(byProvider.keys()).sort();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to TensorFeed
      </Link>

      <header className="mb-8">
        <div
          className="font-mono uppercase mb-3"
          style={{
            fontSize: 11,
            letterSpacing: '0.16em',
            color: 'var(--text-muted)',
          }}
        >
          / Model Lifecycle &middot; updated {data.lastUpdated ?? 'recently'}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3 leading-tight">
          AI Model Deprecation Calendar
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed max-w-2xl">
          When each provider retires each model, with the recommended replacement and a source
          link to verify the announcement. Updated as new deprecations are published.
        </p>
      </header>

      {deprecations.length === 0 ? (
        <div
          className="rounded-lg border border-border p-6 text-sm text-text-muted"
          style={{ background: 'var(--bg-secondary)' }}
        >
          The deprecation calendar feed is currently unreachable. Try refreshing in a moment.
        </div>
      ) : (
        <div className="space-y-10">
          {providers.map((provider) => {
            const entries = byProvider.get(provider) ?? [];
            return (
              <section key={provider}>
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  {provider}{' '}
                  <span
                    className="font-mono"
                    style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}
                  >
                    ({entries.length} {entries.length === 1 ? 'model' : 'models'})
                  </span>
                </h2>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-bg-secondary">
                      <tr>
                        <th className="text-left px-3 py-2 text-text-primary font-semibold">
                          Model
                        </th>
                        <th className="text-left px-3 py-2 text-text-primary font-semibold">
                          Status
                        </th>
                        <th className="text-left px-3 py-2 text-text-primary font-semibold">
                          Announced
                        </th>
                        <th className="text-left px-3 py-2 text-text-primary font-semibold">
                          Deprecated
                        </th>
                        <th className="text-left px-3 py-2 text-text-primary font-semibold">
                          Sunset
                        </th>
                        <th className="text-left px-3 py-2 text-text-primary font-semibold">
                          Replacement
                        </th>
                        <th className="text-left px-3 py-2 text-text-primary font-semibold">
                          Source
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {entries.map((d) => (
                        <tr key={d.id}>
                          <td className="px-3 py-3 align-top">
                            <div
                              className="font-mono text-text-primary"
                              style={{ fontSize: 13 }}
                            >
                              {d.model}
                            </div>
                            {d.modelDisplay && (
                              <div className="text-xs text-text-muted mt-0.5">
                                {d.modelDisplay}
                              </div>
                            )}
                            {d.notes && (
                              <div className="text-xs text-text-secondary mt-1 max-w-md leading-snug">
                                {d.notes}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <span
                              className="inline-flex items-center font-mono uppercase"
                              style={{
                                fontSize: 10.5,
                                letterSpacing: '0.08em',
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: 3,
                                color: STATUS_COLOR[d.status],
                                background:
                                  d.status === 'sunsetted'
                                    ? 'rgba(239,68,68,0.12)'
                                    : 'rgba(245,158,11,0.12)',
                                border: `1px solid ${
                                  d.status === 'sunsetted'
                                    ? 'rgba(239,68,68,0.30)'
                                    : 'rgba(245,158,11,0.30)'
                                }`,
                              }}
                            >
                              {STATUS_LABEL[d.status]}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top text-text-muted text-xs font-mono">
                            {formatDate(d.announcedDate)}
                          </td>
                          <td className="px-3 py-3 align-top text-text-muted text-xs font-mono">
                            {formatDate(d.deprecationDate)}
                          </td>
                          <td className="px-3 py-3 align-top text-text-muted text-xs font-mono">
                            {formatDate(d.sunsetDate)}
                          </td>
                          <td className="px-3 py-3 align-top">
                            {d.replacement ? (
                              <span
                                className="font-mono text-text-secondary"
                                style={{ fontSize: 12 }}
                              >
                                {d.replacement}
                              </span>
                            ) : (
                              <span className="text-text-muted">n/a</span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <a
                              href={d.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-accent-primary hover:underline text-xs"
                            >
                              announce
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="mt-14 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-3">For agents</h2>
        <p className="text-text-secondary text-sm leading-relaxed mb-3">
          Machine-readable JSON of this calendar lives at{' '}
          <Link
            href="/api/model-deprecations"
            className="text-accent-primary hover:underline font-mono"
          >
            /api/model-deprecations
          </Link>{' '}
          and is free to consume. Filter by provider with{' '}
          <code className="font-mono text-xs bg-bg-secondary px-1.5 py-0.5 rounded text-text-primary">
            ?provider=OpenAI
          </code>{' '}
          or by lifecycle stage with{' '}
          <code className="font-mono text-xs bg-bg-secondary px-1.5 py-0.5 rounded text-text-primary">
            ?status=sunsetted
          </code>
          . Cached 600 seconds at the edge.
        </p>
        <p className="text-text-muted text-xs leading-relaxed">
          The calendar is hand-curated from each provider&apos;s authoritative deprecation page.
          If you spot a missing entry or an incorrect date, the canonical source is at{' '}
          <a
            href="https://github.com/RipperMercs/tensorfeed/blob/main/worker/src/model-deprecations.ts"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-primary hover:underline"
          >
            worker/src/model-deprecations.ts
          </a>
          . PRs welcome.
        </p>
      </section>
    </div>
  );
}
