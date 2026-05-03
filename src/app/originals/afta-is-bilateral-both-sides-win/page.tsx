import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import AdPlaceholder from '@/components/AdPlaceholder';

export const metadata: Metadata = {
  title: 'AFTA Is Bilateral. Here Is Why Both Sides Win.',
  description:
    'AFTA shipped as a code-enforced fair-trade standard for AI agents, but the framing undersold what the standard actually does. The same primitives that protect agents also protect publishers. As autonomous agents move trillions of micropayments per day, both sides of every paid call need a clear, code-enforceable contract.',
  openGraph: {
    title: 'AFTA Is Bilateral. Here Is Why Both Sides Win.',
    description:
      'AFTA is the open standard for API trade between humans, businesses, and AI agents. Same primitives protect agents (verifiable charges, bounded loss) and publishers (dispute defense, predictable revenue). The internet of money breaks loose terms for both sides.',
    type: 'article',
    publishedTime: '2026-05-03T18:00:00Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AFTA Is Bilateral. Here Is Why Both Sides Win.',
    description:
      'The same fair-trade primitives protect agents and publishers. At agent velocity, vague billing is a security issue, not a UX issue. Inside the bilateral case for AFTA.',
  },
};

export default function AftaIsBilateralBothSidesWinPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="AFTA Is Bilateral. Here Is Why Both Sides Win."
        description="AFTA is the open standard for API trade between humans, businesses, and AI agents. Same primitives protect agents (verifiable charges, bounded loss) and publishers (dispute defense, predictable revenue)."
        datePublished="2026-05-03"
        author="Ripper"
      />

      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          AFTA Is Bilateral. Here Is Why Both Sides Win.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-05-03">May 3, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          When we shipped the Agent Fair-Trade Agreement four days ago, I framed it as a
          standard for API publishers being fair to AI agents. That framing was correct, and
          it was incomplete. The same primitives that protect an agent also protect the
          business on the other side of the call. AFTA is bilateral by design, and the
          bilateral case is the one that scales.
        </p>

        <p>
          Reframing matters because the audience just expanded. The first version of the
          standard sold itself to agent builders. The bilateral version sells itself to every
          API publisher whose customers will soon be agents.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What AFTA Actually Is</h2>

        <p>
          AFTA is the open standard for API trade between humans, businesses, and AI agents.
          It is a small contract enforced in code, not policy. Three primitives:
          code-enforced no-charge guarantees on failed or stale calls, Ed25519-signed
          receipts on every paid call, and a public on-chain payment rail (USDC on Base) so
          settlement is independently auditable.
        </p>

        <p>
          What the agent gets is the part I led with last week. Bounded loss. Cryptographic
          proof of every charge. The ability to audit a publisher offline against a public
          JWK. No certificate authority, no shared secret, no central registry. Agents have
          been getting billed by APIs designed for human credit cards, and the standard is
          what we built when we got tired of watching that go wrong.
        </p>

        <p>
          What I should have led with too is the publisher side. Same primitives. Different
          benefits. Equally concrete.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why Publishers Want This (Not Charity)</h2>

        <p>
          A publisher who ships AFTA is not being magnanimous. They are accepting a code-level
          contract that constrains their billing in exchange for primitives they cannot get
          any other way. Three of those primitives matter most.
        </p>

        <p>
          <strong className="text-text-primary">Cryptographic dispute defense.</strong> The
          biggest unsolved problem in agent-paid commerce is the dispute. An agent operator
          looks at a bill, decides it is wrong, and claims the API was billing for failed
          calls. Without proof, the publisher loses on reputation alone. With AFTA, every
          charge is a signed receipt: the publisher can produce the receipt, the agent or
          its operator can verify the signature against the same public key, and the dispute
          either dissolves or moves on to a real disagreement instead of a he-said-she-said.
          The signature chain holds up in any forum.
        </p>

        <p>
          <strong className="text-text-primary">Predictable, defensible revenue.</strong>{' '}
          The four no-charge rules look like a constraint on the publisher, and they are.
          They are also a public commitment that bounds bad-faith disputes. An agent cannot
          credibly claim &ldquo;your handler crashed and you charged me&rdquo; when the publisher has a
          signed receipt with{' '}
          <code className="font-mono text-xs">no_charge_reason: &quot;5xx&quot;</code> and{' '}
          <code className="font-mono text-xs">credits_charged: 0</code>. Predictability cuts
          both ways. The publisher does not bill for failures, and in exchange, the publisher
          is presumed honest until proven otherwise.
        </p>

        <p>
          <strong className="text-text-primary">Open distribution at zero onboarding tax.</strong>{' '}
          Every adopter publishes a tiny manifest at{' '}
          <code className="font-mono text-xs">/.well-known/agent-fair-trade.json</code>.
          Any agent that recognizes the standard already knows how to authenticate, how to
          read pricing, how to verify receipts, how to settle on the published rail. The
          publisher does not have to write a custom SDK, court a single agent vendor, or
          negotiate per-customer integration deals. The standard does the distribution.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Velocity Argument</h2>

        <p>
          The reason this becomes urgent rather than nice-to-have is volume. A small number
          of agents already make tens of thousands of API calls per day per agent. The
          frontier coding agents we benchmark on{' '}
          <Link href="/harnesses" className="text-accent-primary hover:underline">
            /harnesses
          </Link>{' '}
          run hours-long sessions that fan out to hundreds of independent paid endpoints. The
          Cloudflare-Stripe agent provisioning protocol that{' '}
          <Link
            href="/originals/cloudflare-stripe-agent-provisioning-protocol"
            className="text-accent-primary hover:underline"
          >
            launched this past week
          </Link>{' '}
          assumes agents will spin up real production infrastructure across 32 partner
          providers without a human in the loop. The number of paid calls per day is going
          to 1000x in the next 24 months, and each one of those calls is a potential
          dispute.
        </p>

        <p>
          At 100,000 calls a day, fuzzy billing is not a UX issue. It is a security issue. A
          loose contract creates surface area for both bad-faith agents and bad-faith
          publishers. Every ambiguous charge is a coin flip on whether either side acts in
          good faith, and the cost of those coin flips compounds. AFTA is a way to drain the
          ambiguity out of the contract before that volume hits, on both sides at once.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Pain</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Without AFTA</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">With AFTA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Failed call billed?</td>
                <td className="px-4 py-3">Agent says yes, publisher says no, no proof either way</td>
                <td className="px-4 py-3">Signed receipt with no_charge_reason settles it</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Stale data billed at full price?</td>
                <td className="px-4 py-3">Agent has no way to check the SLA</td>
                <td className="px-4 py-3">Public freshness SLA + auto no-charge if exceeded</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Charge dispute</td>
                <td className="px-4 py-3">Publisher loses on reputation alone</td>
                <td className="px-4 py-3">Receipt signature is verifiable in any forum</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Onboarding a new agent vendor</td>
                <td className="px-4 py-3">Per-vendor SDK and integration negotiation</td>
                <td className="px-4 py-3">Agent reads /.well-known/agent-fair-trade.json</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Mid-month rule changes</td>
                <td className="px-4 py-3">Publisher edits ToS, agent finds out at billing time</td>
                <td className="px-4 py-3">Manifest is the contract; bumps are visible publicly</td>
              </tr>
            </tbody>
          </table>
        </div>

        <AdPlaceholder format="in-article" className="my-8" />

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Changes for an Adopter</h2>

        <p>
          Nothing in the implementation changes when you reframe the standard as bilateral.
          The same{' '}
          <code className="font-mono text-xs">afta-protocol</code> npm package signs the same
          receipts. The same{' '}
          <code className="font-mono text-xs">afta-cloudflare-worker</code> middleware wraps
          the same handlers. The federation members (TensorFeed and TerminalFeed today) keep
          using the same shared credit ledger. The bilateral version of the pitch just
          reaches a wider audience: every API publisher whose customers will soon be agents,
          not only the ones who already lead with agent-friendliness.
        </p>

        <p>
          If you publish a paid API, the integration is small. Generate an Ed25519 keypair
          with{' '}
          <code className="font-mono text-xs">npx afta-generate-key</code>. Wrap your paid
          handler in{' '}
          <code className="font-mono text-xs">createPremiumHandler</code> or port the four
          guarantees into your existing middleware. Publish a 50-line manifest at{' '}
          <code className="font-mono text-xs">/.well-known/agent-fair-trade.json</code>. You
          are an adopter. Adoption is the certification. There is no fee, no review, no
          authority.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Pressure Curve</h2>

        <p>
          Once a meaningful number of paid APIs ship AFTA, the publishers who have not
          shipped one have to explain why. Same dynamic the Cloudflare-Stripe protocol is
          creating in agent provisioning right now. Neon, Turso, Auth0, WorkOS, Stytch,
          Netlify, and Fly were not on the launch list, and the article said it plainly: the
          first to support agent provisioning starts winning the agent share of the market;
          the last is starting to lose it. AFTA is the same pattern at the billing layer.
          Publishers who lack code-enforced fairness primitives by Q4 will be losing
          agent-routed revenue to publishers who shipped.
        </p>

        <p>
          The good news for publishers reading this is that the standard is open, the
          implementation is on npm, and the schema is published. The integration is one
          weekend of work for a small team, less for one with an existing payment rail. No
          one is gatekeeping.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Both Sides Win</h2>

        <p>
          The bilateral framing is not a marketing pivot. It is the truth about what the
          standard does. The same lines of code that refuse to bill an agent for a 5xx also
          generate the receipt the publisher uses to defend a future dispute. The same
          freshness SLA that keeps an agent from being charged for stale data also
          differentiates a publisher whose data is actually fresh from one whose data is
          not. The same on-chain payment trail that gives an agent a public record of every
          dollar paid gives the publisher a public record of every dollar received.
        </p>

        <p>
          This is a small standard. It does not solve identity, attribution, anti-abuse, or
          liability. It solves the narrowest, most concrete piece: every paid call between an
          agent and a publisher should be verifiable by either party at any point in the
          future. Both sides win when the contract is enforced in code. The internet of
          money is going to need more of this, not less.
        </p>

        <p>
          The standard is at{' '}
          <Link href="/agent-fair-trade" className="text-accent-primary hover:underline">
            tensorfeed.ai/agent-fair-trade
          </Link>
          . The reference implementation is on npm as{' '}
          <code className="font-mono text-xs">afta-protocol</code> and{' '}
          <code className="font-mono text-xs">afta-cloudflare-worker</code>. The adopter
          directory is at{' '}
          <Link href="/afta-network" className="text-accent-primary hover:underline">
            /afta-network
          </Link>
          . If you publish a paid API, ship one. If you build agents, ask the APIs you call
          when they will. The bilateral case is the case.
        </p>
      </div>

      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/agent-fair-trade"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              The Agent Fair-Trade Agreement: standard, schema, code references
            </span>
          </Link>
          <Link
            href="/originals/cloudflare-stripe-agent-provisioning-protocol"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Agents Just Got the Keys to Production. The Cloudflare-Stripe Protocol Is Live.
            </span>
          </Link>
          <Link
            href="/afta-network"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              AFTA Network Directory: known adopters
            </span>
          </Link>
        </div>
      </footer>

      <AdPlaceholder format="horizontal" className="mt-10" />

      <div className="flex flex-wrap items-center gap-4 mt-12 pt-6 border-t border-border text-sm">
        <Link
          href="/originals"
          className="inline-flex items-center gap-1.5 text-text-muted hover:text-accent-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Originals
        </Link>
        <Link href="/" className="text-text-muted hover:text-accent-primary transition-colors">
          Back to Feed
        </Link>
      </div>
    </article>
  );
}
