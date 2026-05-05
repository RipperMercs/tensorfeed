import Link from 'next/link';
import { FileText, Download } from 'lucide-react';

export default function WhitepaperPromoStrip() {
  return (
    <section style={{ padding: '20px 0' }} aria-labelledby="whitepaper-promo-h">
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
                color: 'var(--accent-primary)',
                marginBottom: 8,
              }}
            >
              {'// The whitepaper'}
            </div>
            <h3
              id="whitepaper-promo-h"
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 6,
                letterSpacing: '-0.015em',
                color: 'var(--text-primary)',
              }}
            >
              The Agent Fair-Trade Agreement v1.0
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600 }}>
              An open standard for honest commerce between autonomous AI agents and the web.
              Code-enforced no-charge guarantees, Ed25519-signed receipts, USDC on Base, peer-to-peer
              federation. Reference implementation runs on TensorFeed.
            </p>
          </div>
          <div className="flex" style={{ gap: 10 }}>
            <Link
              href="/whitepaper"
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
              <FileText className="w-3.5 h-3.5" />
              Read the whitepaper
            </Link>
            <Link
              href="/whitepaper#javascript:window.print()"
              aria-label="Open the whitepaper to save as PDF"
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
              <Download className="w-3.5 h-3.5" />
              Save as PDF
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
