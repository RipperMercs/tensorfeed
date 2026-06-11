import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
export const metadata: Metadata = {
  alternates: { canonical: 'https://tensorfeed.ai/originals/openai-killed-sora' },
  title: 'OpenAI Killed Sora. Here\'s What That Tells Us About AI Economics.',
  description:
    'Sora burned $15M per day in compute and made $2.1M in total lifetime revenue. The Disney deal collapsed. What this means for AI video generation and the economics of frontier AI products.',
  openGraph: {
    title: 'OpenAI Killed Sora. Here\'s What That Tells Us About AI Economics.',
    description: 'Sora burned $15M per day in compute and made $2.1M in total lifetime revenue. What this tells us about AI product economics.',
    type: 'article',
    publishedTime: '2026-03-20T12:00:00Z',
    authors: ['Marcus Chen'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenAI Killed Sora. Here\'s What That Tells Us About AI Economics.',
    description: 'Sora burned $15M per day in compute and made $2.1M in total lifetime revenue. What this tells us about AI product economics.',
  },
};

export default function OpenAIKilledSoraPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="OpenAI Killed Sora. Here's What That Tells Us About AI Economics."
        description="Sora burned $15M per day in compute and made $2.1M in total lifetime revenue. What this means for AI video generation and frontier AI product economics."
        datePublished="2026-03-20"
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
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4 leading-tight">
          OpenAI Killed Sora. Here&apos;s What That Tells Us About AI Economics.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Marcus Chen</span>
          <span>&middot;</span>
          <time dateTime="2026-03-20">March 20, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            5 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/openai-killed-sora"
        title="OpenAI Killed Sora. Here's What That Tells Us About AI Economics."
      />
      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          Sora is dead. OpenAI officially shut down their video generation product after less than a year
          of public availability. The numbers behind the decision are staggering: $15 million per day in
          compute costs. $2.1 million in total lifetime revenue. A collapsed partnership with Disney that
          was supposed to be the product&apos;s salvation.
        </p>

        <p>
          This isn&apos;t just a story about one failed product. It&apos;s a warning sign for every company
          trying to build consumer-facing AI products on top of the most expensive compute in history.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Numbers Don&apos;t Lie</h2>

        <p>
          Let me put the economics in perspective. $15 million per day in compute means OpenAI was spending
          roughly $625,000 per hour just to keep Sora running. Every hour. Around the clock. That&apos;s
          $450 million per month in infrastructure costs for a product that generated $2.1 million in
          total revenue across its entire lifespan.
        </p>

        <p>
          I did the math on our{' '}
          <Link href="/tools/cost-calculator" className="text-accent-primary hover:underline">cost calculator</Link>.
          Even at the most optimistic usage projections, Sora would have needed roughly 200x its actual
          user base to break even. Not to be profitable. Just to break even.
        </p>

        <p>
          The Disney deal was supposed to change the calculus. A major content studio licensing Sora for
          production work would have brought in enterprise revenue at a completely different scale. But
          after months of negotiation, Disney walked. The reports suggest it came down to consistency and
          controllability. You can&apos;t integrate a tool into a professional production pipeline if it
          produces different results every time you run the same prompt.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Video Is the Hardest Modality</h2>

        <p>
          Text generation is relatively cheap. You&apos;re producing tokens one at a time, and even a long
          response is a few thousand tokens. Image generation is more expensive, but you&apos;re producing
          a single frame. Video generation is in a completely different league. You&apos;re generating
          hundreds or thousands of coherent frames that need to maintain temporal consistency, physics,
          lighting, and character identity across the entire sequence.
        </p>

        <p>
          The compute scales roughly with the square of the output duration. A 5-second clip might cost 10x
          what a single image costs. A 30-second clip costs exponentially more. And users don&apos;t want
          5-second clips. They want minutes of usable footage.
        </p>

        <p>
          This is why I&apos;ve been skeptical of AI video as a consumer product from the start. The gap
          between &quot;impressive demo&quot; and &quot;commercially viable product&quot; is measured in
          billions of dollars of compute infrastructure.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Broader Pattern</h2>

        <p>
          Sora isn&apos;t an isolated case. Look at the trend across AI products in 2025 and 2026:
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Product</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Monthly Compute</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Monthly Revenue</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Sora</td>
                <td className="px-4 py-3">~$450M</td>
                <td className="px-4 py-3">~$200K</td>
                <td className="px-4 py-3 text-accent-red">Shut down</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">ChatGPT</td>
                <td className="px-4 py-3">~$80M</td>
                <td className="px-4 py-3">~$300M</td>
                <td className="px-4 py-3 text-accent-green">Profitable</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">DALL-E 3</td>
                <td className="px-4 py-3">~$15M</td>
                <td className="px-4 py-3">~$8M</td>
                <td className="px-4 py-3 text-accent-amber">Subsidized</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-accent-primary font-medium">Claude API</td>
                <td className="px-4 py-3">Undisclosed</td>
                <td className="px-4 py-3">Growing fast</td>
                <td className="px-4 py-3 text-accent-green">Scaling</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The products that are working financially are the text-based ones. ChatGPT and the Claude API
          generate enough revenue to cover their compute costs (or at least get close). Image generation
          tools mostly survive by being bundled into larger subscriptions. Video generation at scale simply
          cannot be made economical with current hardware.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What This Means for Developers</h2>

        <p>
          If you&apos;re building products that depend on AI video generation, you should be very careful
          about your assumptions. The APIs that exist today (Runway, Pika, the remaining competitors) are
          all burning cash to maintain their services. Any one of them could pull a Sora and shut down
          without much warning.
        </p>

        <p>
          This isn&apos;t true for text and image generation. Those modalities have found sustainable
          economics, or are at least on a clear path to sustainability. The{' '}
          <Link href="/ai-api-pricing-guide" className="text-accent-primary hover:underline">API pricing trends</Link> we
          track on TensorFeed show consistent price drops in text generation, driven by hardware improvements
          and competition. But video pricing has barely moved because the compute requirements are so extreme.
        </p>

        <p>
          My advice: build on text APIs with confidence. Build on image APIs with reasonable caution. Build
          on video APIs only if you have a fallback plan for when the provider changes their pricing or
          shuts down entirely.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Hardware Question</h2>

        <p>
          Everything I just described could change if compute gets dramatically cheaper. NVIDIA&apos;s next
          generation of GPUs and the emerging custom silicon from Google (TPU v6), Amazon (Trainium3), and
          others could shift the economics over the next two to three years.
        </p>

        <p>
          But &quot;could&quot; is doing a lot of heavy lifting in that sentence. Even a 10x improvement in
          price/performance (which would be extraordinary) only brings Sora&apos;s compute cost down to $45
          million per month. That&apos;s still wildly unprofitable at consumer price points.
        </p>

        <p>
          The real path to viable AI video probably involves a different architecture entirely, not just
          cheaper hardware running the same approach. Techniques like speculative generation, cascaded
          models, and frame interpolation could reduce compute requirements by orders of magnitude. But
          those breakthroughs haven&apos;t happened yet.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Takeaway</h2>

        <p>
          Sora&apos;s death is a reminder that impressive demos and viable products are two very different
          things. The AI industry has been running on demo energy for two years now, with investors and
          users both assuming that the economics would work themselves out eventually.
        </p>

        <p>
          For text generation, that bet is paying off. For video generation, it&apos;s not. And the
          companies that can&apos;t tell the difference between those two realities are the ones that will
          burn through their funding fastest.
        </p>

        <p>
          We&apos;re tracking all of this on our{' '}
          <Link href="/status" className="text-accent-primary hover:underline">status dashboard</Link> and{' '}
          <Link href="/models" className="text-accent-primary hover:underline">models hub</Link>. When the next
          big product shutdown happens (and it will), TensorFeed will have the story before most people
          check Twitter.
        </p>
      </div>

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
