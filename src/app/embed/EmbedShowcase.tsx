'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Monitor, Sun, Moon } from 'lucide-react';

/**
 * Interactive showcase for the embeddable status widget. Live preview
 * (iframe to the production /widget/status) plus theme and height
 * controls that update a copy-paste snippet in real time.
 *
 * The preview always points at the deployed widget so what a publisher
 * copies is exactly what they will see on their own site.
 */

type ThemeChoice = 'dark' | 'light' | 'auto';

const WIDGET_BASE = 'https://tensorfeed.ai/widget/status';

const HEIGHTS: { label: string; value: number; note: string }[] = [
  { label: 'Compact', value: 460, note: 'sidebars, tight columns' },
  { label: 'Standard', value: 560, note: 'most pages' },
  { label: 'Full', value: 720, note: 'dedicated status section' },
];

function srcFor(theme: ThemeChoice): string {
  return theme === 'dark' ? WIDGET_BASE : `${WIDGET_BASE}?theme=${theme}`;
}

function iframeSnippet(theme: ThemeChoice, height: number): string {
  return `<iframe
  src="${srcFor(theme)}"
  title="Live AI provider status by TensorFeed"
  width="100%"
  height="${height}"
  loading="lazy"
  style="border:0;border-radius:12px;max-width:880px"
></iframe>`;
}

function responsiveSnippet(theme: ThemeChoice): string {
  return `<div style="position:relative;width:100%;max-width:880px;aspect-ratio:880/560">
  <iframe
    src="${srcFor(theme)}"
    title="Live AI provider status by TensorFeed"
    loading="lazy"
    style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px"
  ></iframe>
</div>`;
}

function CopyBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (rare). The code stays selectable in the block.
    }
  };
  return (
    <div className="rounded-lg border border-border overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs font-mono text-text-muted">{label}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border border-border text-text-secondary hover:text-text-primary hover:border-accent-primary transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto text-[12.5px] leading-relaxed font-mono text-text-secondary">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function EmbedShowcase() {
  const [theme, setTheme] = useState<ThemeChoice>('dark');
  const [height, setHeight] = useState<number>(560);

  const src = useMemo(() => srcFor(theme), [theme]);
  const snippet = useMemo(() => iframeSnippet(theme, height), [theme, height]);
  const responsive = useMemo(() => responsiveSnippet(theme), [theme]);

  const themeBtn = (value: ThemeChoice, Icon: typeof Sun, label: string) => {
    const active = theme === value;
    return (
      <button
        type="button"
        onClick={() => setTheme(value)}
        aria-pressed={active}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${
          active
            ? 'border-accent-primary text-text-primary'
            : 'border-border text-text-muted hover:text-text-secondary'
        }`}
        style={active ? { background: 'var(--bg-tertiary)' } : undefined}
      >
        <Icon className="w-4 h-4" />
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">Theme</div>
          <div className="flex gap-2">
            {themeBtn('dark', Moon, 'Dark')}
            {themeBtn('light', Sun, 'Light')}
            {themeBtn('auto', Monitor, 'Auto')}
          </div>
        </div>
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">Height</div>
          <div className="flex gap-2">
            {HEIGHTS.map((h) => {
              const active = height === h.value;
              return (
                <button
                  key={h.value}
                  type="button"
                  onClick={() => setHeight(h.value)}
                  aria-pressed={active}
                  title={h.note}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    active
                      ? 'border-accent-primary text-text-primary'
                      : 'border-border text-text-muted hover:text-text-secondary'
                  }`}
                  style={active ? { background: 'var(--bg-tertiary)' } : undefined}
                >
                  {h.label}
                  <span className="text-text-muted"> · {h.value}px</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div>
        <div className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
          Live preview (this is the real, deployed widget)
        </div>
        <div
          className="rounded-xl border border-bg-tertiary overflow-hidden"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <iframe
            key={`${theme}-${height}`}
            src={src}
            title="Live AI provider status by TensorFeed"
            loading="lazy"
            style={{ width: '100%', height, border: 0, display: 'block' }}
          />
        </div>
        <p className="text-xs text-text-muted mt-2">
          Loads live from{' '}
          <a
            href="https://tensorfeed.ai/api/status/summary"
            className="text-accent-cyan hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            /api/status/summary
          </a>{' '}
          and{' '}
          <a
            href="https://tensorfeed.ai/api/probe/latest"
            className="text-accent-cyan hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            /api/probe/latest
          </a>
          . No API key, no tracking, refreshed every ~2 minutes.
        </p>
      </div>

      {/* Snippets */}
      <div className="grid gap-4">
        <CopyBlock code={snippet} label="Paste this anywhere in your HTML" />
        <details className="group">
          <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary select-none">
            Need a fully responsive embed? Use the aspect-ratio wrapper instead
          </summary>
          <div className="mt-3">
            <CopyBlock code={responsive} label="Responsive aspect-ratio embed" />
          </div>
        </details>
      </div>
    </div>
  );
}
