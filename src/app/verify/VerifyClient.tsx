'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Check, X, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

interface AftaCheck {
  id: string;
  name: string;
  passed: boolean;
  details: string;
  fixUrl?: string;
}

interface AftaResult {
  ok: boolean;
  domain: string;
  checked_at: string;
  checks: AftaCheck[];
  score: number;
  max: number;
  verdict: 'certified-eligible' | 'almost-eligible' | 'not-yet-eligible';
  afta_certified: boolean;
  next_step: string;
  applied_to_directory: boolean;
  federation_parent?: string;
}

const EXAMPLE_DOMAINS = ['tensorfeed.ai', 'terminalfeed.io', 'coinbase.com'];

export default function VerifyClient() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AftaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async (domain: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const res = await fetch(`/api/afta-certify/check?domain=${encodeURIComponent(cleaned)}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as AftaResult;
      setResult(data);
      const newUrl = `${window.location.pathname}?domain=${encodeURIComponent(cleaned)}`;
      window.history.replaceState({}, '', newUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run if ?domain= is in the URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preset = params.get('domain');
    if (preset) {
      setInput(preset);
      runCheck(preset);
    }
  }, [runCheck]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) runCheck(input.trim());
  };

  const verdictColor = result
    ? result.verdict === 'certified-eligible'
      ? 'text-green-500 bg-green-500/10 border-green-500/30'
      : result.verdict === 'almost-eligible'
      ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30'
      : 'text-red-500 bg-red-500/10 border-red-500/30'
    : '';

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="example.com"
          autoComplete="off"
          spellCheck={false}
          aria-label="Domain to verify"
          className="flex-1 px-4 py-3 bg-bg-secondary border border-border-primary rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-5 py-3 bg-accent-primary text-white rounded font-medium hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Checking...' : 'Verify'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="text-text-muted">Try:</span>
        {EXAMPLE_DOMAINS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              setInput(d);
              runCheck(d);
            }}
            className="px-2 py-0.5 bg-bg-secondary border border-border-primary rounded text-text-secondary hover:text-accent-primary hover:border-accent-primary/50 font-mono text-xs"
          >
            {d}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-red-400">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium">Check failed</div>
              <div className="text-sm mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className={`border rounded-lg p-5 ${verdictColor}`}>
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <div className="text-2xl font-bold">
                  <span className="font-mono">{result.domain}</span>
                  <span className="text-text-muted ml-3 text-base font-normal">
                    {result.score} / {result.max}
                  </span>
                </div>
                <div className="text-sm mt-1 capitalize">
                  {result.verdict.replace(/-/g, ' ')}
                  {result.federation_parent ? (
                    <span className="text-text-muted">
                      {' '}· federation member of{' '}
                      <code className="text-accent-primary">{result.federation_parent}</code>
                    </span>
                  ) : null}
                </div>
              </div>
              {result.afta_certified ? (
                <span className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded text-green-400 text-xs font-medium">
                  AFTA-Certified
                </span>
              ) : null}
            </div>
            <div className="text-sm text-text-secondary mt-3 leading-relaxed">{result.next_step}</div>
          </div>

          <div className="space-y-2">
            {result.checks.map((check) => (
              <div
                key={check.id}
                className={`flex items-start gap-3 p-4 rounded border ${
                  check.passed
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}
              >
                {check.passed ? (
                  <Check className="w-5 h-5 mt-0.5 text-green-500 flex-shrink-0" />
                ) : (
                  <X className="w-5 h-5 mt-0.5 text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-text-primary">{check.name}</div>
                  <div className="text-sm text-text-secondary mt-1">{check.details}</div>
                  {check.fixUrl ? (
                    <a
                      href={check.fixUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-accent-primary hover:underline"
                    >
                      Fix this <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-text-muted pt-2 border-t border-border-primary">
            Checked at{' '}
            <time dateTime={result.checked_at}>{new Date(result.checked_at).toLocaleString()}</time>
            {' · '}
            <a
              href={`/api/afta-certify/check?domain=${encodeURIComponent(result.domain)}`}
              className="text-accent-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              raw JSON
            </a>
            {' · '}
            <a
              href="https://github.com/RipperMercs/tensorfeed-x402-base-mcp"
              className="text-accent-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              run this check yourself with the MCP
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
