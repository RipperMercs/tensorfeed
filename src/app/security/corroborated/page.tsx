import { Metadata } from 'next';
import { ShieldCheck, Layers, GitBranch, AlertTriangle, Database } from 'lucide-react';
import { DatasetJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Corroborated Security Advisories: cross-source CVE trust for agents | TensorFeed',
  description:
    'A security agent that reads one advisory and acts on it is the real failure mode. The TensorFeed corroborated feed takes a GHSA advisory, deterministically checks its affected package against authoritative OSV (never-false-confirm), and enriches with KEV/EPSS/SSVC joined only by a verbatim-verified CVE id. We do NOT verify the advisory exploitation or severity claims. Premium, 1 credit per package.',
  alternates: { canonical: 'https://tensorfeed.ai/security/corroborated' },
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/security/corroborated',
    title: 'Corroborated Security Advisories | Cross-Source CVE Trust',
    description:
      'GHSA affected-package corroborated against authoritative OSV, plus deterministic KEV/EPSS/SSVC enrichment by verbatim-verified CVE id. One package, one paid call. Zero false-confirms.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Corroborated Security Advisories for AI Agents',
    description:
      'Deterministic GHSA-vs-OSV package corroboration + KEV/EPSS/SSVC enrichment by verified CVE id. Premium, never-false-confirm.',
  },
};

const CLAIM =
  'Affected package corroborated against authoritative OSV, plus deterministic KEV/EPSS/CVSS/SSVC enrichment joined by a verbatim-verified CVE id. We do NOT verify the advisory exploitation or severity claims; GHSA prose does not make them.';

const FAQS = [
  {
    question: 'What is the corroborated security feed?',
    answer:
      'A per-package endpoint. You pass ?package=<name> and get every GitHub Security Advisory naming that package, each one already cross-checked. For each advisory: the deterministic verdict of whether its affected package is present in authoritative OSV, plus KEV (CISA known-exploited), EPSS (exploit-probability), and SSVC enrichment attached only by a CVE id that was verbatim-verified against the advisory text. The agent does not have to stitch GHSA, OSV, NVD, KEV and EPSS together itself, and does not have to re-check what was already deterministically corroborated.',
  },
  {
    question: 'Why does this matter? Agents already read advisories.',
    answer:
      'Reading one advisory and acting is the failure mode. A patch-prioritization or SBOM agent that ingests a single GHSA entry has no cheap way to know whether the named package actually matches the authoritative ecosystem record, or whether the CVE it is keying on is real. Cross-source corroboration is the fix, and it has to be deterministic: the model extracts named fields verbatim, then pure code makes every judgment. No model opinion is in the verdict.',
  },
  {
    question: 'What exactly do you corroborate, and what do you not?',
    answer:
      'We corroborate the advisory affected package against authoritative OSV with a never-false-confirm matcher (ambiguous resolves to novel, never to a fabricated confirm). We enrich with KEV/EPSS/CVSS/SSVC joined only by a CVE id that literally appears in the advisory text. We do NOT verify the advisory exploitation-in-the-wild or severity claims: GHSA prose does not state them, the model is not allowed to infer them, and a fabricated or unanchored severity is quarantined rather than served. The honest claim is carried verbatim in the response so a consumer cannot misread the scope.',
  },
  {
    question: 'How big is the dataset and how honest are the counts?',
    answer:
      'This is a cross-source slice, not the full advisory database. The served set is 82 package-addressable advisories across 47 packages: 73 corroborated and 9 novel against authoritative OSV. 12 trusted advisories named no package and are unverifiable, so they are not retrievable by package and are deliberately excluded from the served counts rather than padded in. 6 records were quarantined by the anti-fabrication gate and are never served. The dataset grows as wider backfills land; the counts in the response always describe exactly what you can retrieve.',
  },
  {
    question: 'What is the never-false-confirm guarantee?',
    answer:
      'The product matcher only confirms when one token set is a clean subset of the other against the ecosystem-precise OSV record for that advisory. Partial overlap stays novel. NVD CPE applicability lists (which for famous CVEs enumerate every product that bundles a dependency) are treated as context only, never as match authority, because token-subset against that noise would false-confirm at scale. Across the production batch, zero false-confirms.',
  },
  {
    question: 'How do I integrate it?',
    answer:
      'GET /api/premium/security/corroborated?package=<name>, 1 credit ($0.02 USDC on Base) per call, x402 V2 and AFTA-signed receipts. Strict-premium: anonymous probes get the canonical 402 challenge, not a free-trial slot. Loose package matching is supported (package=commons-text resolves to the canonical name). Bundled and served with zero KV and zero upstream calls at request time; the extraction, deterministic corroboration, and verbatim-CVE guard all run offline.',
  },
];

