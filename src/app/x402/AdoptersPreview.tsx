'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, ArrowRight } from 'lucide-react';

interface Adopter {
  id: string;
  name: string;
  org: string;
  category: string;
  status: string;
  networks: string[];
  tokens: string[];
  notes: string;
  websiteUrl: string;
}

interface ApiResponse {
  ok: boolean;
  count: number;
  lastUpdated: string;
  adopters: Adopter[];
}

const STATUS_COLORS: Record<string, string> = {
  live: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  beta: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  announced: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'reference-impl': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  sdk: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  gateway: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  spec: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function AdoptersPreview() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/x402-adopters')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: ApiResponse) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  if (error) {
    return (
      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-muted">
        Live adopter list unavailable. Browse the full directory at{' '}
        <Link href="/x402-adopters" className="text-accent-primary hover:underline">/x402-adopters</Link>.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-bg-secondary border border-border rounded-lg p-4 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  const preview = data.adopters.slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="text-xs text-text-muted font-mono">
        {data.count} adopters tracked, last updated {data.lastUpdated}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {preview.map(a => (
          <article
            key={a.id}
            className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-text-primary">{a.name}</h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${
                  STATUS_COLORS[a.status] || ''
                }`}
              >
                {a.status}
              </span>
            </div>
            <div className="text-xs text-text-muted mb-2">{a.org}</div>
            <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mb-2">
              {a.notes}
            </p>
            <a
              href={a.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent-primary hover:underline"
            >
              site <ExternalLink className="w-3 h-3" />
            </a>
          </article>
        ))}
      </div>
      <Link
        href="/x402-adopters"
        className="inline-flex items-center gap-1.5 text-sm text-accent-primary hover:underline mt-2 group"
      >
        See all {data.count} adopters
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}
