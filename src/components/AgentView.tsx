'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Terminal, X, Copy, Check, ExternalLink } from 'lucide-react';
import { useViewMode } from './ViewModeProvider';

type Endpoint = { url: string; label: string };

function getRouteEndpoints(pathname: string): Endpoint[] {
  if (pathname === '/') {
    return [
      { url: '/api/news?limit=20', label: 'News (top 20)' },
      { url: '/api/status/summary', label: 'Status summary' },
      { url: '/api/agents/activity', label: 'Agent activity' },
      { url: '/api/meta', label: 'API metadata' },
    ];
  }
  if (pathname.startsWith('/models')) {
    return [
      { url: '/api/models', label: 'Models catalog' },
      { url: '/api/benchmarks', label: 'Benchmarks' },
    ];
  }
  if (pathname.startsWith('/agents')) {
    return [
      { url: '/api/agents/directory', label: 'Agents directory' },
      { url: '/api/agents/activity', label: 'Live activity' },
      { url: '/api/agents/news', label: 'Agent news' },
    ];
  }
  if (pathname.startsWith('/research')) {
    return [{ url: '/api/news?category=research&limit=50', label: 'Research news' }];
  }
  if (pathname === '/status' || pathname.startsWith('/is-')) {
    return [
      { url: '/api/status', label: 'Full status' },
      { url: '/api/status/summary', label: 'Status summary' },
      { url: '/api/incidents', label: 'Incident history' },
    ];
  }
  if (pathname.startsWith('/live')) {
    return [
      { url: '/api/agents/activity', label: 'Live agent activity' },
      { url: '/api/news?limit=50', label: 'Latest news' },
    ];
  }
  if (pathname.startsWith('/today')) {
    return [{ url: '/api/news?limit=50', label: "Today's news" }];
  }
  if (pathname.startsWith('/timeline')) {
    return [{ url: '/data/timeline.json', label: 'Timeline data' }];
  }
  if (pathname.startsWith('/podcasts')) {
    return [{ url: '/api/podcasts', label: 'Podcasts' }];
  }
  if (pathname.startsWith('/incidents')) {
    return [{ url: '/api/incidents', label: 'Incidents' }];
  }
  if (pathname.startsWith('/benchmarks')) {
    return [
      { url: '/api/benchmarks', label: 'Benchmarks' },
      { url: '/api/models', label: 'Models' },
    ];
  }
  if (pathname.startsWith('/tools/trending')) {
    return [{ url: '/api/trending-repos', label: 'Trending repos' }];
  }
  if (pathname.startsWith('/tools/cost-calculator')) {
    return [{ url: '/api/models', label: 'Model pricing' }];
  }
  if (pathname.startsWith('/originals')) {
    return [
      { url: '/api/news?category=originals&limit=50', label: 'Originals' },
      { url: '/feed.xml', label: 'RSS feed' },
    ];
  }
  if (pathname.startsWith('/changelog')) {
    return [{ url: '/api/meta', label: 'API metadata' }];
  }
  if (pathname.startsWith('/developers')) {
    return [
      { url: '/api/meta', label: 'API metadata' },
      { url: '/.well-known/x402.json', label: 'x402 manifest' },
      { url: '/openapi.json', label: 'OpenAPI spec' },
    ];
  }
  if (pathname.startsWith('/account')) {
    return [
      { url: '/api/payment/info', label: 'Payment info' },
      { url: '/api/payment/balance', label: 'Balance (auth)' },
    ];
  }
  if (pathname.startsWith('/glossary')) {
    return [
      { url: '/llms.txt', label: 'LLM discovery' },
      { url: '/api/meta', label: 'API metadata' },
    ];
  }
  if (pathname.startsWith('/for-ai-agents')) {
    return [
      { url: '/llms.txt', label: 'LLM discovery' },
      { url: '/api/meta', label: 'API metadata' },
      { url: '/.well-known/x402.json', label: 'x402 manifest' },
      { url: '/openapi.json', label: 'OpenAPI spec' },
    ];
  }
  return [{ url: '/api/meta', label: 'API metadata' }];
}

function isJsonContentType(ct: string | null): boolean {
  if (!ct) return false;
  return ct.includes('application/json') || ct.includes('+json') || ct.includes('text/json');
}

