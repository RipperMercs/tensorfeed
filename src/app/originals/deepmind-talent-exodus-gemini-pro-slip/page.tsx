import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, UserMinus } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';

import ShareBar from '@/components/originals/ShareBar';

export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/deepmind-talent-exodus-gemini-pro-slip' },
  title: 'John Jumper Walked. The DeepMind Bench Lost Four in Eleven Days, and Gemini 3.5 Pro Slipped Again.',
  description:
    'A Nobel laureate plus three Gemini contributors walked out of Google DeepMind inside eleven days, and the flagship slipped from June to July for the second straight I/O. The retention question at Google moved from a comp problem to a structural one.',
  openGraph: {
    title: 'John Jumper Walked. The DeepMind Bench Lost Four in Eleven Days, and Gemini 3.5 Pro Slipped Again.',
    description:
      'Jumper to Anthropic. Shazeer to OpenAI. Adler and Pritzel to Anthropic. Gemini 3.5 Pro slipped to July. About $270 billion came off the Alphabet market cap.',
    type: 'article',
    publishedTime: '2026-06-29T11:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'John Jumper Walked. The DeepMind Bench Lost Four in Eleven Days.',
    description:
      'Four senior DeepMind departures in eleven days, Gemini 3.5 Pro slips to July, and roughly $270 billion comes off Alphabet. Comp does not explain this.',
  },
};

