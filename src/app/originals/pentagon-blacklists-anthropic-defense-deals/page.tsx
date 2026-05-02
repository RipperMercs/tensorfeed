import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import AdPlaceholder from '@/components/AdPlaceholder';

export const metadata: Metadata = {
  title: 'The Pentagon Skipped Anthropic. Seven Other AI Companies Got the Contracts.',
  description:
    'On May 1, 2026, the DoD signed classified-network AI deals with OpenAI, Google, Microsoft, AWS, NVIDIA, SpaceX, and Reflection. Anthropic, the only lab with a public no-weapons usage policy, was left out. The first frontier lab to be punished for enforcing its own safety terms. What it means for the rest of the industry.',
  openGraph: {
    title: 'The Pentagon Skipped Anthropic. Seven Other AI Companies Got the Contracts.',
    description:
      'DoD signed AI deals with seven companies on May 1, 2026, and Anthropic was not on the list. The first frontier lab punished for enforcing its own usage policy. What it signals for safety-as-a-product.',
    type: 'article',
    publishedTime: '2026-05-02T16:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Pentagon Skipped Anthropic',
    description:
      'DoD signed seven AI vendors and left out the only frontier lab with a public no-weapons policy. The economic price of safety just got a number.',
  },
};

export default function PentagonBlacklistsAnthropicPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="The Pentagon Skipped Anthropic. Seven Other AI Companies Got the Contracts."
        description="On May 1, 2026, the DoD signed classified-network AI deals with seven vendors and left out Anthropic. The first frontier lab to be punished for enforcing its own usage policy. What it signals for safety-as-product."
        datePublished="2026-05-02"
        author="Kira Nolan"
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
          The Pentagon Skipped Anthropic. Seven Other AI Companies Got the Contracts.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-05-02">May 2, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Yesterday the Department of Defense signed AI infrastructure deals with seven companies
          totaling more than $200 million across classified networks. The list reads like a who&apos;s
          who of the modern AI stack: OpenAI, Google, Microsoft, AWS, NVIDIA, SpaceX, and Reflection.
          One name is conspicuously absent. Anthropic, the only frontier lab whose public usage
          policy explicitly prohibits weapons development, was not invited.
        </p>

        <p>
          That is not an oversight. According to reporting from CNN and follow-up coverage in
          Defense One, the Trump administration deliberately blacklisted Anthropic after months of
          friction over the company&apos;s refusal to relax its acceptable-use policy for warfare
          applications. We just watched the first frontier lab in this cycle pay a real economic
          price for enforcing the safety terms it actually wrote down.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Got Signed</h2>

        <p>
          Seven deals, all announced May 1, 2026, all attached to existing classified-network
          programs at the DoD&apos;s Chief Digital and AI Office. The headline contract value
          aggregates to roughly $200 million across initial scopes, with option years that could
          push the multi-year ceiling into the low billions.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Vendor</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OpenAI</td>
                <td className="px-4 py-3">Frontier model access on classified networks, plus a co-development track for fine-tuned mission models.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Google</td>
                <td className="px-4 py-3">Gemini Enterprise and Vertex on IL5/IL6 Google Distributed Cloud, with TPU compute attached.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Microsoft</td>
                <td className="px-4 py-3">Azure Government and an OpenAI-on-Azure carve-out at IL6, including Copilot for analyst workflows.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">AWS</td>
                <td className="px-4 py-3">Bedrock on GovCloud and Secret Region, multi-model including Llama, Mistral, Cohere, and the new OpenAI-on-Bedrock SKUs.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">NVIDIA</td>
                <td className="px-4 py-3">DGX SuperPOD deployments and NIM inference microservices for on-prem classified clusters.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">SpaceX</td>
                <td className="px-4 py-3">Starshield-routed model access for forward and disconnected environments.</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Reflection</td>
                <td className="px-4 py-3">Open-weights frontier-class models for sovereign deployment, the policy-friendly hedge against any one vendor.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The notable shape of the list: every major hyperscaler, every major chipmaker that ships
          for inference, the frontier lab the administration prefers, and one open-weights provider
          for the sovereign-deployment story. It is a complete AI stack for the DoD, with the
          missing slot exactly where Anthropic would normally sit.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why Anthropic Got Skipped</h2>

        <p>
          Anthropic&apos;s acceptable-use policy is the most restrictive of any frontier lab. It
          explicitly prohibits the use of Claude for &quot;weapons of mass destruction,&quot; for
          &quot;cyberweapons,&quot; and for offensive uses against critical infrastructure. The
          policy is not boilerplate. The company has refused specific contracts on these grounds
          before, and the team has been vocal about it.
        </p>

        <p>
          Reporting from earlier in the year described back-channel friction between Anthropic and
          the Office of the Secretary of Defense over scope language. The administration wanted the
          option to use models for offensive cyber operations and target identification.
          Anthropic&apos;s policy required carve-outs that the contracting officers found
          unworkable. The negotiation went silent in March. Yesterday&apos;s announcement made
          official what was already true: Anthropic is not in the room.
        </p>

        <p>
          OpenAI, by contrast, quietly updated its usage policy in early 2024 to remove the explicit
          ban on military and warfare applications. Google&apos;s defense work has been growing
          since the Project Maven controversy, and Gemini ships under DoD-friendly terms. Microsoft
          and AWS have decade-long classified track records. Reflection&apos;s open-weights stance
          sidesteps the policy question entirely. Anthropic is the outlier, and it is the only
          outlier.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Compute Deal That Made This Possible</h2>

        <p>
          Two days before the DoD announcement, Anthropic and Google finalized the next leg of
          their compute partnership: roughly $40 billion of additional commitment, including up to
          5 GW of TPU capacity and a co-engineered TPU generation through 2031. Broadcom is the
          third party in the structure. The deal is one of the largest pre-sold compute contracts
          ever signed.
        </p>

        <p>
          The timing is doing real work. A frontier lab that has just locked in nine figures a year
          of guaranteed compute revenue from a hyperscaler partner has an obviously different
          calculus on whether to soften its usage policy for a $30 to $80 million DoD slot.
          Anthropic was already revenue-secure for the safety-restrictive segment of the market.
          The DoD knew it. Anthropic knew the DoD knew it. The negotiation was over before the
          public announcement.
        </p>

        <p>
          That is the structural story. Safety-restrictive policies are a luxury good in the AI
          market right now, and the price of admission is having a compute partner big enough to
          backstop the revenue you decline. Anthropic just demonstrated that it has one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Industry Signal</h2>

        <p>
          For the rest of the AI industry, this is the first concrete data point on what
          enforcement of an anti-warfare policy actually costs. Until yesterday, public restrictions
          on weapons use were a positioning move. Today they are a line item.
        </p>

        <p>
          Three things change because of this announcement.
        </p>

        <p>
          First, the safety-as-product wedge gets more explicit. Anthropic can now say to enterprise
          customers: we said no to the Pentagon when it conflicted with our policy. That is a
          marketing asset for compliance-sensitive buyers (healthcare, education, finance, EU
          regulated industries) that no other lab can credibly claim. Expect to see this language
          in sales decks within a quarter.
        </p>

        <p>
          Second, the rest of the industry now has cover to drop or quietly soften its own
          warfare-related restrictions. If five of the seven big players are signing DoD work, the
          competitive pressure on the holdout is one-directional. Watch Mistral, Cohere, and the
          smaller US labs over the next sixty days. The ones that follow Anthropic will say so
          loudly. The ones that follow OpenAI will not.
        </p>

        <p>
          Third, the open-weights story gets a boost. Reflection getting a seat at the table
          alongside the closed-weight giants is the administration signaling that sovereign
          deployment of open weights is a permitted path. That is good for Llama, good for
          DeepSeek-derived deployments inside the US government, and good for anyone selling
          on-prem inference hardware.
        </p>

        <AdPlaceholder format="in-article" className="my-8" />

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What This Is Not</h2>

        <p>
          A few things this announcement is not, despite how it has been framed in some coverage.
        </p>

        <p>
          It is not a ban. Anthropic is free to pursue commercial work, allied government work
          (the UK AISI relationship continues), and existing enterprise contracts. Claude is not
          being restricted from any market. It is being restricted from one specific procurement
          channel that the administration controls.
        </p>

        <p>
          It is not a permanent state. Administrations change. Procurement officers rotate. The
          GUARD Act vote we covered last week shows that bipartisan AI policy can move fast in
          either direction. A future DoD that wants the most safety-restrictive frontier lab in the
          stack can re-engage Anthropic at any time. The door is closed, not locked.
        </p>

        <p>
          And it is not a financial crisis. Anthropic&apos;s annualized revenue run rate is
          reportedly above $9 billion, the company is sitting on multi-year compute commitments
          measured in tens of billions, and enterprise demand has been growing faster than the
          team can serve it. The Pentagon contract Anthropic walked away from would have been a
          rounding error against any of those numbers.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          The interesting move in AI policy this week was not the GUARD Act, the Mythos preview, or
          the latest model launch. It was a procurement decision that put a number on the cost of a
          safety policy. For the first time in this cycle, a frontier lab held its policy line
          against a paying government customer, took the economic hit publicly, and lived to tell
          about it. The next twelve months of AI ethics talk will quietly route around this fact:
          you can write the policy, or you can take the contract, but the days of getting both are
          ending.
        </p>

        <p>
          For builders, the practical takeaway is that vendor selection now has a policy axis you
          can probe. If your buyer is in a regulated industry or has reputational risk on the line,
          asking a vendor to point at the deals it has declined is a real diligence question. Most
          labs will not have a coherent answer. One does.
        </p>

        <p>
          For policy watchers, this is a stronger signal than any of the voluntary commitments,
          frontier-model evaluations, or White House summits of the last two years. Real
          enforcement leaves a paper trail. Yesterday Anthropic left one. We will be tracking
          follow-on procurement decisions on our{' '}
          <Link href="/ai-policy" className="text-accent-primary hover:underline">AI policy hub</Link>{' '}
          and the{' '}
          <Link href="/incidents" className="text-accent-primary hover:underline">incidents and policy timeline</Link>{' '}
          as more vendors are added or removed from the DoD&apos;s shortlist.
        </p>
      </div>

      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/guard-act-senate-judiciary-22-0"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">The Senate Just Voted 22-0 to Regulate AI Chatbots: Inside the GUARD Act</span>
          </Link>
          <Link
            href="/originals/google-anthropic-40b-compute"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Google and Anthropic&apos;s $40B Compute Pact</span>
          </Link>
          <Link
            href="/originals/frontier-model-forum-vs-china"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Frontier Model Forum vs China: The New AI Security Coalition</span>
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
        <Link
          href="/"
          className="text-text-muted hover:text-accent-primary transition-colors"
        >
          Back to Feed
        </Link>
      </div>
    </article>
  );
}
