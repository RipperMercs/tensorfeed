import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/apple-intelligence-extensions-ios-27' },
  title: "Apple Just Opened Siri to Claude and Gemini. ChatGPT's Exclusivity Is Dead.",
  description:
    "Apple confirmed that iOS 27, iPadOS 27, and macOS 27 will let users pick Claude, Gemini, or any other compatible model to power Apple Intelligence features. The OpenAI exclusive deal that defined the first year of Apple Intelligence is over, and a new Extensions system turns the iPhone into an AI marketplace.",
  openGraph: {
    title: "Apple Just Opened Siri to Claude and Gemini. ChatGPT's Exclusivity Is Dead.",
    description:
      'Apple Intelligence Extensions land in iOS 27. ChatGPT loses its lock on Siri. Claude, Gemini, and others get distribution to a billion devices. Inside the shift.',
    type: 'article',
    publishedTime: '2026-05-07T11:00:00Z',
    authors: ['Kira Nolan'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Apple Just Opened Siri to Claude and Gemini. ChatGPT's Exclusivity Is Dead.",
    description:
      'iOS 27 will let users swap third-party AI models into Siri, Writing Tools, and Image Playground. The ChatGPT exclusive is finished.',
  },
};

export default function AppleIntelligenceExtensionsPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Apple Just Opened Siri to Claude and Gemini. ChatGPT's Exclusivity Is Dead."
        description="Apple confirmed iOS 27 will let users select third-party AI models (Claude, Gemini, and others) to power Apple Intelligence features. ChatGPT loses its one-year exclusive on Siri integration through a new Extensions system."
        datePublished="2026-05-07"
        author="Kira Nolan"
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
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          Apple Just Opened Siri to Claude and Gemini. ChatGPT&apos;s Exclusivity Is Dead.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Kira Nolan</span>
          <span>&middot;</span>
          <time dateTime="2026-05-07">May 7, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/apple-intelligence-extensions-ios-27"
        title="Apple Just Opened Siri to Claude and Gemini. ChatGPT's Exclusivity Is Dead."
      />
      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Bloomberg reported Tuesday that Apple is finalizing a feature for iOS 27, iPadOS 27, and
          macOS 27 that will let users pick from a range of third-party AI providers to power Apple
          Intelligence features. By Wednesday morning, MacRumors, 9to5Mac, TechCrunch, and a stack of
          others had confirmed and detailed it. The branding is &quot;Extensions.&quot; The mechanism
          is a Settings toggle. The result is the end of ChatGPT&apos;s one-year exclusive on Siri.
        </p>

        <p>
          This is the biggest single distribution story in consumer AI since Apple Intelligence
          launched. A billion-device install base is about to become a model-agnostic surface, and
          every frontier lab now has a credible path onto the iPhone without negotiating a new deal
          with Apple.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Extensions Actually Does</h2>

        <p>
          Today, when you ask Siri something it cannot handle, iOS 26 routes the request to ChatGPT
          after a confirmation prompt. That is the only third-party fallback. ChatGPT has been the
          exclusive option for almost a year because the deal Apple announced at WWDC 2024 was an
          exclusive deal.
        </p>

        <p>
          In iOS 27, Apple replaces that single hardcoded fallback with a new Settings panel under
          Apple Intelligence called Extensions. Users select which provider should handle the
          generative tasks Apple delegates: Siri queries Apple cannot answer locally, Writing Tools
          requests for rewrites and summaries, and Image Playground generations. Claude, Gemini, and
          any other AI app that ships an Extension via its App Store binary will appear in the picker.
        </p>

        <p>
          The reporting from MacRumors and 9to5Mac on May 5 says Apple has internally tested
          integrations with Google and Anthropic specifically. Bloomberg adds that Apple plans to
          assign each third-party model a distinct voice for spoken Siri responses, so the user can
          tell when a request has been handed off. That detail matters more than it sounds: it gives
          Apple legal and reputational distance from any output a third-party model produces while
          still letting the experience feel native.
        </p>

        <p>
          Apple plans to formally announce the system at WWDC on June 8, 2026, with the developer
          beta dropping the same day and a public release alongside the iPhone 18 launch in the fall.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The OpenAI Loss Is Real</h2>

        <p>
          OpenAI got the first year of Apple Intelligence to itself. That was a meaningful
          distribution moat. Hundreds of millions of iPhones quietly added a ChatGPT prompt to Siri
          and a ChatGPT-powered fallback to Writing Tools. Even users who never created an account
          were nudged into the brand on a daily basis.
        </p>

        <p>
          That moat is gone. ChatGPT will stay in the picker, but it now competes with Claude,
          Gemini, and presumably Perplexity, Mistral, and whoever else ships an Extension. The Apple
          channel stops being a default and starts being a choice.
        </p>

        <p>
          Two weeks ago, OpenAI shipped GPT-5.5 and doubled API pricing. The bet was that capability
          justified the premium. That bet just got harder to win on iPhone, where the competition is
          one Settings tap away and where Apple has every incentive to let users compare models head
          to head.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Anthropic and Google Get the Distribution Apple Built</h2>

        <p>
          Anthropic crossed Bloomberg&apos;s reporting wires last week with a $900B valuation round
          and a JPMorgan-led financial-services launch. The thing it has lacked compared to OpenAI is
          consumer surface area. Claude has a strong web app and a credible mobile app, but no
          embedded distribution at iOS scale. Extensions changes that. If Anthropic ships a compliant
          Extension at WWDC, every iPhone user can pick Claude as their default Siri fallback.
        </p>

        <p>
          Google has the same opportunity from a different starting position. Gemini already runs on
          Android and on the web. Gaining the same posture inside iOS removes the last platform where
          Google&apos;s AI surface was meaningfully behind. Worth noting: Google is paying Apple a
          reported $20B per year for default search placement. Adding default-eligible AI placement
          on top of that is a much smaller marginal lift than building a new distribution channel
          from scratch.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Where The Models Actually Stack Up</h2>

        <p>
          Here is how the four most likely Extensions providers compare on capability and price as of
          this week. iOS picker users will not see this table, but Apple developers building
          Extensions will absolutely route on it.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Provider</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Flagship</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Input (1M)</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Output (1M)</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Anthropic</td>
                <td className="px-4 py-3">Claude Opus 4.7</td>
                <td className="px-4 py-3">$15.00</td>
                <td className="px-4 py-3">$75.00</td>
                <td className="px-4 py-3">1M</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">OpenAI</td>
                <td className="px-4 py-3">GPT-5.5</td>
                <td className="px-4 py-3">$5.00</td>
                <td className="px-4 py-3">$30.00</td>
                <td className="px-4 py-3">1M</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Google</td>
                <td className="px-4 py-3">Gemini 3.1 Ultra</td>
                <td className="px-4 py-3">$2.50</td>
                <td className="px-4 py-3">$15.00</td>
                <td className="px-4 py-3">2M</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Mistral</td>
                <td className="px-4 py-3">Medium 3.5</td>
                <td className="px-4 py-3">$1.50</td>
                <td className="px-4 py-3">$7.50</td>
                <td className="px-4 py-3">256K</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Pricing matters here because Apple has historically not paid model providers itself.
          Reports from the original ChatGPT deal in 2024 indicated that Apple paid OpenAI nothing,
          and OpenAI paid Apple nothing in return: the value was the distribution. If Extensions
          works the same way, providers absorb the inference cost as the price of being on the iOS
          picker. Cheaper providers will price-pressure the more expensive ones.
        </p>

        <p>
          You can model the cost of routing your own workloads through any of these models on our{' '}
          <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">cost calculator</Link>,
          and check live pricing across the catalog on{' '}
          <Link href="/models" className="text-accent-primary hover:underline">/models</Link>.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Privacy Disclaimer Tells You What Apple Cares About</h2>

        <p>
          One of the more revealing details from the reporting: Apple plans to display a notice
          telling users that it is not responsible for content created by third-party models. That
          is a legal shield, but it is also a tell. Apple has spent two years marketing Apple
          Intelligence as the privacy-respecting AI, with on-device processing and Private Cloud
          Compute. It does not want the brand damage if Claude or Gemini hallucinates, refuses, or
          says something embarrassing through Siri&apos;s voice.
        </p>

        <p>
          Hence the distinct voice per provider. Hence the disclosure. Hence the explicit
          confirmation prompts that Apple already uses today before handing off to ChatGPT. The
          Extensions framing makes this a feature: you, the user, picked it, and Apple is the
          neutral platform.
        </p>

        <p>
          That framing is exactly what Apple needs to defend against EU and DOJ scrutiny too. The
          Digital Markets Act has been pushing Apple toward exactly this kind of choice screen for
          two years. By shipping the AI choice screen voluntarily and globally, Apple gets ahead of
          a regulator-mandated version that would have been worse for its margins.
        </p>


        <h2 className="text-2xl font-semibold text-text-primary pt-4">What This Pressures Across The Stack</h2>

        <p>
          Three second-order effects worth tracking.
        </p>

        <p>
          First, the model wars get a new arena where consumer perception starts to matter as much
          as benchmarks. A user trying Claude through Siri once a day for a week will form an opinion
          about whether Anthropic is &quot;better&quot; than OpenAI in a way that no SWE-bench score
          ever delivered. The leaderboards we run at{' '}
          <Link href="/leaderboard" className="text-accent-primary hover:underline">/leaderboard</Link>{' '}
          are about to be joined by a much larger, much messier vibe-check leaderboard: real iPhone
          users, on real prompts.
        </p>

        <p>
          Second, every other consumer AI surface gets a precedent it can point to. Microsoft has
          quietly been building Copilot toward a similar pattern in Windows. Samsung will face
          customer pressure to do the same on Galaxy devices. Once Apple normalizes user-selectable
          AI providers at the OS layer, holding ChatGPT or Gemini as the only option starts looking
          like a defect, not a default.
        </p>

        <p>
          Third, Extensions makes the case for cheap, fast inference even stronger. If your provider
          is going to pay for the inference itself in exchange for distribution, you want the lowest
          cost per request that hits an acceptable quality bar. That is exactly the segment of the
          market where Mistral Medium 3.5 and DeepSeek V4 already win. Whether Apple lets non-US
          providers ship Extensions is a separate question, but the pricing pressure will exist
          regardless. We tracked the inference floor at $0.017 per million tokens this week in our{' '}
          <Link href="/originals/ai-inference-floor-may-2026" className="text-accent-primary hover:underline">
            inference floor analysis
          </Link>
          . That floor just got more relevant.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Our Take</h2>

        <p>
          Apple is doing the right thing strategically and the right thing for users. The original
          ChatGPT exclusive made sense in 2024 when Apple needed a single integration partner to ship
          Apple Intelligence on time. It made less sense in 2025 when Claude Opus and Gemini caught
          up. By 2026, with five frontier labs trading the top of every benchmark and with a billion
          iPhones in the wild, refusing to ship choice would be the actively user-hostile move.
        </p>

        <p>
          The losers here are clear. OpenAI loses an exclusive distribution channel that helped
          define the brand outside of chat.openai.com. The winners are equally clear: every other
          frontier provider gets a billion-device beachhead they could not have negotiated on their
          own. The structural winner is Apple, which extracts the strategic value of being the
          neutral platform without paying a dime for the inference itself.
        </p>

        <p>
          We will be tracking which providers actually ship Extensions on day one of iOS 27, what
          the App Store reviews look like in the first week, and whether any provider tries to pay
          for default placement. WWDC is June 8. Mark the date.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/gpt-5-5-openai-flagship"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">GPT-5.5 Just Landed. OpenAI Doubled the Price and Raised the Bar.</span>
          </Link>
          <Link
            href="/originals/anthropic-900-billion-valuation-tops-openai"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Anthropic at $900 Billion. The Valuation Just Lapped OpenAI.</span>
          </Link>
          <Link
            href="/originals/claude-vs-gpt-vs-gemini"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Claude vs GPT vs Gemini: An Honest Comparison</span>
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