export default function DeepMindTalentExodusGemini35SlipPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="John Jumper Walked. The DeepMind Bench Lost Four in Eleven Days, and Gemini 3.5 Pro Slipped Again."
        description="A Nobel laureate plus three Gemini contributors walked out of Google DeepMind inside eleven days, and the flagship slipped from June to July for the second straight I/O. The retention question at Google moved from a comp problem to a structural one."
        datePublished="2026-06-29"
        author="Marcus Chen"
      />

      {/* Back link */}
      <Link
        href="/originals"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Originals
      </Link>

      {/* Header */}
      {/* Hero (graphic mode: Google blue draining toward Anthropic clay) */}
      <ArticleHero
        mode="graphic"
        icon={UserMinus}
        gradientFrom="#4285F4"
        gradientTo="#D97757"
        eyebrow="Frontier Labs &middot; Talent Flow"
      />

      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          John Jumper Walked. The DeepMind Bench Lost Four in Eleven Days, and Gemini 3.5 Pro Slipped Again.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-06-29">June 29, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            6 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/deepmind-talent-exodus-gemini-pro-slip"
        title="John Jumper Walked. The DeepMind Bench Lost Four in Eleven Days, and Gemini 3.5 Pro Slipped Again."
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          Eleven days ago I wrote about Noam Shazeer leaving Google for OpenAI and called it a price tag
          on the acqui-hire cliff. I underestimated the rest of the week. Inside the same eleven-day window
          DeepMind also lost John Jumper, the Nobel laureate who built AlphaFold, plus two Gemini
          contributors heading to Anthropic. The flagship Google was supposed to ship in June slipped to
          July. Roughly $270 billion came off Alphabet&apos;s market cap on the way.
        </p>

        <p>
          The four names did not coordinate. They did not need to. The pattern is the story.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Names</h2>

        <p>
          On June 18, Shazeer told staff he was joining OpenAI. He co-wrote &quot;Attention Is All You
          Need,&quot; co-founded CharacterAI, and was Gemini co-lead until he walked. Google paid roughly
          $2.7 billion in August 2024 to bring him back through a CharacterAI licensing deal that was
          structurally a retention contract. That clock just hit 22 months.
        </p>

        <p>
          On June 23, Fortune confirmed John Jumper is leaving Google DeepMind for Anthropic. Jumper
          shared the 2024 Nobel Prize in Chemistry for AlphaFold, the system that predicted protein
          structures and reset structural biology. He is the second Nobel laureate in DeepMind history.
          He is also, as of this week, no longer a Google employee.
        </p>

        <p>
          On June 24, Bloomberg reported that Jonas Adler and Alexander Pritzel, both viewed internally
          as key contributors to Gemini, are also moving to Anthropic. Adler worked on AlphaFold next to
          Jumper. Pritzel goes back to the early DeepMind days. Neither is a household name. Both showed
          up in the acknowledgments of papers that shipped Gemini.
        </p>

        <p>
          One week. Two destinations. A Nobel laureate, the most influential research engineer at the
          company, and two named Gemini contributors. Comp is not a sufficient explanation.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Compute Slight</h2>

        <p>
          The detail in the reporting that did the most work for me: shortly before Shazeer told staff,
          computing power dedicated to one of his projects was reassigned to a different DeepMind team in
          London. Inside a frontier lab, compute is the unit of belief. Reallocating it is a public vote
          about which bet the company wants to win. Shazeer read the vote and acted on it.
        </p>

        <p>
          A senior researcher whose compute gets reassigned has a different choice set than one who is
          merely being out-bid on cash. Anthropic and OpenAI are not just paying more. They are offering
          the actual GPUs. That is the structural read underneath the comp narrative, and it is what
          separates this week from a normal poaching cycle.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Slip</h2>

        <p>
          Google originally previewed Gemini 3.5 Pro at I/O in May, where Sundar Pichai said the model
          would launch &quot;next month.&quot; Last week, Business Insider reported the launch slipped to
          July, with Google citing early-tester feedback on coding, token efficiency, and long-task
          performance. A Google spokesperson declined to confirm.
        </p>

        <p>
          This is the second consecutive I/O commitment Google has failed to hit on schedule. The first
          slip was easy to explain away. The second one, on a flagship that needs to land before OpenAI
          ships GPT-5.6 in a broad release and before Anthropic restores Mythos 5, reads as a process
          problem instead of a one-off. The talent picture and the schedule picture are the same picture.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Scoreboard</h2>

        <p>
          The departures and arrivals over the last eleven days, in one place.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Researcher</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">From</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">To</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Known for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Noam Shazeer</td>
                <td className="px-4 py-3">Google DeepMind</td>
                <td className="px-4 py-3">OpenAI</td>
                <td className="px-4 py-3">Transformer paper, Gemini co-lead</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">John Jumper</td>
                <td className="px-4 py-3">Google DeepMind</td>
                <td className="px-4 py-3">Anthropic</td>
                <td className="px-4 py-3">AlphaFold lead, 2024 Nobel laureate</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Jonas Adler</td>
                <td className="px-4 py-3">Google DeepMind</td>
                <td className="px-4 py-3">Anthropic</td>
                <td className="px-4 py-3">AlphaFold and Gemini contributor</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Alexander Pritzel</td>
                <td className="px-4 py-3">Google DeepMind</td>
                <td className="px-4 py-3">Anthropic</td>
                <td className="px-4 py-3">Early DeepMind, Gemini contributor</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Three of the four landed at Anthropic. The fourth went to the lab that, on the public reporting,
          is paying the most aggressive cash and equity packages in the industry. Both destinations have
          confidential or imminent IPO paperwork, which means equity grants today are now priced against
          a public listing window measured in months rather than years.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Cap Hit</h2>

        <p>
          Alphabet shed roughly $270 billion of market cap over the week the talent picture deteriorated.
          The market is not pricing the four names individually. It is pricing the joint event: a flagship
          model that slipped, a Nobel laureate moving to a competitor, and the published acknowledgment
          that the Gemini team is selectively reassigning compute away from senior people. Those three
          facts together are an unmodelable overhang on a 2027 ad-revenue narrative that depends on Gemini
          being good enough to keep Search defensible against Perplexity and ChatGPT.
        </p>

        <p>
          For context, the Shazeer-only piece I wrote last week priced one engineer at $2.7 billion. The
          $270 billion drawdown is two orders of magnitude bigger. That gap is the market saying it now
          believes the talent problem is broader than one principal.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why This Is Structural</h2>

        <p>
          Three reasons it does not bounce back with a comp adjustment.
        </p>

        <p>
          First, the receiving labs are inside their own IPO windows. Anthropic filed confidentially on
          June 1 at a $965 billion valuation. OpenAI is steering toward a 2027 listing at a reported $500
          billion plus. Both can grant equity that prices into a public exit on a known timeline. Google
          can match the cash but cannot replicate the equity story without spinning out DeepMind, which it
          has shown no appetite for.
        </p>

        <p>
          Second, DeepMind&apos;s commercial surface is the part the senior research bench is most
          worried about. Staff have raised concerns internally about the absence of a clear coding product
          to compete with Claude Code and Codex. Anthropic and OpenAI built developer surfaces (Claude
          Code, Codex CLI, the OpenAI Partner Network) that put researcher output in front of paying users
          inside weeks. Google is still routing through Vertex, AI Studio, and the Gemini app, none of
          which generate the kind of feedback loop that makes a senior researcher feel their work compounds.
        </p>

        <p>
          Third, the AI-research labor pool is small and legible. The four names that walked this week
          are not interchangeable. Jumper, in particular, is one of a handful of people in the world who
          can lead a structural biology program. The receiving lab gets a capability the donor lab cannot
          immediately rebuild, even with an open req. That asymmetry is what makes a normal poaching
          event into a structural one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Builders Should Do</h2>

        <p>
          For anyone shipping on Gemini, this is a routing question rather than a panic question. Gemini
          3.5 Pro will land in July, and the Flash variant is already the default in Search and the Gemini
          app. The model layer keeps working. The forward question is whether the next two product cycles
          continue to ship on the same cadence as Anthropic and OpenAI, or whether the schedule slips
          again into Q4. A two-quarter slip changes the procurement math; a one-quarter slip does not.
        </p>

        <p>
          The signal worth watching is not who else leaves. It is whether the next compute reassignment
          decision at DeepMind goes to the team building the long-context coding harness or to the team
          building something else. Researchers vote with their projects. Google&apos;s answer to that
          question is the one the market will price next.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          A week ago I would have told you Shazeer was the single most expensive engineer Google had ever
          bought back, and the cliff he set on the acqui-hire era was the story. After this week, Shazeer
          is the opening note rather than the headline. The headline is that the DeepMind bench is
          measurably thinner on the dimensions that produce a frontier model (long-horizon agentic
          training, structural biology, post-training), and the receiving labs are building on the
          subtraction.
        </p>

        <p>
          Google still has the data, the silicon (TPU v6 lands later this year), and the distribution to
          stay in the frontier race. What it has lost in eleven days is the bench depth that turns those
          inputs into ship dates. Gemini 3.5 Pro will arrive in July. The interesting question is what
          3.5 Pro Plus and 4.0 look like, and whether the people who would have written them are still in
          the building when they need to be drafted.
        </p>

        <p>
          We are tracking the talent flow on our{' '}
          <Link href="/funding" className="text-accent-primary hover:underline">funding</Link> and{' '}
          <Link href="/ai-stocks/googl" className="text-accent-primary hover:underline">GOOGL</Link>{' '}
          pages, and the flagship cadence on our{' '}
          <Link href="/models" className="text-accent-primary hover:underline">models tracker</Link>.
          The next signpost is the Gemini 3.5 Pro launch in July. If it lands in July and benchmarks
          competitively, the structural read softens. If it slips again, the structural read hardens
          into a balance-sheet question.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/shazeer-google-openai-acqui-hire-cliff"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Google Paid $2.7 Billion to Bring Shazeer Back. He Walked to OpenAI 22 Months Later.
            </span>
          </Link>
          <Link
            href="/originals/white-house-gpt-56-stagger-federal-gate-bilateral"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              OpenAI Will Stagger GPT-5.6 By Customer. The Federal Gate on the Frontier Just Went Bilateral.
            </span>
          </Link>
          <Link
            href="/originals/anthropic-overtakes-openai-enterprise-adoption-ramp"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Anthropic Passed OpenAI on Enterprise Spend. The Lead Is Real and Structurally Fragile.
            </span>
          </Link>
        </div>
      </footer>

      {/* Footer links */}
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
