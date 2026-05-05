'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface Props {
  slug: string;
  name: string;
  href: string;
}

export default function BadgeCopyRow({ slug, name, href }: Props) {
  const [copied, setCopied] = useState<'md' | 'html' | null>(null);

  const badgeUrl = `https://tensorfeed.ai/api/badge/uptime/${slug}`;
  const markdown = `![${name} uptime](${badgeUrl})`;
  const html = `<img src="${badgeUrl}" alt="${name} uptime"/>`;

  async function copy(kind: 'md' | 'html', text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1800);
    } catch {
      // Clipboard API blocked; users can still select and copy manually.
    }
  }

  return (
    <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-4 flex-1 min-w-[260px]">
        <Link
          href={href}
          className="text-text-primary font-medium hover:text-accent-primary transition-colors inline-flex items-center gap-1.5"
        >
          {name}
          <ExternalLink className="w-3 h-3 text-text-muted" />
        </Link>
        <img
          src={badgeUrl}
          alt={`${name} uptime`}
          height={20}
          loading="lazy"
          className="flex-shrink-0"
        />
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => copy('md', markdown)}
          className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded border border-border hover:border-accent-primary text-text-secondary hover:text-text-primary transition-colors"
          aria-label={`Copy markdown for ${name} badge`}
        >
          {copied === 'md' ? (
            <>
              <Check className="w-3 h-3 text-accent-green" />
              <span>copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>md</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => copy('html', html)}
          className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded border border-border hover:border-accent-primary text-text-secondary hover:text-text-primary transition-colors"
          aria-label={`Copy HTML for ${name} badge`}
        >
          {copied === 'html' ? (
            <>
              <Check className="w-3 h-3 text-accent-green" />
              <span>copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>html</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
