'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { classifySeverity, affectedNames, type StatusAlertBarService } from '@/lib/alert-bar-logic';

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
  'AWS Bedrock': '/is-bedrock-down',
  Bedrock: '/is-bedrock-down',
  'Azure OpenAI': '/is-azure-openai-down',
  DeepSeek: '/is-deepseek-down',
  'Together AI': '/is-together-down',
  Together: '/is-together-down',
  'Fireworks AI': '/is-fireworks-down',
  Fireworks: '/is-fireworks-down',
  OpenRouter: '/is-openrouter-down',
  ElevenLabs: '/is-elevenlabs-down',
  'Stability AI': '/is-stability-ai-down',
  Stability: '/is-stability-ai-down',
  Runway: '/is-runway-down',
  Luma: '/is-luma-down',
  'Luma AI': '/is-luma-down',
};

interface StatusAlertBarProps {
  services: StatusAlertBarService[];
}

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between flex-wrap gap-3 font-mono text-xs">
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
            className="inline-flex items-center gap-1 hover:underline -mr-3"
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
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between flex-wrap gap-3"
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