export default function SecurityCorroboratedPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <DatasetJsonLd
        name="Corroborated Security Advisories (GHSA cross-source)"
        description={CLAIM}
        url="https://tensorfeed.ai/security/corroborated"
        keywords={[
          'ghsa advisory',
          'osv corroboration',
          'cve verification',
          'kev known exploited',
          'epss percentile',
          'ssvc enrichment',
          'security agent feed',
        ]}
      />
      <FAQPageJsonLd faqs={FAQS} />

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Corroborated Security Advisories
        </h1>
        <p className="text-text-secondary text-base">
          One package, one paid call: every GHSA advisory naming it, each cross-checked
          against authoritative databases by deterministic code, never by model opinion.
        </p>
      </header>

      <section aria-label="Honesty boundary" className="mb-10">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <p className="text-text-primary text-base leading-relaxed">
            <span className="text-text-muted text-sm">What this feed claims, verbatim:</span>{' '}
            {CLAIM}
          </p>
        </div>
      </section>

      <section className="mb-12">
        <div className="bg-bg-secondary border border-border rounded-xl p-6">
          <p className="text-text-primary text-base leading-relaxed">
            <span className="text-text-muted text-sm">The shape of the problem:</span>{' '}
            a security agent that ingests a single advisory and acts on it has no cheap way
            to know whether the named package matches the authoritative ecosystem record, or
            whether the CVE it is keying on is even real. The fix is cross-source
            corroboration, done <strong>deterministically</strong>: the model extracts named
            fields verbatim, then pure code makes every judgment. No model opinion is in the
            verdict, so there is nothing for the agent to re-check.
          </p>
        </div>
      </section>

      <section className="mb-12" id="how">
        <h2 className="text-2xl font-bold text-text-primary mb-6">How it works</h2>
        <div className="space-y-4">
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-start gap-3">
              <GitBranch className="w-5 h-5 text-accent-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-text-primary font-semibold mb-1">1. Verbatim extraction</h3>
                <p className="text-text-secondary text-sm">
                  A grammar-constrained local model copies named fields out of the GHSA
                  advisory prose exactly as written. It never infers, normalizes, or judges.
                  Every CVE id is checked to literally appear in the advisory text; a
                  fabricated or cross-advisory-bled id is dropped by construction.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-accent-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-text-primary font-semibold mb-1">2. Deterministic corroboration</h3>
                <p className="text-text-secondary text-sm">
                  Pure code checks the advisory affected package against the ecosystem-precise
                  OSV record for that advisory, with a never-false-confirm matcher: only a
                  clean token-subset confirms, ambiguity stays novel. NVD CPE applicability
                  lists are context only, never match authority.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Layers className="w-5 h-5 text-accent-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-text-primary font-semibold mb-1">3. Enrichment by verified CVE id</h3>
                <p className="text-text-secondary text-sm">
                  KEV (CISA known-exploited), EPSS percentile, and SSVC are joined onto the
                  advisory only by a CVE id that was verbatim-verified against the text. This
                  is authoritative data attached deterministically, not a claim the advisory
                  made and not a model judgment.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-accent-amber mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-text-primary font-semibold mb-1">4. Anti-fabrication quarantine</h3>
                <p className="text-text-secondary text-sm">
                  If a stated severity or exploitation value is not anchored verbatim in its
                  cited sentence, the whole record is excluded from the trusted set rather
                  than served with a possibly-fabricated claim. Quarantined records are never
                  in this feed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12" id="provenance">
        <h2 className="text-2xl font-bold text-text-primary mb-4">
          Every advisory is split into three honest buckets
        </h2>
        <div className="space-y-3">
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <h3 className="text-text-primary font-semibold mb-1">
              <code className="font-mono text-sm text-accent-primary">corroborated_claim</code>
            </h3>
            <p className="text-text-secondary text-sm">
              The advisory verbatim affected_products and the deterministic
              product-vs-OSV verdict (never-false-confirm). This is the trust signal.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <h3 className="text-text-primary font-semibold mb-1">
              <code className="font-mono text-sm text-accent-primary">deterministic_enrichment</code>
            </h3>
            <p className="text-text-secondary text-sm">
              KEV / EPSS / SSVC / OSV packages, joined only by a verbatim-verified CVE id.
              Authoritative data, not an advisory claim, not a model judgment.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-xl p-5">
            <h3 className="text-text-primary font-semibold mb-1">
              <code className="font-mono text-sm text-accent-primary">verbatim_context</code>
            </h3>
            <p className="text-text-secondary text-sm">
              Version ranges, fixed versions, severity and exploitation strings copied
              verbatim from the advisory. Context only: not corroborated, not a guarantee.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-12" id="endpoint">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Endpoint</h2>
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
            <code className="text-accent-primary font-mono text-sm">
              GET /api/premium/security/corroborated?package=
            </code>
            <span className="text-xs px-2 py-0.5 rounded bg-accent-secondary/10 text-accent-secondary border border-accent-secondary/30">
              $0.02 USDC
            </span>
          </div>
          <p className="text-text-secondary text-sm mb-2">
            One package whole corroborated GHSA advisory set per call. Strict-premium:
            anonymous probes get the canonical 402, not a free-trial slot. Loose package
            matching supported. x402 V2 on Base, AFTA-signed receipts.
          </p>
          <pre className="bg-bg-tertiary/50 border border-border rounded p-2 text-xs font-mono text-text-muted overflow-x-auto">
{`curl -H 'Authorization: Bearer tf_live_...' \\
  'https://tensorfeed.ai/api/premium/security/corroborated?package=free5gc'`}
          </pre>
        </div>
      </section>

      <section className="mb-12" id="response">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Sample shape</h2>
        <pre className="bg-bg-secondary border border-border rounded-xl p-5 text-xs font-mono text-text-secondary overflow-x-auto whitespace-pre leading-relaxed">
{`{
  "ok": true,
  "package_query": "free5gc",
  "matched_package": "free5GC",
  "claim": "Affected package corroborated against authoritative OSV ...",
  "advisory_count": 13,
  "advisories": [
    {
      "source_url": "https://github.com/advisories/GHSA-27ph-8q4f-h7m7",
      "overall": "corroborated",
      "corroborated_claim": {
        "affected_products": ["free5GC"],
        "product_corroboration": "confirmed"
      },
      "deterministic_enrichment": {
        "cves_verbatim_verified": [],
        "kev_listed": false,
        "epss_percentile": null,
        "ssvc": null,
        "osv_packages": ["github.com/free5gc/bsf"]
      },
      "verbatim_context": {
        "affected_version_ranges": ["v4.2.1"],
        "fixed_versions": [],
        "severity_label": "unstated",
        "exploited_in_wild": "unstated"
      }
    }
  ],
  "billing": { "credits_charged": 1, "credits_remaining": 44 }
}`}
        </pre>
      </section>

      <section className="mb-12">
        <div className="bg-bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-accent-amber" aria-hidden="true" />
            What this is NOT
          </h2>
          <ul className="text-text-secondary text-sm space-y-2 list-disc pl-5">
            <li>
              Not a verification of the advisory exploitation-in-the-wild or severity
              claims. GHSA prose does not state them; we never infer them.
            </li>
            <li>
              Not the full advisory database. It is a cross-source slice: 82
              package-addressable advisories (73 corroborated, 9 novel) across 47 packages,
              growing as wider backfills land.
            </li>
            <li>
              Not padded. 12 product-less unverifiable advisories and 6 quarantined records
              are excluded from the served counts, not counted to look bigger.
            </li>
            <li>
              Not a model opinion. Every verdict is deterministic code over verbatim
              extraction.
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-4">
        <h2 className="text-2xl font-bold text-text-primary mb-4">FAQ</h2>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.question} className="bg-bg-secondary border border-border rounded-xl p-5">
              <summary className="text-text-primary font-semibold cursor-pointer">
                {faq.question}
              </summary>
              <p className="text-text-secondary text-sm mt-2 leading-relaxed">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-label="Related data" className="mb-4">
        <div className="bg-bg-secondary border border-border rounded-xl p-5 flex items-start gap-3">
          <Database className="w-5 h-5 text-accent-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p className="text-text-secondary text-sm">
            Related: the free <a href="/verified-feed" className="text-accent-primary hover:underline">cross-source news Verified Feed</a>{' '}
            applies the same single-source-is-the-failure-mode thesis to AI news, and{' '}
            <a href="/api/security/kev" className="text-accent-primary hover:underline">/api/security/kev</a>{' '}
            is the free CISA known-exploited catalog.
          </p>
        </div>
      </section>
    </main>
  );
}
