import { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security Policy',
  description: 'TensorFeed.ai security policy covering vulnerability reporting, scope, response times, safe harbor, and acknowledgments. RFC 9116 security.txt at /.well-known/security.txt.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/security',
    title: 'Security Policy',
    description: 'TensorFeed.ai security policy covering vulnerability reporting, scope, response times, safe harbor, and acknowledgments. RFC 9116 security.txt at /.well-known/security.txt.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Security Policy',
    description: 'TensorFeed.ai security policy covering vulnerability reporting, scope, response times, safe harbor, and acknowledgments.',
  },
};

export default function SecurityPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Security Policy</h1>
        </div>
        <p className="text-text-muted text-sm">Last updated: May 4, 2026</p>
      </div>

      <div className="space-y-8 text-text-secondary leading-relaxed">
        <section>
          <p>
            TensorFeed.ai welcomes responsible disclosure of security issues. This page describes
            how to report a vulnerability, what is in scope, and what you can expect from us in
            return. The machine-readable companion to this page lives at{' '}
            <Link href="/.well-known/security.txt" className="text-accent-primary hover:underline">
              /.well-known/security.txt
            </Link>{' '}
            and follows{' '}
            <a
              href="https://www.rfc-editor.org/rfc/rfc9116.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              RFC 9116
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">How to Report</h2>
          <p className="mb-3">
            Send a clear, reproducible report to{' '}
            <a href="mailto:support@tensorfeed.ai" className="text-accent-primary hover:underline">
              support@tensorfeed.ai
            </a>{' '}
            with subject line beginning <code className="text-text-primary">[security]</code>.
            Please include:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>A short description of the issue and its impact</li>
            <li>Step-by-step reproduction (URL, request payload, expected vs actual response)</li>
            <li>The date you discovered it</li>
            <li>Whether the issue is already public anywhere</li>
            <li>How you would like to be credited if at all</li>
          </ul>
          <p className="mt-3">
            Please do not file a public GitHub issue for unpatched vulnerabilities. Use email so we
            can coordinate a fix and disclosure timeline together.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Scope</h2>
          <p className="mb-3">In scope:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>tensorfeed.ai and any subdomain we operate</li>
            <li>The Cloudflare Worker that serves <code className="text-text-primary">/api/*</code></li>
            <li>The <code className="text-text-primary">@tensorfeed/mcp-server</code> npm package</li>
            <li>The <code className="text-text-primary">tensorfeed</code> Python and JavaScript SDKs</li>
            <li>The agent payments rail (USDC on Base) where it touches our wallet, signed receipts, or stored credit balances</li>
            <li>The Agent Fair-Trade Agreement implementation</li>
          </ul>
          <p className="mt-4 mb-3">Out of scope:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Denial of service against the live API (we already cap aggressive traffic; volumetric tests will just trip the rate limiter)</li>
            <li>Findings on third-party services (Cloudflare, Resend, npm, PyPI, Base RPC providers, Hugging Face, Semantic Scholar, arXiv) that we depend on but do not operate</li>
            <li>Reports from automated scanners with no proof-of-impact attached</li>
            <li>Missing security headers on assets that are not user input boundaries (see CSP via <code className="text-text-primary">public/_headers</code>)</li>
            <li>Self-XSS that requires the user to paste content into their own browser console</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">What to Expect</h2>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <span className="text-text-primary font-medium">Acknowledgment within 72 hours</span>{' '}
              of receiving your report.
            </li>
            <li>
              <span className="text-text-primary font-medium">Triage and severity assessment</span>{' '}
              within 7 days, with a fix plan if the report is in scope.
            </li>
            <li>
              <span className="text-text-primary font-medium">Coordinated disclosure</span> once a
              fix is deployed. Default disclosure window is 90 days from initial report; we will
              ask for an extension only if a fix is genuinely complex.
            </li>
            <li>
              <span className="text-text-primary font-medium">Credit in the acknowledgments
              section below</span> if you would like it. We do not currently run a paid bug bounty
              program, but we will publicly thank you.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Safe Harbor</h2>
          <p>
            We will not pursue legal action against researchers who follow this policy in good
            faith. Specifically: do not access data that is not yours, do not modify or delete
            data, do not degrade service for other users, and do not retain credentials,
            personal data, or proprietary information. If you discover any such material
            inadvertently, stop testing immediately and contact us. We treat reports as
            confidential until a coordinated disclosure timeline is agreed.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Defenses Currently in Place</h2>
          <p className="mb-3">
            Useful context for researchers when scoping reports:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <span className="text-text-primary font-medium">Prompt-injection sanitization</span>{' '}
              on every agent-facing endpoint and on every MCP server tool response. See{' '}
              <Link href="/developers/agent-payments#prompt-injection-sanitization" className="text-accent-primary hover:underline">
                docs
              </Link>.
            </li>
            <li>
              <span className="text-text-primary font-medium">Per-IP rate limit</span> (120
              req/min) on free public endpoints; <span className="text-text-primary font-medium">per-token
              circuit breaker</span> (20 identical or 100 varied req/min/token) on premium.
            </li>
            <li>
              <span className="text-text-primary font-medium">Static-site security headers</span>{' '}
              (CSP, HSTS preload, frame-ancestors, COEP, CORP) via <code className="text-text-primary">public/_headers</code>.
            </li>
            <li>
              <span className="text-text-primary font-medium">OFAC sanctions screening</span> on
              every payment confirmation via the Chainalysis public API; misconfig fails closed.
            </li>
            <li>
              <span className="text-text-primary font-medium">Ed25519-signed receipts</span> on
              every premium response, public key at{' '}
              <Link href="/.well-known/tensorfeed-receipt-key.json" className="text-accent-primary hover:underline">
                /.well-known/tensorfeed-receipt-key.json
              </Link>.
            </li>
            <li>
              <span className="text-text-primary font-medium">Replay protection</span> on every
              USDC transaction hash (no reuse, ever).
            </li>
            <li>
              <span className="text-text-primary font-medium">Public on-chain payment rail</span>.
              Every credit purchase is independently verifiable on the Base block explorer.
            </li>
            <li>
              <span className="text-text-primary font-medium">No-charge guarantees</span> for 5xx
              responses, circuit-breaker trips, schema validation failures, and stale data. The{' '}
              <Link href="/api/payment/no-charge-stats" className="text-accent-primary hover:underline">
                public no-charge ledger
              </Link>{' '}
              records every event.
            </li>
          </ul>
        </section>

        <section id="acknowledgments">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Acknowledgments</h2>
          <p>
            We will list researchers who report valid issues here, with their permission. No
            entries yet. Be the first by following the reporting process above.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Related</h2>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <Link href="/.well-known/security.txt" className="text-accent-primary hover:underline">
                /.well-known/security.txt
              </Link>{' '}
              (RFC 9116, machine-readable)
            </li>
            <li>
              <Link href="/agent-fair-trade" className="text-accent-primary hover:underline">
                Agent Fair-Trade Agreement
              </Link>
            </li>
            <li>
              <Link href="/developers/agent-payments" className="text-accent-primary hover:underline">
                Agent Payments developer docs
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-accent-primary hover:underline">
                Privacy Policy
              </Link>{' '}
              (data handling for premium API users)
            </li>
            <li>
              <Link href="/terms" className="text-accent-primary hover:underline">
                Terms of Service
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
