import Link from 'next/link';
import { Terminal, BookText } from 'lucide-react';

export default function ApiPromoStrip() {
  return (
    <section style={{ padding: '20px 0' }} aria-labelledby="api-promo-h">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center"
          style={{
            background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '28px 32px',
            gap: 24,
          }}
        >
          <div>
            <div
              className="font-mono uppercase"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.14em',
                color: 'var(--accent-cyan)',
                marginBottom: 8,
              }}
            >
              {'// For builders'}
            </div>
            <h3
              id="api-promo-h"
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 6,
                letterSpacing: '-0.015em',
                color: 'var(--text-primary)',
              }}
            >
              Every signal in the AI industry, as a JSON feed.
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 560 }}>
              Pull structured data from every source TensorFeed tracks. Free and open for hobbyists,
              researchers, and AI agents.
            </p>
          </div>
          <div className="flex" style={{ gap: 10 }}>
            <Link
              href="/developers"
              className="inline-flex items-center font-medium transition-colors hover:opacity-90"
              style={{
                padding: '10px 18px',
                background: 'var(--accent-primary)',
                color: 'white',
                borderRadius: 6,
                fontSize: 13,
                gap: 8,
              }}
            >
              <Terminal className="w-3.5 h-3.5" />
              Get API access
            </Link>
            <Link
              href="/developers"
              className="inline-flex items-center font-medium transition-colors hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
              style={{
                padding: '10px 18px',
                border: '1px solid var(--border-strong)',
                borderRadius: 6,
                fontSize: 13,
                color: 'var(--text-primary)',
                gap: 8,
              }}
            >
              <BookText className="w-3.5 h-3.5" />
              Read docs
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
