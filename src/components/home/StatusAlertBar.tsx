import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface StatusAlertBarService {
  name: string;
  status: string;
}

interface StatusAlertBarProps {
  services: StatusAlertBarService[];
}

const SERVICE_HREFS: Record<string, string> = {
  'Claude API': '/is-claude-down',
  Anthropic: '/is-claude-down',
  'OpenAI API': '/is-chatgpt-down',
  ChatGPT: '/is-chatgpt-down',
  OpenAI: '/is-chatgpt-down',
  'Google Gemini': '/is-gemini-down',
  Gemini: '/is-gemini-down',
  'GitHub Copilot': '/is-copilot-down',
  Copilot: '/is-copilot-down',
  Perplexity: '/is-perplexity-down',
  Cohere: '/is-cohere-down',
  Mistral: '/is-mistral-down',
  'Hugging Face': '/is-huggingface-down',
  Replicate: '/is-replicate-down',
  Midjourney: '/is-midjourney-down',
};

function classifySeverity(services: StatusAlertBarService[]): 'down' | 'degraded' | 'ok' {
  let worst: 'ok' | 'degraded' | 'down' = 'ok';
  for (const s of services) {
    const v = (s.status || '').toLowerCase();
    if (v === 'down' || v === 'outage' || v === 'major') return 'down';
    if (v === 'degraded' || v === 'partial' || v === 'warn') worst = 'degraded';
  }
  return worst;
}

function affectedNames(services: StatusAlertBarService[]): string[] {
  return services
    .filter((s) => {
      const v = (s.status || '').toLowerCase();
      return v !== 'operational' && v !== 'ok' && v !== '';
    })
    .map((s) => s.name);
}

/**
 * StatusAlertBar
 *
 * Slim banner at the very top of the homepage. Hides itself entirely
 * when every tracked service is operational. When at least one is
 * degraded or down, surfaces the affected service names with a
 * click-through to the corresponding /is-X-down detail page (or to
 * /status as a fallback).
 *
 * The "all green" branch is rendered as a thin, low-contrast confirmation
 * strip rather than completely hidden, because a) it gives returning
 * users instant reassurance during their bookmark visit, b) it makes
 * the conditional bar's appearance during incidents less of a layout
 * shift surprise, and c) "all systems operational" is itself a useful
 * SEO signal for status-anxious queries that land on the homepage.
 *
 * Designed to be a server component (no 'use client'); reads the
 * services array passed in from the homepage server fetch.
 */
export default function StatusAlertBar({ services }: StatusAlertBarProps) {
  const severity = classifySeverity(services);
  const affected = affectedNames(services);

  if (severity === 'ok' || affected.length === 0) {
    return (
      <div
        role="status"
        aria-label="All AI services operational"
        className="border-b border-border"
        style={{
          background: 'rgba(16,185,129,0.06)',
          borderColor: 'rgba(16,185,129,0.20)',
        }}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between flex-wrap gap-3 font-mono text-xs">
          <div className="inline-flex items-center gap-2" style={{ color: 'var(--accent-green)' }}>
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
              All systems operational
            </span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              {services.length} AI provider{services.length === 1 ? '' : 's'} monitored, polled every 2 minutes
            </span>
          </div>
          <Link
            href="/status"
            className="inline-flex items-center gap-1 hover:underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>Live status</span>
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  const isDown = severity === 'down';
  const accent = isDown ? 'var(--accent-red)' : 'var(--accent-amber)';
  const bg = isDown ? 'rgba(239,68,68,0.10)' : 'rgba(245,158,11,0.10)';
  const borderTone = isDown ? 'rgba(239,68,68,0.30)' : 'rgba(245,158,11,0.30)';
  const headline = isDown
    ? `${affected.length === 1 ? 'AI service outage' : 'Multiple AI service outages'}`
    : `${affected.length === 1 ? 'AI service degraded' : 'Multiple AI services degraded'}`;

  // Show up to 3 names inline, then "+N more" suffix. Each name links
  // to its dedicated detail page when we have one mapped.
  const inlineNames = affected.slice(0, 3);
  const remaining = affected.length - inlineNames.length;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="border-b"
      style={{
        background: bg,
        borderColor: borderTone,
      }}
    >
      <div
        className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between flex-wrap gap-3"
      >
        <div className="inline-flex items-center gap-2.5 flex-wrap">
          <AlertTriangle
            className="w-4 h-4 flex-shrink-0"
            style={{ color: accent }}
            aria-hidden="true"
          />
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: accent,
            }}
          >
            {headline}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {inlineNames.map((name, i) => {
              const href = SERVICE_HREFS[name] ?? '/status';
              return (
                <span key={name}>
                  {i > 0 && ', '}
                  <Link
                    href={href}
                    className="hover:underline"
                    style={{ color: 'var(--text-primary)', fontWeight: 500 }}
                  >
                    {name}
                  </Link>
                </span>
              );
            })}
            {remaining > 0 && (
              <span style={{ color: 'var(--text-muted)' }}>{` and ${remaining} more`}</span>
            )}
          </span>
        </div>
        <Link
          href="/status"
          className="inline-flex items-center gap-1 font-mono hover:underline"
          style={{
            color: accent,
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          <span>View incident details</span>
          <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
