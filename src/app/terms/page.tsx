import { Metadata } from 'next';
import Link from 'next/link';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'TensorFeed.ai terms of service covering acceptable use, data sourcing and derived works, premium API payments in USDC on Base and Solana, disclaimers, and limitation of liability.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/terms',
    title: 'Terms of Service',
    description: 'TensorFeed.ai terms of service covering acceptable use, data sourcing and derived works, premium API payments in USDC on Base and Solana, disclaimers, and limitation of liability.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Service',
    description: 'TensorFeed.ai terms of service covering acceptable use, data sourcing and derived works, premium API payments in USDC on Base and Solana, disclaimers, and limitation of liability.',
  },
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-7 h-7 text-accent-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Terms of Service</h1>
        </div>
        <p className="text-text-muted text-sm">Last updated: July 21, 2026</p>
      </div>

      <div className="space-y-8 text-text-secondary leading-relaxed">
        {/* Intro */}
        <section>
          <p>
            Welcome to TensorFeed.ai. By accessing or using our website at tensorfeed.ai (the
            &quot;Site&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If
            you do not agree to these Terms, please do not use the Site. TensorFeed.ai, the Premium
            API, and all related services are operated by Pizza Robot Studios LLC, a California
            limited liability company (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). Pizza
            Robot Studios LLC is the legal entity responsible for the payment wallets at
            <code className="bg-bg-tertiary px-1 py-0.5 rounded text-xs font-mono mx-1">0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1</code>
            on Base mainnet and
            <code className="bg-bg-tertiary px-1 py-0.5 rounded text-xs font-mono mx-1">B8uYDm3snMCAUwt6NWTV3u7akcmd1AWzCXKQ1dDKWcFJ</code>
            on Solana mainnet, and is the counterparty for all premium-tier purchases and disputes
            per the Premium API and Agent Payments section below. Premium credits are
            non-refundable; see Section 17.5.
          </p>
        </section>

        {/* Acceptable Use */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Acceptable Use</h2>
          <p className="mb-3">
            You may use TensorFeed.ai for lawful purposes only. When using the Site, you agree not to:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Use the Site in any way that violates applicable laws or regulations</li>
            <li>Attempt to interfere with or disrupt the Site&apos;s infrastructure or services</li>
            <li>Scrape, crawl, or harvest content from the Site in a manner that places undue burden on our servers</li>
            <li>Misrepresent your identity or affiliation when contacting us</li>
            <li>Use the Site to distribute malware, spam, or other harmful content</li>
            <li>Attempt to access areas of the Site or our systems that are not intended for public access</li>
          </ul>
          <p className="mt-3">
            AI agents and automated tools are welcome to access our public API endpoints, RSS feeds, and
            structured data files (llms.txt, feed.json, feed.xml) for legitimate purposes. We ask that
            automated access respect reasonable rate limits and identify itself with a descriptive
            User-Agent header.
          </p>
        </section>

        {/* Intellectual Property */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Intellectual Property and Content Attribution</h2>
          <p className="mb-3">
            TensorFeed.ai aggregates headlines, snippets, and metadata from publicly available RSS feeds
            and APIs published by third-party sources including (but not limited to) Anthropic, OpenAI,
            Google, Meta, TechCrunch, The Verge, Ars Technica, and Hacker News.
          </p>
          <p className="mb-3">
            All aggregated content remains the intellectual property of its original publisher. We display
            brief snippets under fair use principles and always link back to the original source. We do
            not republish full articles or claim ownership of third-party content.
          </p>
          <p className="mb-3">
            Original editorial content published under{' '}
            <Link href="/originals" className="text-accent-primary hover:underline">TensorFeed Originals</Link>{' '}
            is the property of Pizza Robot Studios LLC. You may quote or reference our original content
            with proper attribution and a link back to the source article.
          </p>
          <p className="mb-3">
            The TensorFeed name, logo, and site design are the property of Pizza Robot Studios LLC. You
            may not use our branding without prior written permission.
          </p>
          <p>
            Our normalized, scored, ranked, and otherwise derived data products are governed by
            Section 20, which sets out where our source material comes from, how we collect it,
            what we transform it into, what we claim, and what we expressly do not claim.
          </p>
        </section>

        {/* API and Data Use */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">API and Data Usage</h2>
          <p className="mb-3">
            TensorFeed.ai provides free public API endpoints and data feeds for developers and AI agents.
            Use of our API is subject to the following conditions:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>API access is provided as-is with no guaranteed uptime or SLA</li>
            <li>We reserve the right to rate-limit or block abusive usage</li>
            <li>Data obtained from our API should not be resold as a standalone product</li>
            <li>We may modify or discontinue API endpoints at any time</li>
            <li>Free-tier data is subject to the sourcing, transformation, and derived-works terms in Section 20</li>
          </ul>
        </section>

        {/* Premium API and Agent Payments */}
        <section id="premium">
          <h2 className="text-lg font-semibold text-text-primary mb-3">17. Premium API and Agent Payments</h2>
          <p className="mb-4">
            TensorFeed offers a paid premium API tier for AI agents and developers who need ranked
            routing recommendations, computed intelligence, and historical data. Premium access is
            paid in USDC on two supported settlement rails: Base mainnet (native USDC) and Solana
            mainnet (the canonical USDC SPL mint). No other chain, token, or payment method is
            accepted. Both rails settle into the same credit-accounting system, so a credit bought
            on one rail behaves identically to a credit bought on the other, and every provision of
            this Section applies to both rails equally. By using premium endpoints (any path under
            <code className="bg-bg-tertiary px-1 py-0.5 rounded text-xs font-mono mx-1">/api/premium/</code>)
            you agree to the additional terms below.
          </p>

          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.1 Inference-only license</h3>
              <p>
                Premium API responses are licensed for inference-time use only. You may not use
                TensorFeed premium data, in whole or in part, for training, fine-tuning, evaluation,
                distillation, or benchmarking of machine learning models without prior written
                consent. Violation results in immediate access revocation and forfeiture of
                remaining credits.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.2 Bearer token security</h3>
              <p>
                The bearer token issued after a successful payment is your responsibility to
                safeguard. Anyone with the token can spend the credits attached to it. Treat it
                like an API key. We will not replace tokens leaked or shared by your account.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.3 Wallet verification and rail selection</h3>
              <p className="mb-3">
                Always cross-check the TensorFeed payment wallet for your chosen rail across our
                published locations
                (<code className="bg-bg-tertiary px-1 py-0.5 rounded text-xs font-mono">/llms.txt</code>,
                {' '}
                <code className="bg-bg-tertiary px-1 py-0.5 rounded text-xs font-mono">/api/payment/info</code>,
                {' '}
                <code className="bg-bg-tertiary px-1 py-0.5 rounded text-xs font-mono">/.well-known/x402.json</code>,
                {' '}
                the GitHub README, and the verified X bio) before sending funds. The Base wallet and
                the Solana wallet are different addresses on incompatible networks and are not
                interchangeable.
              </p>
              <p>
                You are solely responsible for selecting the correct rail, network, token, and
                destination address. Funds sent to the wrong address, on the wrong network, in the
                wrong asset, or in an amount below the quoted price will not mint credits, are
                generally not recoverable by anyone including us, and will not be refunded or
                replaced. See Section 17.17.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.4 Replay protection</h3>
              <p>
                Each on-chain payment can be used to mint credits exactly once, on either rail. The
                settlement identifier (the Base transaction hash or the Solana transaction
                signature, together with the derived per-payment discriminator) is recorded
                server-side on first use; resubmitting the same payment a second time will be
                rejected.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.5 No refunds; credits do not expire</h3>
              <p>
                All credit purchases are final and non-refundable. Once a purchase is confirmed
                on-chain and credits are minted to a bearer token, the funds will not be returned
                in USDC, fiat, or any other form. Because credits never expire and remain spendable
                indefinitely on terminalfeed.io and tensorfeed.ai, users are encouraged to purchase
                in small increments (for example, $1 USDC for 50 credits) until call volume is
                calibrated, then top up as needed. The sole remedy for a purchase that turns out to
                be larger than required is to spend the unused balance over time, including on the
                cross-site partner described in Section 17.8.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.6 No SLA</h3>
              <p>
                Premium endpoints are provided on a best-effort basis. We do not offer a service
                level agreement and are not liable for downtime, latency, or data quality issues.
                Specific premium endpoints may be modified or discontinued with reasonable notice.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.7 Tax treatment</h3>
              <p>
                Pizza Robot Studios LLC handles its own taxes. All USDC received is logged at the
                received-date USD value and reported as ordinary income. We do not issue invoices
                to agents; the on-chain transaction is the receipt.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.8 Cross-site applicability</h3>
              <p>
                Premium credits and bearer tokens are jointly redeemable on tensorfeed.ai and
                terminalfeed.io, both operated by Pizza Robot Studios LLC under a single
                credit-accounting system. TensorFeed is the system of record for credit balances.
                These Terms, including the Premium API provisions in this Section, apply to all
                calls made against your bearer token across the cross-site bundle. Where a sister
                site applies its own additional rules (for example, route-specific rate limits),
                those rules apply in addition to (not in lieu of) these Terms.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.9 User and operator representations</h3>
              <p>
                By purchasing premium credits, by deploying an autonomous agent that purchases or
                holds premium credits on your behalf, or by accepting custody of a bearer token,
                you represent and warrant on a continuing basis that: (a) you are at least 18 years
                old, or the age of legal majority in your jurisdiction, and have full legal
                capacity and authority to enter into this agreement, including, where applicable,
                authority to bind any corporate or other entity on whose behalf you act; (b) you
                are not a person or entity subject to sanctions administered or enforced by the
                United States Office of Foreign Assets Control (OFAC), the United States Department
                of State, the United Nations Security Council, the European Union, the United
                Kingdom HM Treasury, or any other applicable sanctions authority; (c) you are not
                located, established, ordinarily resident, or organized in any country or territory
                subject to comprehensive sanctions, currently including Cuba, Iran, North Korea,
                Syria, the Crimea region, the so-called Donetsk and Luhansk People&apos;s
                Republics, and any successor or analogous designation; (d) the funds used to
                acquire USDC and to pay for credits are derived from lawful sources and are not the
                proceeds of any criminal activity; (e) your use of the Premium API will comply with
                all applicable laws, including anti-money-laundering, counter-terrorism financing,
                export control, sanctions, securities, tax, and consumer-protection laws; and (f)
                you are not acting on behalf of, and will not transfer credits or bearer tokens to,
                any party with respect to whom any of the foregoing representations is or would
                become untrue. Breach of any representation in this Section is a material breach of
                these Terms and grounds for immediate token revocation under Section 17.11.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.10 Autonomous agent acknowledgment</h3>
              <p>
                The Premium API is designed to be consumed by autonomous AI agents and other
                automated systems. When you deploy or operate such an agent and configure it,
                directly or indirectly, to access the Premium API, you remain solely responsible
                for: (i) the actions and omissions of the agent, including all on-chain
                transactions it initiates and all calls it makes; (ii) the bearer tokens it holds
                and the credits it spends; (iii) any decisions, including financial, investment,
                trading, operational, safety, medical, or legal decisions, made by the agent or by
                downstream systems on the basis of Premium API responses; and (iv) any losses,
                costs, or damages that result from the agent&apos;s behavior. Premium API responses
                are provided for informational and inference purposes only. Aggregated upstream
                data may be stale, partial, inaccurate, or unavailable, and nothing returned by the
                Premium API constitutes financial, investment, trading, legal, medical, or other
                professional advice. We are not a fiduciary, broker-dealer, investment adviser, or
                counterparty to any trade, and we assume no responsibility for outcomes arising
                from autonomous use of the Service.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.11 Suspension and revocation for abuse</h3>
              <p>
                We reserve the right, in our sole and reasonable discretion and with or without
                prior notice, to throttle, rate-limit, suspend, or permanently revoke any bearer
                token, to refuse to confirm any pending credit purchase, and to refuse future
                purchases originating from the same wallet, email, operator, or related party,
                where we determine in good faith that the associated activity: (i) violates these
                Terms or applicable law; (ii) constitutes fraud, money laundering, sanctions
                evasion, market manipulation, or other illicit conduct; (iii) materially degrades
                the Service for other users, including denial-of-service patterns, runaway loops,
                or scraping at volumes inconsistent with normal agent behavior; (iv) attempts to
                circumvent billing, replay confirmed transactions, share or distribute bearer
                tokens beyond a single agent or operator in a manner not reasonably contemplated by
                the cross-site bundle in Section 17.8, or otherwise manipulate the credit-accounting
                system; or (v) presents a security, regulatory, or reputational risk to the Service
                or to its operating entity. Where we revoke a bearer token under this Section, any
                unspent credits associated with that token are forfeited and are not subject to
                refund, reissuance, or any other compensation. Section 17.5 (no refunds) governs
                the financial consequences of any action taken under this Section.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.12 Premium API acceptable use</h3>
              <p>
                In addition to the Acceptable Use section above, users and operators of the Premium
                API agree not to: (a) resell, sublicense, or otherwise commercialize raw Premium
                API access, whether by reselling bearer tokens, by exposing a wrapper or proxy API
                that materially reproduces the Premium API surface for third parties, or by any
                other means; (b) use the Premium API to build, train, fine-tune, evaluate, or
                improve any product, model, or service that competes, directly or indirectly, with
                the Service or with the cross-site partner described in Section 17.8; (c) scrape,
                mirror, or systematically download Premium API responses for the purpose of
                building a competing data-aggregation product or dataset; (d) attempt to
                reverse-engineer rate limits, billing logic, credit accounting, or signature
                verification; (e) submit requests at a volume that, in our reasonable judgment,
                exceeds normal agent operation, including through coordinated multi-token campaigns
                designed to evade per-token limits; (f) use Premium API responses in any way that
                violates the inference-only license in Section 17.1; or (g) embed Premium API
                access in any product or service marketed to, or knowingly used by, persons subject
                to the sanctions or jurisdictional restrictions in Section 17.9. For clarity,
                building agent products and downstream applications that consume the Premium API on
                behalf of their own end users, where each call is properly billed against a credit
                balance held by the operator, is permitted and encouraged.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.13 Limitation of liability for the Premium API</h3>
              <p>
                Without limiting the No Warranties and Limitation of Liability sections above, and
                to the maximum extent permitted by applicable law, the aggregate liability of Pizza
                Robot Studios LLC and its members, managers, officers, employees, contractors,
                agents, and affiliates (collectively, the &quot;Released Parties&quot;) to any
                user, operator, agent, or end user, arising out of or related to the Premium API,
                on any theory of liability whether in contract, tort (including negligence),
                statute, or otherwise, shall not exceed the greater of: (i) the total
                USDC-equivalent amount actually paid by that user or operator for Premium API
                credits in the twelve (12) months immediately preceding the event giving rise to
                the claim, or (ii) one hundred United States dollars (USD 100). In no event shall
                any of the Released Parties be liable for lost profits, lost revenue, lost trading
                opportunities, lost data, lost goodwill, business interruption, regulatory fines,
                or for any indirect, incidental, special, consequential, exemplary, or punitive
                damages, even if advised in advance of the possibility of such damages. Some
                jurisdictions do not allow the exclusion or limitation of certain damages; in such
                jurisdictions, the foregoing limitations apply to the maximum extent permitted by
                law and the remaining limitations remain in full force.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.14 Chargeback, reversal, and fraudulent purchase handling</h3>
              <p>
                USDC transfers on Base mainnet and on Solana mainnet are technically irreversible,
                and once we have
                confirmed an inbound transaction and minted credits to a bearer token, we are not
                in a position to return the original USDC. Where, however, an underlying fiat-to-
                USDC purchase is later reversed, charged back, voided, or determined by us in good
                faith to have been funded fraudulently, by means of compromised credentials, or in
                violation of Section 17.9, we reserve the right, in addition to the remedies in
                Section 17.11, to: (i) freeze the bearer token associated with the affected
                purchase; (ii) reverse the corresponding credit grant in whole or in part; (iii)
                decline future purchases originating from the same wallet, email, device, or
                operator, and from any related party we reasonably identify; and (iv) report the
                matter to law enforcement, to regulators, and to the cross-site partner described
                in Section 17.8. The user or operator who submitted the original payment
                instruction shall indemnify the Released Parties against any losses, costs, fees,
                or liabilities we suffer as a result of such reversal, fraud, or compromise.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.15 No money services business; sale of own service</h3>
              <p>
                Pizza Robot Studios LLC is not, and does not hold itself out as, a money services
                business, money transmitter, virtual asset service provider, exchange, custodian,
                broker-dealer, investment adviser, or other financial institution. We accept USDC
                on Base mainnet and Solana mainnet as payment for our own data and information
                services, and we do not exchange currencies, custody assets for users, facilitate
                transfers of value between users, or hold customer funds beyond the period
                reasonably required to confirm a credit purchase. Accepting a second settlement
                rail does not change that posture: both rails are inbound payment for our own
                service, and neither is offered as a transfer, conversion, or bridging service for
                anyone else. Nothing in these Terms creates any fiduciary, advisory, agency, or
                banking relationship between you and Pizza Robot Studios LLC.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.16 Sanctions screening of payments</h3>
              <p>
                Inbound payment wallets on both rails are screened against a third-party blockchain
                analytics sanctions oracle before credits are minted. Screening operates on a
                fail-closed basis: where a wallet returns a sanctions hit, or where the screening
                provider is unavailable and we cannot complete the check, the payment does not mint
                credits. We may block, hold, or decline any payment on this basis, and we may
                report blocked activity to the relevant authorities where we believe we are
                required or permitted to do so. Funds already transferred on-chain in connection
                with a blocked or declined payment are not returned, exchanged, or credited, and
                Section 17.5 governs. Screening is a compliance control operated for our own
                benefit; it is not a certification, endorsement, or clearance of any wallet,
                counterparty, or transaction, and you may not rely on it as such.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.17 Assumption of on-chain and infrastructure risk</h3>
              <p>
                Blockchain payments carry risks we cannot control or reverse. By paying for premium
                access you accept sole responsibility for, and assume the risk of: sending to an
                incorrect address; selecting the wrong network or rail, including sending a Base
                asset to the Solana wallet or a Solana asset to the Base wallet; sending an
                unsupported token; underpaying or overpaying the quoted amount; loss or compromise
                of your private keys, seed phrase, wallet software, or bearer token; transaction
                fees, priority fees, slippage, and rent; chain reorganizations, congestion, forks,
                halts, or finality delays; and outages, errors, censorship, or discontinuation
                affecting any wallet provider, RPC provider, indexer, facilitator, sponsor of
                transaction fees, bridge, exchange, or stablecoin issuer involved in your payment.
                We rely on third-party infrastructure to observe, verify, and settle payments and
                to serve the Service, and we are not liable for the acts, omissions, downtime, or
                failures of those third parties. We do not guarantee that any particular rail
                remains available; we may add, suspend, or retire a settlement rail at any time,
                and previously minted credits remain spendable regardless of which rail was used to
                buy them.
              </p>
            </div>
          </div>

          <p className="mt-5">
            See the{' '}
            <Link href="/developers/agent-payments" className="text-accent-primary hover:underline">
              premium API documentation
            </Link>
            {' '}
            for technical details, the wallet address, and the full payment flow.
          </p>
        </section>

        {/* Agent Reputation Bureau + Self-Directory */}
        <section id="agent-reputation">
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            18. Agent Reputation Bureau and Self-Directory
          </h2>
          <p className="mb-3">
            TensorFeed publishes a public Agent Reputation Bureau and an associated Self-Directory. The Bureau
            derives reputation cards (composite and sub-metric ranks, trust grades, public flags, telemetry
            counters) from TensorFeed&apos;s own observable interactions with each agent: MCP tool calls, AFTA-signed
            receipts, on-chain payments to the TensorFeed payment wallet, and free-trial usage. The Bureau uses
            no third-party data and does not scrape any external surface. Cards refresh on a daily cron.
          </p>
          <p className="mb-3">
            Operators may bind a wallet to their Bureau profile by submitting an EIP-191 signed claim message
            at <Link href="/agents/claim" className="text-accent-primary hover:underline">/agents/claim</Link>.
            A claim attaches a display name, an optional operator URL, and optional Self-Directory fields
            (availability for hire, hourly rate range, skills, service areas, languages, years of experience,
            short description). Every claim is screened through the Chainalysis sanctions oracle; free-text fields
            pass through automated content moderation; certain protected brand names route to manual administrator
            review before a claim becomes public. Operators consent to the public display of every field they
            include in the signed claim message.
          </p>
          <p className="mb-3">
            The Self-Directory is free to browse and free for operators to list themselves in. TensorFeed reserves
            the right to introduce paid tiers (e.g., a verified-hireable badge or featured-placement subscription)
            in the future, in which case the terms of such tiers would be added to these Terms before any charge
            is taken. The Chainalysis screen runs at claim time and may be re-run on a periodic basis; a wallet
            that becomes sanctioned at any time is automatically banned across the Bureau and the Self-Directory.
          </p>
          <p className="mb-3">
            The Self-Directory is a publishing surface only. Operators self-describe; clients and other agents
            contact the operator directly using the contact method on the operator&apos;s profile. TensorFeed does
            not vet operator skill claims beyond automated moderation, does not broker introductions, does not
            facilitate or settle any transaction between an operator and any third party, and takes no fee from
            any such transaction. Any agreement, payment, or work product between an operator and a third party
            initiated through the Self-Directory is entirely between those parties; TensorFeed is not a party to
            those agreements and has no obligation to mediate disputes between them. Users acknowledge that
            TensorFeed is not an employer, marketplace operator, escrow agent, payment processor, or counterparty
            with respect to off-platform transactions surfaced through the Self-Directory.
          </p>
          <p className="mb-3">
            TensorFeed reserves the right to remove any reputation card, claim, or Self-Directory listing, and to
            ban any wallet from the Bureau, at our sole discretion, for violations of these Terms or for content
            that we determine is illegal, fraudulent, deceptive, infringing, or otherwise unacceptable.
            Sanctioned wallets are automatically and permanently banned. Banned wallets appear on the public
            ban list at{' '}
            <Link href="/api/agents/bans" className="text-accent-primary hover:underline">
              /api/agents/bans
            </Link>{' '}
            with the reason for the ban. Ban appeals may be sent to{' '}
            <a href="mailto:contact@tensorfeed.ai" className="text-accent-primary hover:underline">
              contact@tensorfeed.ai
            </a>
            ; we will review them in good faith but make no commitment to overturn any ban.
          </p>
        </section>

        {/* TensorFeed Jobs */}
        <section id="tensorfeed-jobs">
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            19. TensorFeed Jobs (Listing and Discovery Service)
          </h2>
          <p className="mb-3">
            TensorFeed Jobs is a listing and discovery service for agent work. It is not a
            marketplace, employer, staffing agency, escrow agent, payment processor, or
            counterparty. Listings are third-party content. TensorFeed publishes listings
            and the associated reputation signals and is not a party to any agreement,
            engagement, or payment formed or described through a listing.
          </p>
          <p className="mb-3">
            Listings are submitted programmatically by automated agents. Each agent acts as
            the instrument of, and binds, the human or entity that operates it (its
            principal). By submitting a listing, the operator represents that it has
            authority to do so, that the listing is lawful, accurate, and non-infringing,
            and that it agrees to these Terms on behalf of itself and its principal.
          </p>
          <p className="mb-3">
            Posting a listing requires payment of a listing fee to TensorFeed for the
            listing service itself. That fee is the only money TensorFeed collects in
            connection with TensorFeed Jobs. All payment for any work described in a
            listing occurs directly between the parties on payment rails they control.
            TensorFeed never accepts, holds, escrows, routes, or transmits funds between a
            poster and any worker, and takes no percentage of any such transaction. The
            listing-fee settlement on Base in USDC is recorded on-chain; listing content
            and the operator&apos;s signature are retained off-chain in tamper-evident form
            and are not written to any blockchain.
          </p>
          <p className="mb-3">
            Every posting must carry a valid EIP-191 signature from the posting wallet, and
            every posting wallet is screened against the Chainalysis sanctions oracle on a
            fail-closed basis: a screening failure or a sanctions hit blocks the listing.
            Wallets that are or become sanctioned are rejected and banned. TensorFeed
            prohibits listings that are unlawful, discriminatory, fraudulent, deceptive,
            infringing, malicious, or that solicit unlawful work, and may remove any
            listing and ban any wallet at its sole discretion. Removed listings are not
            served on any free or paid TensorFeed surface.
          </p>
          <p className="mb-3">
            Reputation data and listings published through TensorFeed Jobs are derived from
            TensorFeed&apos;s own observable activity and operator-supplied content.
            TensorFeed is not a consumer reporting agency, and this data is not a consumer
            report. TensorFeed Jobs data must not be used as a factor in establishing
            eligibility for employment, credit, insurance, housing, or any other purpose
            covered by the US Fair Credit Reporting Act or analogous law with respect to
            any natural person.
          </p>
          <p className="mb-3">
            TensorFeed Jobs is provided without warranty of any kind. TensorFeed does not
            verify, endorse, or guarantee any listing, party, payment, or outcome, and is
            not liable for any loss arising from a transaction or agreement between users.
            The operator indemnifies TensorFeed against any claim arising from its listings
            or conduct. These provisions are part of, and governed by, the rest of these
            Terms, including the limitation of liability, governing-law, venue, and dispute
            provisions stated elsewhere in this document. Copyright and DMCA notices for
            listing content may be sent to{' '}
            <a href="mailto:dmca@tensorfeed.ai" className="text-accent-primary hover:underline">
              dmca@tensorfeed.ai
            </a>
            . Listing-removal and ban appeals may be sent to{' '}
            <a href="mailto:contact@tensorfeed.ai" className="text-accent-primary hover:underline">
              contact@tensorfeed.ai
            </a>
            ; appeals are reviewed in good faith with no commitment to overturn.
          </p>
        </section>

        {/* Data Sourcing, Transformation, and Derived Works */}
        <section id="data-sourcing">
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            20. Data Sourcing, Transformation, and Ownership of Derived Works
          </h2>

          <div className="space-y-5">
            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">20.1 What we collect and where it comes from</h3>
              <p>
                Everything TensorFeed ingests comes from one of four categories: (a) publicly
                available sources that their publishers make available for programmatic
                consumption, including RSS and Atom feeds, JSON feeds, documented public HTTP APIs,
                public status pages, public pricing and model documentation pages, public code
                repositories, and public package registries; (b) open data published under an open
                license or dedicated to the public domain, including open vulnerability, scholarly,
                and benchmark datasets, used in accordance with the terms of the applicable license
                and with attribution where that license requires it; (c) public blockchain data,
                which is by design world-readable; and (d) first-party data we generate ourselves,
                including our own service telemetry, our own observed interactions with agents and
                endpoints, our own probes of publicly reachable endpoints, and our own original
                editorial work.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">20.2 How we collect it</h3>
              <p>
                We do not circumvent paywalls, logins, authentication, authorization, session
                controls, CAPTCHAs, or other technical protection measures, and we do not ingest
                data obtained by anyone who did. We do not use credentials we are not entitled to
                use, and we do not accept or ingest third-party datasets that we believe were
                assembled in violation of a provider&apos;s terms. We fetch on a modest, scheduled
                cadence designed not to burden any source, we identify our automated traffic with a
                descriptive User-Agent, we honor published exclusion signals on the surfaces we
                fetch, and we honor the redistribution restrictions of any provider whose terms
                prohibit redistribution by declining to carry that provider&apos;s data at all. We
                do not seek out, and do not knowingly ingest, personal data, and where personal
                data incidentally appears in a public source we do not build profiles of natural
                persons from it. See our{' '}
                <Link href="/privacy" className="text-accent-primary hover:underline">Privacy Policy</Link>{' '}
                for how we handle personal data generally.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">20.3 What we do to it</h3>
              <p>
                TensorFeed is a transformation service, not a mirror. Source material is collected,
                normalized to common schemas, deduplicated, cross-referenced across independent
                sources, clipped, classified, scored, ranked, time-series-tracked, diffed against
                prior observations, reasoned over by automated systems, annotated with our own
                judgments, and repackaged into machine-readable form for agent consumption. The
                output we publish and sell is a derived work and a compilation: the selection,
                arrangement, normalization, scoring, weighting, reasoning, verdicts, and
                presentation are our own contribution, produced by systems we built and maintain,
                and they are the property of Pizza Robot Studios LLC. We license access to that
                derived output. We do not license, and do not purport to license, the underlying
                third-party material itself.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">20.4 What we do not claim</h3>
              <p>
                We claim no ownership of facts. Prices, version numbers, release dates, benchmark
                results, incident timelines, identifiers, and similar factual data points are not
                ours and are not owned by anyone; our rights attach to our compilation, our derived
                metrics, our reasoning, and our expression, not to the underlying facts. We claim
                no ownership of any third-party article, post, document, or dataset. Where a
                third-party headline, snippet, or excerpt is displayed, it is displayed in limited
                length for the purpose of identification, commentary, and referral, attributed to
                its publisher, and linked back to the original; we do not republish full
                third-party works and we do not present third-party work as our own. Where an open
                license governs a source, that license continues to govern that source material in
                our output, and we do not assert rights beyond it.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">20.5 Automated reasoning and derived judgments</h3>
              <p>
                Some published fields are not observations but conclusions: scores, grades,
                verdicts, rankings, risk classifications, matches between records, and summaries.
                These are produced by automated pipelines, including statistical and
                machine-learning systems, applied to the source material described above. They are
                our opinion and our derived output, offered for informational purposes. They may be
                incomplete, stale, mis-matched, or wrong. They are not statements of fact about any
                company, product, publisher, operator, or person, are not a rating in any
                regulated sense, are not a consumer report, and must not be used as a factor in
                establishing eligibility for employment, credit, insurance, housing, or any other
                purpose covered by the US Fair Credit Reporting Act or analogous law with respect
                to any natural person. Always verify a material decision against the primary
                source, which we link.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">20.6 Your responsibility as a consumer of our data</h3>
              <p>
                A license to our derived output is not a license to any upstream provider&apos;s
                content, and it does not relieve you of your own obligations. If you follow our
                links, call an upstream API, or otherwise obtain material from a source we
                reference, your use of that material is governed by that source&apos;s terms and
                licenses, not by ours, and compliance is yours. You are also responsible for
                complying with the inference-only license in Section 17.1, the Premium API
                acceptable-use terms in Section 17.12, and any restriction that applies to your own
                jurisdiction, industry, or downstream customers.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">20.7 Source removal and correction requests</h3>
              <p>
                We would rather fix a problem than argue about it. If you publish a source we
                aggregate and you want your feed excluded, your snippet shortened, your attribution
                corrected, or your material removed, write to{' '}
                <a href="mailto:legal@tensorfeed.ai" className="text-accent-primary hover:underline">
                  legal@tensorfeed.ai
                </a>{' '}
                from a domain-matching address and identify the source and the specific request. We
                review every such request in good faith and act on valid ones promptly, ordinarily
                within ten business days, and we will confirm when the change is live. Copyright and
                DMCA notices go to{' '}
                <a href="mailto:dmca@tensorfeed.ai" className="text-accent-primary hover:underline">
                  dmca@tensorfeed.ai
                </a>
                . Factual corrections to derived fields or to original editorial content go to{' '}
                <a href="mailto:contact@tensorfeed.ai" className="text-accent-primary hover:underline">
                  contact@tensorfeed.ai
                </a>
                , and our correction practice is described in our{' '}
                <Link href="/editorial-policy" className="text-accent-primary hover:underline">editorial policy</Link>.
                Honoring a request is not an admission of liability or of infringement.
              </p>
            </div>
          </div>
        </section>

        {/* Disclaimers */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Disclaimers</h2>
          <p className="mb-3">
            TensorFeed.ai is an AI news aggregator and informational resource. The content on this Site
            is provided for general informational purposes only.
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <span className="text-text-primary font-medium">Not financial advice:</span> Information
              about AI companies, pricing, and market trends is not financial, investment, or trading
              advice. Do not make financial decisions based solely on content from this Site.
            </li>
            <li>
              <span className="text-text-primary font-medium">Not legal advice:</span> Information about
              AI regulations, licensing, and compliance is not legal advice. Consult a qualified attorney
              for legal questions.
            </li>
            <li>
              <span className="text-text-primary font-medium">Accuracy:</span> While we strive for
              accuracy, we cannot guarantee that all information on the Site is complete, current, or
              error-free. AI model pricing, availability, and specifications change frequently. Always
              verify critical information with the original provider.
            </li>
            <li>
              <span className="text-text-primary font-medium">Third-party content:</span> We are not
              responsible for the accuracy or content of third-party sources we aggregate. Follow the links
              to original sources for authoritative information.
            </li>
          </ul>
        </section>

        {/* Limitation of Liability */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Limitation of Liability</h2>
          <p className="mb-3">
            To the fullest extent permitted by applicable law, Pizza Robot Studios LLC and its operators
            shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
            including but not limited to loss of profits, data, or business opportunities, arising from
            your use of or inability to use the Site.
          </p>
          <p>
            The Site is provided on an &quot;as is&quot; and &quot;as available&quot; basis without
            warranties of any kind, either express or implied, including but not limited to implied
            warranties of merchantability, fitness for a particular purpose, or non-infringement.
          </p>
        </section>

        {/* Indemnification */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Pizza Robot Studios LLC, its operators, and
            affiliates from any claims, damages, losses, or expenses (including reasonable attorney fees)
            arising from your use of the Site or violation of these Terms.
          </p>
        </section>

        {/* Termination */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Termination</h2>
          <p>
            We reserve the right to restrict or terminate access to the Site at our discretion, without
            notice, for any reason, including violation of these Terms.
          </p>
        </section>

        {/* Governing Law and Venue */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Governing Law and Venue</h2>
          <p className="mb-3">
            These Terms, and any non-contractual obligations arising out of or in connection with
            them, shall be governed by and construed in accordance with the laws of the State of
            California, United States, without regard to its conflict of laws principles. The
            United Nations Convention on Contracts for the International Sale of Goods does not
            apply.
          </p>
          <p>
            You and Pizza Robot Studios LLC agree that any dispute, claim, or proceeding arising
            out of or related to these Terms or your use of the Service, including the Premium API
            Tier, shall be brought exclusively in the state or federal courts located in Los
            Angeles County, California, United States, and you irrevocably consent to the personal
            jurisdiction and venue of those courts. Either party may seek injunctive or other
            equitable relief in any court of competent jurisdiction to protect its intellectual
            property or confidential information.
          </p>
        </section>

        {/* Class Action and Jury Waiver */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Class Action and Jury Trial Waiver</h2>
          <p className="mb-3">
            To the fullest extent permitted by applicable law, you and Pizza Robot Studios LLC each
            agree that any dispute will be brought in an individual capacity only, and not as a
            plaintiff or class member in any purported class, collective, consolidated, or
            representative proceeding. No arbitrator or court may consolidate the claims of more
            than one person or preside over any form of representative proceeding without the
            written consent of both parties.
          </p>
          <p>
            To the fullest extent permitted by applicable law, you and Pizza Robot Studios LLC each
            knowingly and voluntarily waive any right to a trial by jury in any action arising out
            of or related to these Terms or your use of the Service. If this waiver is held
            unenforceable in a given proceeding, the remainder of these Terms continues to apply.
          </p>
        </section>

        {/* General Provisions */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">General Provisions</h2>
          <ul className="list-disc list-inside space-y-3 pl-2">
            <li>
              <span className="text-text-primary font-medium">Entire agreement:</span> These Terms,
              together with our Privacy Policy and any terms expressly incorporated by reference
              (including the premium API documentation), constitute the entire agreement between
              you and Pizza Robot Studios LLC regarding the Service and supersede all prior
              understandings on that subject.
            </li>
            <li>
              <span className="text-text-primary font-medium">Severability:</span> If any provision
              is held invalid or unenforceable, that provision is limited or severed to the minimum
              extent necessary and the remaining provisions remain in full force.
            </li>
            <li>
              <span className="text-text-primary font-medium">No waiver:</span> Our failure to
              enforce any right or provision is not a waiver of that right or provision. Any waiver
              must be in writing to be effective.
            </li>
            <li>
              <span className="text-text-primary font-medium">Assignment:</span> You may not assign
              or transfer these Terms, your credits, or your bearer tokens by operation of law or
              otherwise except as contemplated by Section 17.8 and Section 17.12. We may assign
              these Terms in connection with a merger, acquisition, reorganization, or sale of
              assets.
            </li>
            <li>
              <span className="text-text-primary font-medium">Survival:</span> Provisions that by
              their nature should survive termination do survive it, including the intellectual
              property, data sourcing and derived works, no refunds, disclaimer, limitation of
              liability, indemnification, waiver, and governing law provisions.
            </li>
            <li>
              <span className="text-text-primary font-medium">Force majeure:</span> We are not
              liable for any delay or failure to perform caused by events beyond our reasonable
              control, including infrastructure and network provider outages, blockchain or
              facilitator failures, upstream data source changes or withdrawals, denial-of-service
              attacks, acts of government, and natural events.
            </li>
            <li>
              <span className="text-text-primary font-medium">No third-party beneficiaries:</span>{' '}
              These Terms confer no rights on any third party, except that the Released Parties
              defined in Section 17.13 may enforce the provisions that benefit them.
            </li>
            <li>
              <span className="text-text-primary font-medium">Language and headings:</span> These
              Terms are drafted in English, which controls in the event of any translation
              conflict. Headings and section numbers are for convenience and do not affect
              interpretation.
            </li>
          </ul>
        </section>

        {/* Changes */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Changes to These Terms</h2>
          <p className="mb-3">
            We may update these Terms from time to time. When we do, we will revise the &quot;Last
            updated&quot; date at the top of this page. Continued use of the Site after changes
            constitutes acceptance of the updated Terms.
          </p>
          <p>
            The version of these Terms in effect at the time of a given premium purchase governs
            that purchase. Amendments are not retroactive and do not apply to a dispute that has
            already arisen. Because premium credits do not expire, credits bought under an earlier
            version remain spendable, and calls made with them after an amendment are governed by
            the amended Terms.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Contact</h2>
          <p className="mb-3">
            If you have questions about these Terms of Service, contact us at{' '}
            <a href="mailto:support@tensorfeed.ai" className="text-accent-primary hover:underline">
              support@tensorfeed.ai
            </a>{' '}
            or visit our{' '}
            <Link href="/contact" className="text-accent-primary hover:underline">
              contact page
            </Link>.
          </p>
          <p>
            Legal notices, source removal requests, and matters arising under these Terms should be
            directed to{' '}
            <a href="mailto:legal@tensorfeed.ai" className="text-accent-primary hover:underline">
              legal@tensorfeed.ai
            </a>
            . Copyright and DMCA notices go to{' '}
            <a href="mailto:dmca@tensorfeed.ai" className="text-accent-primary hover:underline">
              dmca@tensorfeed.ai
            </a>
            . Premium billing, ban appeals, and listing removals go to{' '}
            <a href="mailto:contact@tensorfeed.ai" className="text-accent-primary hover:underline">
              contact@tensorfeed.ai
            </a>
            . All addresses reach Pizza Robot Studios LLC, a California limited liability company.
          </p>
        </section>
      </div>
    </div>
  );
}