function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'tf-json-number';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'tf-json-key' : 'tf-json-string';
        } else if (/true|false/.test(match)) {
          cls = 'tf-json-bool';
        } else if (/null/.test(match)) {
          cls = 'tf-json-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

export default function AgentView() {
  const { viewMode, toggleViewMode, mounted } = useViewMode();
  const pathname = usePathname();
  const endpoints = useMemo(() => getRouteEndpoints(pathname), [pathname]);
  const [selected, setSelected] = useState<string>(endpoints[0]?.url ?? '/api/meta');
  const [body, setBody] = useState<string>('');
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [statusLine, setStatusLine] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelected(endpoints[0]?.url ?? '/api/meta');
  }, [endpoints]);

  useEffect(() => {
    if (!mounted || viewMode !== 'agent') return;
    let cancelled = false;
    async function fetchEndpoint() {
      setLoading(true);
      setError(null);
      try {
        const fetchUrl = selected.startsWith('http')
          ? selected
          : `https://tensorfeed.ai${selected}`;
        const res = await fetch(fetchUrl, { cache: 'no-store' });
        if (cancelled) return;
        const ct = res.headers.get('content-type');
        const text = await res.text();
        if (cancelled) return;
        const collected: Record<string, string> = {};
        res.headers.forEach((v, k) => {
          collected[k] = v;
        });
        setHeaders(collected);
        setStatusLine(`HTTP/1.1 ${res.status} ${res.statusText}`);
        if (isJsonContentType(ct)) {
          try {
            const parsed = JSON.parse(text);
            setBody(JSON.stringify(parsed, null, 2));
          } catch {
            setBody(text);
          }
        } else {
          setBody(text);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Fetch failed');
        setBody('');
        setHeaders({});
        setStatusLine('');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchEndpoint();
    return () => {
      cancelled = true;
    };
  }, [selected, viewMode, mounted]);

  // Modal a11y: move focus into the overlay when it opens (only on open, not on
  // every re-render, so it does not steal focus while the user interacts).
  useEffect(() => {
    if (mounted && viewMode === 'agent') {
      closeButtonRef.current?.focus();
    }
  }, [mounted, viewMode]);

  // Modal a11y: Escape closes the overlay and Tab is trapped within it.
  useEffect(() => {
    if (!mounted || viewMode !== 'agent') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        toggleViewMode();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mounted, viewMode, toggleViewMode]);

  if (!mounted || viewMode !== 'agent') return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const fullUrl = selected.startsWith('http') ? selected : `https://tensorfeed.ai${selected}`;
  const curl = `curl ${fullUrl}`;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Agent view" className="tf-agent-view fixed inset-0 z-[100] flex flex-col font-mono text-sm">
      <div className="tf-agent-scanlines absolute inset-0 pointer-events-none" />

      <header className="relative z-10 border-b border-accent-cyan/30 bg-bg-primary/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-4 h-4 text-accent-cyan shrink-0" />
          <span className="text-accent-cyan font-bold tracking-widest text-xs">AGENT VIEW</span>
          <span className="text-text-muted text-xs hidden sm:inline">/</span>
          <span className="text-text-secondary text-xs truncate hidden sm:inline">{pathname}</span>
        </div>
        <button
          ref={closeButtonRef}
          onClick={toggleViewMode}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-accent-cyan/40 text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
          aria-label="Switch to human view"
        >
          <X className="w-3.5 h-3.5" />
          EXIT AGENT MODE
        </button>
      </header>

      <div className="relative z-10 border-b border-accent-cyan/20 bg-bg-secondary/80 px-4 py-2 flex flex-wrap items-center gap-2">
        <span className="text-text-muted text-xs uppercase tracking-wider">endpoint:</span>
        {endpoints.map((ep) => (
          <button
            key={ep.url}
            onClick={() => setSelected(ep.url)}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${
              selected === ep.url
                ? 'border-accent-cyan text-accent-cyan bg-accent-cyan/10'
                : 'border-border text-text-secondary hover:border-accent-cyan/50 hover:text-text-primary'
            }`}
          >
            {ep.label}
          </button>
        ))}
        <a
          href={selected}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs text-text-muted hover:text-accent-cyan transition-colors"
        >
          open raw
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="relative z-10 flex-1 overflow-auto bg-bg-primary">
        <div className="px-4 py-3 border-b border-border/50 bg-bg-secondary/40">
          <div className="text-xs text-text-muted mb-1">$ <span className="text-text-secondary">{curl}</span></div>
          {statusLine && (
            <div className="text-xs">
              <span className={statusLine.includes(' 2') ? 'text-accent-green' : statusLine.includes(' 4') || statusLine.includes(' 5') ? 'text-accent-red' : 'text-text-secondary'}>
                {statusLine}
              </span>
            </div>
          )}
          {Object.keys(headers).length > 0 && (
            <details className="mt-1">
              <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary select-none">
                response headers ({Object.keys(headers).length})
              </summary>
              <div className="mt-2 pl-3 border-l border-border space-y-0.5">
                {Object.entries(headers).map(([k, v]) => (
                  <div key={k} className="text-xs">
                    <span className="text-accent-cyan/80">{k}:</span> <span className="text-text-secondary">{v}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        <div className="relative">
          <button
            onClick={handleCopy}
            className="absolute top-3 right-4 z-10 flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-bg-primary/90 text-text-secondary hover:text-accent-cyan hover:border-accent-cyan transition-colors"
            aria-label="Copy response body"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'copied' : 'copy'}
          </button>
          {loading && (
            <div className="px-4 py-6 text-text-muted text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-accent-cyan animate-pulse mr-2" />
              fetching {selected}...
            </div>
          )}
          {error && (
            <div className="px-4 py-6 text-accent-red text-xs">error: {error}</div>
          )}
          {!loading && !error && body && (
            <pre
              className="px-4 py-4 text-xs leading-relaxed whitespace-pre-wrap break-all text-text-primary"
              dangerouslySetInnerHTML={{ __html: syntaxHighlight(body) }}
            />
          )}
        </div>
      </div>

      <footer className="relative z-10 border-t border-accent-cyan/20 bg-bg-secondary/80 px-4 py-2 text-xs text-text-muted flex flex-wrap items-center justify-between gap-2">
        <span>
          machine-readable first. <span className="text-accent-cyan">tensorfeed.ai</span> serves the same data to humans and agents.
        </span>
        <span className="hidden sm:inline">
          discovery:{' '}
          <a href="/llms.txt" className="text-text-secondary hover:text-accent-cyan">/llms.txt</a>
          <span className="mx-1">·</span>
          <a href="/api/meta" className="text-text-secondary hover:text-accent-cyan">/api/meta</a>
          <span className="mx-1">·</span>
          <a href="/.well-known/x402.json" className="text-text-secondary hover:text-accent-cyan">/.well-known/x402.json</a>
        </span>
      </footer>
    </div>
  );
}
