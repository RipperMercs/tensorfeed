import { Metadata } from 'next';
import Link from 'next/link';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'TensorFeed.ai terms of service covering acceptable use, intellectual property, content attribution, disclaimers, and limitation of liability.',
  openGraph: {
    type: 'website',
    url: 'https://tensorfeed.ai/terms',
    title: 'Terms of Service',
    description: 'TensorFeed.ai terms of service covering acceptable use, intellectual property, content attribution, disclaimers, and limitation of liability.',
    siteName: 'TensorFeed.ai',
    images: [{ url: '/tensorfeed-logo.png', width: 1024, height: 1024 }],
  },
  twitter: {
    card: 'summary',
    title: 'Terms of Service',
    description: 'TensorFeed.ai terms of service covering acceptable use, intellectual property, content attribution, disclaimers, and limitation of liability.',
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
        <p className="text-text-muted text-sm">Last updated: April 28, 2026</p>
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
            Robot Studios LLC is the legal entity responsible for the payment wallet at
            <code className="bg-bg-tertiary px-1 py-0.5 rounded text-xs font-mono mx-1">0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1</code>
            on Base mainnet and is the counterparty for all premium-tier purchases and disputes
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
          <p>
            The TensorFeed name, logo, and site design are the property of Pizza Robot Studios LLC. You
            may not use our branding without prior written permission.
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
          </ul>
        </section>

        {/* Premium API and Agent Payments */}
        <section id="premium">
          <h2 className="text-lg font-semibold text-text-primary mb-3">17. Premium API and Agent Payments</h2>
          <p className="mb-4">
            TensorFeed offers a paid premium API tier for AI agents and developers who need ranked
            routing recommendations, computed intelligence, and historical data. Premium access is
            paid via USDC on Base mainnet only. By using premium endpoints (any path under
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
              <h3 className="text-base font-semibold text-text-primary mb-2">17.3 Wallet verification</h3>
              <p>
                Always cross-check the TensorFeed payment wallet across our published locations
                (<code className="bg-bg-tertiary px-1 py-0.5 rounded text-xs font-mono">/llms.txt</code>,
                {' '}
                <code className="bg-bg-tertiary px-1 py-0.5 rounded text-xs font-mono">/api/payment/info</code>,
                {' '}
                the GitHub README, and the verified X bio) before sending funds. We are not
                responsible for funds sent to incorrect addresses.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-text-primary mb-2">17.4 Replay protection</h3>
              <p>
                Each USDC transaction can be used to mint credits exactly once. The transaction
                hash is recorded server-side on first use; submitting the same tx hash a second
                time will be rejected.
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
                USDC transfers on Base mainnet are technically irreversible, and once we have
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
                on Base mainnet as payment for our own data and information services, and we do
                not exchange currencies, custody assets for users, facilitate transfers of value
                between users, or hold customer funds beyond the period reasonably required to
                confirm a credit purchase. Nothing in these Terms creates any fiduciary, advisory,
                agency, or banking relationship between you and Pizza Robot Studios LLC.
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

        {/* Changes */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. When we do, we will revise the &quot;Last
            updated&quot; date at the top of this page. Continued use of the Site after changes
            constitutes acceptance of the updated Terms.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Contact</h2>
          <p>
            If you have questions about these Terms of Service, contact us at{' '}
            <a href="mailto:support@tensorfeed.ai" className="text-accent-primary hover:underline">
              support@tensorfeed.ai
            </a>{' '}
            or visit our{' '}
            <Link href="/contact" className="text-accent-primary hover:underline">
              contact page
            </Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
