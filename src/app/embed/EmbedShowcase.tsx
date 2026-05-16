'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Sparkles, Sun, Moon } from 'lucide-react';

/**
 * Interactive showcase for the embeddable Live Monitor widget. Live
 * preview (iframe to the production /widget/status) plus accent and
 * height controls that update a copy-paste snippet in real time.
 *
 * The preview always points at the deployed widget so what a publisher
 * copies is exactly what they will see on their own site.
 */

type Accent = 'auto' | 'blue' | 'green';

const WIDGET_BASE = 'https://tensorfeed.ai/widget/status';

const ACCENTS: { id: Accent; label: string; swatch: string; note: string }[] = [
  { id: 'auto', label: 'Auto', swatch: 'linear-gradient(135deg,#4ee0a4,#5fd4f5)', note: 'green when all nominal, blue otherwise' },
  { id: 'blue', label: 'Blue', swatch: '#5fd4f5', note: 'always bridge cyan' },
  { id: 'green', label: 'Green', swatch: '#4ee0a4', note: 'always all-clear green' },
];

const HEIGHTS: { label: string; value: number; note: string }[] = [
  { label: 'Compact', value: 480, note: 'sidebars, tight columns' },
  { label: 'Standard', value: 600, note: 'most pages' },
  { label: 'Tall', value: 760, note: 'dedicated status section' },
];

function srcFor(accent: Accent): string {
  return accent === 'auto' ? WIDGET_BASE : `${WIDGET_BASE}?accent=${accent}`;
}

function iframeSnippet(accent: Accent, height: number): string {
  return `<iframe
  src="${srcFor(accent)}"
  title="TensorFeed live monitor"
  width="100%"
  height="${height}"
  loading="lazy"
  style="border:0;max-width:720px"
></iframe>`;
}

function responsiveSnippet(accent: Accent): string {
  return `<div style="position:relative;width:100%;max-width:720px;aspect-ratio:720/600">
  <iframe
    src="${srcFor(accent)}"
    title="TensorFeed live monitor"
    loading="lazy"
    style="position:absolute;inset:0;width:100%;height:100%;border:0"
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
  const [accent, setAccent] = useState<Accent>('auto');
  const [height, setHeight] = useState<number>(600);

  const src = useMemo(() => srcFor(accent), [accent]);
  const snippet = useMemo(() => iframeSnippet(accent, height), [accent, height]);
  const responsive = useMemo(() => responsiveSnippet(accent), [accent]);

  const accentIcon = (id: Accent) =>
    id === 'auto' ? <Sparkles className="w-4 h-4" /> : id === 'green' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">Accent</div>
          <div className="flex gap-2">
            {ACCENTS.map((a) => {
              const active = accent === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccent(a.id)}
                  aria-pressed={active}
                  title={a.note}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    active
                      ? 'border-accent-primary text-text-primary'
                      : 'border-border text-text-muted hover:text-text-secondary'
                  }`}
                  style={active ? { background: 'var(--bg-tertiary)' } : undefined}
                >
                  <span aria-hidden="true" className="w-3 h-3 rounded-full" style={{ background: a.swatch }} />
                  {accentIcon(a.id)}
                  {a.label}
                </button>
              );
            })}
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
          className="rounded-xl border border-bg-tertiary overflow-hidden flex justify-center"
          style={{ background: '#04070d' }}
        >
          <iframe
            key={`${accent}-${height}`}
            src={src}
            title="TensorFeed live monitor"
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
          . No API key, no tracking. Add{' '}
          <code className="text-text-secondary">?poll=60</code> to slow the refresh.
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
