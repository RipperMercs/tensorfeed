'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Newspaper } from 'lucide-react';

interface ShareBarProps {
  /** Path of the article on tensorfeed.ai (e.g. /originals/foo). */
  path: string;
  /** Article title. Used for X pre-fill. */
  title: string;
  /** Optional X handle to attribute via= (default: tensorfeed). */
  via?: string;
}

const SITE = 'https://tensorfeed.ai';

/**
 * Inline share bar for original articles. Mounted as a client island
 * directly under the article header so the metadata + JSON-LD on the
 * server-rendered page wrapper remain intact.
 *
 * Buttons:
 *   - X / Twitter (pre-filled text + url + via)
 *   - LinkedIn (sharing-share-offsite intent)
 *   - Copy link (clipboard, with a 2s "copied" confirmation)
 *   - Hacker News (submission intent for technical pieces)
 *
 * Visual: small mono labels alongside Lucide icons, neutral by
 * default, accent-color hover. Sits above the article body without
 * dominating the header.
 */
export default function ShareBar({ path, title, via = 'tensorfeed' }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const url = SITE + path;
  const enc = encodeURIComponent;

  const xHref = `https://x.com/intent/tweet?text=${enc(title)}&url=${enc(url)}&via=${enc(via)}`;
  const liHref = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;
  const hnHref = `https://news.ycombinator.com/submitlink?u=${enc(url)}&t=${enc(title)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API blocked (insecure context, permissions). Fall
      // back to opening the URL in a new window so the user can copy
      // manually from the address bar.
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const btnClass =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-text-secondary hover:text-accent-primary hover:border-accent-primary border border-border bg-bg-secondary transition-colors text-xs font-mono';

  return (
    <div
      className="flex flex-wrap items-center gap-2 mb-8"
      role="group"
      aria-label="Share this article"
    >
      <span
        className="font-mono uppercase text-text-muted"
        style={{ fontSize: 10.5, letterSpacing: '0.16em', marginRight: 4 }}
      >
        Share
      </span>

      <Link
        href={xHref}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
        aria-label="Share on X"
      >
        {/* X / Twitter glyph (no Lucide equivalent, render inline svg) */}
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          aria-hidden="true"
          fill="currentColor"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Post on X
      </Link>

      <Link
        href={liHref}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
        aria-label="Share on LinkedIn"
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          aria-hidden="true"
          fill="currentColor"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.554V9h3.565v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        LinkedIn
      </Link>

      <Link
        href={hnHref}
        target="_blank"
        rel="noopener noreferrer"
        className={btnClass}
        aria-label="Submit to Hacker News"
      >
        <Newspaper className="w-3.5 h-3.5" />
        Hacker News
      </Link>

      <button
        type="button"
        onClick={handleCopy}
        className={btnClass}
        aria-label={copied ? 'Link copied to clipboard' : 'Copy link to clipboard'}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent-green)' }} />
            <span style={{ color: 'var(--accent-green)' }}>Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            Copy link
          </>
        )}
      </button>
    </div>
  );
}
