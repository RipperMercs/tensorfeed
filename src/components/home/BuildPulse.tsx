import Link from 'next/link';
import { Activity, Zap, GitCommit, ArrowRight } from 'lucide-react';

interface MetricCard {
  label: string;
  value: string;
  hint: string;
  href?: string;
}

const METRICS: MetricCard[] = [
  {
    label: 'Paid premium endpoints',
    value: '13',
    hint: 'pay-per-call in USDC on Base',
    href: '/api-reference',
  },
  {
    label: 'Worker tests',
    value: '158',
    hint: 'pure-logic, all passing',
    href: '/changelog',
  },
  {
    label: 'MCP tools',
    value: '25',
    hint: '6 free + 19 premium for Claude Desktop',
    href: 'https://github.com/RipperMercs/tensorfeed/tree/main/mcp-server',
  },
  {
    label: 'Editorial articles',
    value: '37',
    hint: 'first-person analysis',
    href: '/originals',
  },
];

interface ShippingEntry {
  what: string;
  when: string;
  href: string;
}

const RECENT_SHIPS: ShippingEntry[] = [
  {
    what: 'Public /agent-traffic dashboard surfacing live AI bot crawls (ClaudeBot, GPTBot, PerplexityBot, etc)',
    when: 'Apr 27, 2026',
    href: '/agent-traffic',
  },
  {
    what: 'Per-endpoint API reference (21 pages) with TechArticle + FAQPage JSON-LD',
    when: 'Apr 27, 2026',
    href: '/api-reference',
  },
  {
    what: 'Side-by-side model comparison endpoint with normalized benchmarks + rankings',
    when: 'Apr 27, 2026',
    href: '/api-reference/compare-models',
  },
  {
    what: 'Provider deep-dive: one paid call, four free endpoints aggregated',
    when: 'Apr 27, 2026',
    href: '/api-reference/provider-deepdive',
  },
  {
    what: '/.well-known/x402 V2 discovery manifest for agent auto-discovery',
    when: 'Apr 27, 2026',
    href: '/developers/agent-payments',
  },
];

export default function BuildPulse() {
  return (
    <section
      className="border-b border-border"
      style={{ padding: '56px 0' }}
      aria-labelledby="pulse-h"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between flex-wrap" style={{ marginBottom: 28, gap: 24 }}>
          <div>
            <h2
              id="pulse-h"
              className="flex items-center"
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                gap: 12,
              }}
            >
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  color: 'var(--text-muted)',
                  padding: '4px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  background: 'var(--bg-secondary)',
                }}
              >
                / Build pulse
              </span>
              Live shipping cadence
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6, maxWidth: 620 }}>
              We ship in public. Every commit lands on main and deploys automatically. Here is what
              the platform actually looks like right now.
            </p>
          </div>
          <Link
            href="/changelog"
            className="font-mono inline-flex items-center transition-colors hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)]"
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              padding: '7px 12px',
              borderRadius: 6,
              gap: 6,
            }}
          >
            Full changelog
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Metrics row */}
        <div
          className="grid grid-cols-2 md:grid-cols-4"
          style={{ gap: 14, marginBottom: 28 }}
        >
          {METRICS.map(metric => {
            const card = (
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '20px 22px',
                  height: '100%',
                  transition: 'border-color 0.15s ease',
                }}
                className="hover:border-[var(--accent-cyan)]"
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  {metric.label}
                </div>
                <div
                  className="font-mono"
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                    lineHeight: 1,
                    marginBottom: 6,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {metric.value}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{metric.hint}</div>
              </div>
            );
            return metric.href ? (
              <Link
                key={metric.label}
                href={metric.href}
                style={{ textDecoration: 'none' }}
                aria-label={`${metric.label}: ${metric.value} ${metric.hint}`}
              >
                {card}
              </Link>
            ) : (
              <div key={metric.label}>{card}</div>
            );
          })}
        </div>

        {/* Recent ships + Premium tier CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]" style={{ gap: 24 }}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '20px 24px',
            }}
          >
            <div className="flex items-center" style={{ gap: 8, marginBottom: 14 }}>
              <GitCommit className="w-4 h-4" style={{ color: 'var(--accent-cyan)' }} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                Recently shipped
              </span>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {RECENT_SHIPS.map((ship, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 13.5,
                    color: 'var(--text-secondary)',
                    padding: '10px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <Link
                    href={ship.href}
                    style={{
                      color: 'var(--text-secondary)',
                      flex: 1,
                      textDecoration: 'none',
                    }}
                    className="hover:text-[var(--accent-cyan)]"
                  >
                    {ship.what}
                  </Link>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 11.5,
                      color: 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {ship.when}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Premium tier CTA */}
          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.06))',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
                <Zap className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    letterSpacing: '0.14em',
                    color: 'var(--accent-primary)',
                  }}
                >
                  / Premium tier live
                </span>
              </div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 8,
                  letterSpacing: '-0.01em',
                }}
              >
                Pay-per-call AI agent API.
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  marginBottom: 16,
                  lineHeight: 1.55,
                }}
              >
                USDC on Base. No accounts, no API keys, no Stripe. Validated end-to-end on
                mainnet. $0.02 per credit.
              </p>
            </div>
            <div className="flex" style={{ gap: 8 }}>
              <Link
                href="/developers/agent-payments"
                className="inline-flex items-center font-medium transition-colors hover:opacity-90"
                style={{
                  padding: '8px 14px',
                  background: 'var(--accent-primary)',
                  color: 'white',
                  borderRadius: 6,
                  fontSize: 12.5,
                  gap: 6,
                }}
              >
                <Activity className="w-3.5 h-3.5" />
                See the docs
              </Link>
              <Link
                href="/originals/validating-agent-payments-mainnet"
                className="inline-flex items-center transition-colors hover:text-[var(--accent-cyan)]"
                style={{
                  padding: '8px 14px',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 6,
                  fontSize: 12.5,
                  color: 'var(--text-secondary)',
                }}
              >
                Mainnet receipts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
