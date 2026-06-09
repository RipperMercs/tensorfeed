import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import ArticleHero from '@/components/originals/ArticleHero';

import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/apple-gemini-siri-extensions-wwdc-2026' },
  title: 'Apple Rebuilt Siri on Gemini and Opened the iPhone to Claude. The Assistant Layer Just Became Swappable.',
  description:
    "At WWDC 2026, Apple rebuilt Siri on a custom 1.2-trillion-parameter Google Gemini model for about $1 billion a year, and shipped iOS 27 Extensions that let ChatGPT, Gemini, or Claude become your default assistant. For the first time the iPhone treats the model as a setting, not a fixture. Here is what that does to the model market.",
  openGraph: {
    title: 'Apple Rebuilt Siri on Gemini and Opened the iPhone to Claude. The Assistant Layer Just Became Swappable.',
    description: 'Apple put Gemini under Siri and made third-party models a default-assistant choice on iOS 27. The phone is now a multi-model surface.',
    type: 'article',
    publishedTime: '2026-06-08T20:00:00Z',
    authors: ['Adrian Vale'],
    images: [{ url: '/originals/apple-gemini-siri-extensions-wwdc-2026/hero.jpg', width: 1920, height: 1440 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Apple Rebuilt Siri on Gemini and Opened the iPhone to Claude.',
    description: 'WWDC 2026: Gemini powers Siri, and iOS 27 Extensions make the default assistant a setting you can change.',
    images: ['/originals/apple-gemini-siri-extensions-wwdc-2026/hero.jpg'],
  },
};

export default function AppleGeminiSiriExtensionsWWDC2026Page() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Apple Rebuilt Siri on Gemini and Opened the iPhone to Claude. The Assistant Layer Just Became Swappable."
        description="At WWDC 2026 Apple rebuilt Siri on a custom 1.2-trillion-parameter Gemini model and shipped iOS 27 Extensions that let ChatGPT, Gemini, or Claude serve as the default assistant. The iPhone now treats the model as a setting."
        datePublished="2026-06-08"
        author="Adrian Vale"
        image="https://tensorfeed.ai/originals/apple-gemini-siri-extensions-wwdc-2026/hero.jpg"
        url="https://tensorfeed.ai/originals/apple-gemini-siri-extensions-wwdc-2026"
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
          Apple Rebuilt Siri on Gemini and Opened the iPhone to Claude. The Assistant Layer Just Became Swappable.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-06-08">June 8, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/apple-gemini-siri-extensions-wwdc-2026"
        title="Apple Rebuilt Siri on Gemini and Opened the iPhone to Claude. The Assistant Layer Just Became Swappable."
      />

      <ArticleHero
        mode="photo"
        src="/originals/apple-gemini-siri-extensions-wwdc-2026/hero.jpg"
        alt="Aerial view of the Apple Park ring building in Cupertino at golden hour, with the surrounding Santa Clara Valley stretching toward hazy hills."
        caption="Apple Park, where the WWDC 2026 keynote put Gemini under Siri and made the iPhone's default assistant a choice."
        credit="Nils Huenerfuerst, CC0, via Wikimedia Commons"
        width={1920}
        height={1440}
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Tim Cook walked out at Apple Park this morning for his last keynote as CEO and handed the
          most interesting part of the iPhone to other people&apos;s models. The rebuilt Siri runs on a
          custom Google Gemini model. iOS 27 ships an Extensions system that lets you make ChatGPT,
          Gemini, or Claude your default assistant. For the first time, the thinking part of the phone
          is a setting you can change rather than a thing Apple builds and you accept.
        </p>

        <p>
          That is the story under the story. Everyone will lead with &quot;Apple gave up and licensed
          Gemini.&quot; True, and it matters. But the part that reshapes the model market is the second
          announcement, the one that turns a billion iPhones into a surface where the model is
          interchangeable.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Apple Actually Announced</h2>

        <p>
          Two things, and they are not the same thing. First, Siri itself. Apple rebuilt it on a custom
          1.2-trillion-parameter Gemini model that Google built to spec, running under a multi-year deal
          reported at roughly $1 billion a year. Apple is not pointing Siri at the public Gemini app. It
          licensed a private model, and the contract reportedly bars Google from training future Gemini
          versions on Siri queries.
        </p>

        <p>
          Second, Extensions. iOS 27 lets a third-party AI provider serve as the intelligence layer
          behind Apple Intelligence features. Swipe down from the top center and you get an Ask panel
          that can run system shortcuts, search your phone, or hand a hard query to a chatbot you chose.
          ChatGPT was already a bolt-on under the old system. Now Gemini and Claude join it, and any of
          the three can be set as the default. Claude on an iPhone as a first-class assistant is new
          today.
        </p>

        <p>
          Cook also previewed homeOS and the M5 Mac line, and the whole iOS 27 release is being framed
          as a deep clean: better battery, fewer bugs, less novelty for its own sake. Fine. The model
          news is the news.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Three-Tier Routing Is the Tell</h2>

        <p>
          Siri does not send everything to Google. Apple built a router, and the router is the part
          worth reading closely, because it is the same architecture every serious agent product is
          converging on: cheap local work stays local, hard work goes to the biggest model available.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Tier</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Where it runs</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Handles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">On device</td>
                <td className="px-4 py-3">Apple foundation models on the phone</td>
                <td className="px-4 py-3">Simple, fast, private tasks</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Private Cloud Compute</td>
                <td className="px-4 py-3">Apple silicon servers</td>
                <td className="px-4 py-3">Moderately complex requests</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Google Cloud</td>
                <td className="px-4 py-3">Custom Gemini on Nvidia Blackwell B200</td>
                <td className="px-4 py-3">Heaviest reasoning</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Look at where the heavy tier lands. Apple, the company with the largest install base on the
          planet, decided it could not build the top reasoning tier in time, so it is renting it from
          Google and running it on Nvidia GPUs. That is two dependencies Apple spent a decade trying to
          avoid, accepted in one keynote. When the most vertically integrated company in tech rents the
          frontier instead of building it, that tells you how steep the frontier curve still is.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Why Extensions Is Bigger Than the Gemini Deal</h2>

        <p>
          The Gemini deal is a procurement decision. Apple needed a frontier model, Google had one,
          money changed hands. In two years Apple can swap the supplier and most users will never know.
          That is what a good abstraction looks like, and Apple just built one for itself.
        </p>

        <p>
          Extensions builds the same abstraction for everyone else. Once the default assistant is a
          dropdown, the model stops being a brand you marry and becomes a component you select. That is
          a structural shift, and it cuts in a direction the labs have spent a fortune fighting. The
          whole point of ChatGPT, Gemini, and Claude as consumer apps was to own the relationship: be
          the icon people tap, be the habit. Apple just put all three behind one swipe and said, pick
          whichever, switch whenever.
        </p>

        <p>
          For an aggregator like us this is the entire thesis. The assistant layer is becoming a routing
          problem, on the phone exactly like in the API. The question stops being &quot;which model do
          you use&quot; and becomes &quot;which model for this task, right now, at this price.&quot; The
          three options Apple is handing iPhone users line up almost exactly with the three flagships
          people already compare.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Default option</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Provider</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Status on iPhone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">ChatGPT</td>
                <td className="px-4 py-3">OpenAI</td>
                <td className="px-4 py-3">Carried over, now one of several</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Gemini</td>
                <td className="px-4 py-3">Google</td>
                <td className="px-4 py-3">New as a direct option, also powers Siri</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude</td>
                <td className="px-4 py-3">Anthropic</td>
                <td className="px-4 py-3">First time as a selectable iPhone assistant</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          If you want to actually compare the three on capability rather than vibes, that is what our{' '}
          <Link href="/benchmarks" className="text-accent-primary hover:underline">benchmarks page</Link>{' '}
          and the{' '}
          <Link href="/originals/claude-vs-gpt-vs-gemini" className="text-accent-primary hover:underline">Claude vs GPT vs Gemini breakdown</Link>{' '}
          are for. The point is that the comparison is now a consumer decision, not just a developer one.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Who Wins, Who Pays</h2>

        <p>
          Google is the obvious winner on paper. A billion dollars a year, a Siri integration that puts
          Gemini under the most-used assistant on earth, and a second slot as a direct Extensions
          option. But there is a quieter cost. The custom-model, no-training-on-queries terms mean
          Google gets Apple&apos;s money without Apple&apos;s data, and being the invisible engine under
          Siri does not build the Gemini consumer brand the way being the app would. Google traded brand
          for distribution. That is probably the right trade. It is still a trade.
        </p>

        <p>
          Anthropic gets the cleanest win relative to expectations. Claude has never been a consumer
          phone default anywhere, and it just became one on the platform that sets the terms for premium
          mobile. No reported billion-dollar check required, no infrastructure to staff. Claude has been
          taking real consumer share this year, and a default-assistant slot on the iPhone is a
          distribution channel it could not have bought at any price.
        </p>

        <p>
          OpenAI is the interesting one. ChatGPT went from the only third-party brain Siri could borrow
          to one of three names in a dropdown. Being first is worth something. Being the default people
          never change is worth more, and Apple just made the default a choice. The exclusivity that
          made the original ChatGPT-Siri tie-up notable is gone.
        </p>

        <p>
          Apple pays the billion and gives up a piece of the narrative it has guarded since 2011, that
          the assistant is Apple&apos;s. In exchange it gets a Siri that finally works and an Extensions
          framework that lets it stay neutral while the labs fight over the dropdown. Neutral is a good
          place to stand when you own the surface and everyone else is renting space on it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Part to Watch</h2>

        <p>
          One detail decides how much of this matters: the default. If iOS 27 ships with Gemini-powered
          Siri as the assistant and Extensions buried three settings deep, most people never touch it,
          and the dropdown is theater. If Apple surfaces the choice at setup, the way it surfaces the
          default browser and search engine, then switching becomes normal and the model market gets a
          consumer-grade churn dynamic it has never had. Watch the onboarding flow in the iOS 27 betas
          this week. That flow is the whole ballgame.
        </p>

        <p>
          The other thing to watch is whether the no-training clause holds and whether Apple ever
          discloses how often Siri actually escalates to the Google tier. A router that sends 90 percent
          of traffic to on-device models is a very different business for Google than one that sends 90
          percent to Blackwell. Apple will not volunteer that number. The inference bill eventually
          will.
        </p>

        <p>
          For a decade the iPhone treated intelligence as a feature Apple owned. As of this morning it
          treats intelligence as a supply chain it manages, with three vendors in the dropdown and a
          fourth it built itself. That is the most consequential thing said at Apple Park today, and
          Cook said it on his way out the door. We are adding the Apple assistant tiers to how we track
          the model layer, because the phone in your pocket is now a model router, and the only question
          that matters is which one it points at.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/apple-intelligence-extensions-ios-27"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Apple Intelligence Extensions: The iPhone Opens Up to Outside Models</span>
          </Link>
          <Link
            href="/originals/apple-20-day-window-io-wwdc"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Apple&apos;s 20-Day Window: From Google I/O to WWDC</span>
          </Link>
          <Link
            href="/originals/claude-vs-gpt-vs-gemini"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">Claude vs GPT vs Gemini: The 2026 Comparison</span>
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
