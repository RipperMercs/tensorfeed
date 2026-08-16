import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock, Cpu } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';

import ShareBar from '@/components/originals/ShareBar';
import ArticleHero from '@/components/originals/ArticleHero';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://tensorfeed.ai/originals/pixel-11-tensor-g6-ram-cut-ondevice-ai',
  },
  title:
    'Google Shipped the First 2nm Phone and Took 4GB of RAM Out of the Pro. On-Device AI Is Still a Cloud Product.',
  description:
    'At Made by Google 2026 on August 12, Google launched the Pixel 11 line on Tensor G6, the first 2nm chip in a shipping phone, with a TPU carrying 50 percent more compute and 2x memory bandwidth. It also cut the Pro from 16GB of RAM to 12GB and shortened the bundled AI Pro window to six months. Memory is what bounds local model size, and every marquee Gemini Intelligence feature is a cloud round trip.',
  openGraph: {
    title:
      'Google Shipped the First 2nm Phone and Took 4GB of RAM Out of the Pro. On-Device AI Is Still a Cloud Product.',
    description:
      'Tensor G6 gets a 50 percent bigger TPU and 2x memory bandwidth. The Pixel 11 Pro gets 4GB less RAM than last year and six months of AI Pro instead of twelve. Follow the memory, not the TOPS.',
    type: 'article',
    publishedTime: '2026-08-12T18:00:00Z',
    authors: ['Adrian Vale'],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'Google Shipped the First 2nm Phone and Took 4GB of RAM Out of the Pro. On-Device AI Is Still a Cloud Product.',
    description:
      'Meta shipped a 30B local agent that needs 20GB. Google shipped a flagship phone with 12GB shared. The on-device frontier is a memory problem.',
  },
};

export default function Pixel11TensorG6RamCutPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="Google Shipped the First 2nm Phone and Took 4GB of RAM Out of the Pro. On-Device AI Is Still a Cloud Product."
        description="At Made by Google 2026 on August 12, Google launched the Pixel 11 line on Tensor G6, the first 2nm chip in a shipping phone, with a TPU carrying 50 percent more compute and 2x memory bandwidth. It also cut the Pro from 16GB of RAM to 12GB and shortened the bundled AI Pro window to six months."
        datePublished="2026-08-12"
        author="Adrian Vale"
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
          Google Shipped the First 2nm Phone and Took 4GB of RAM Out of the Pro. On-Device AI Is
          Still a Cloud Product.
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Adrian Vale</span>
          <span>&middot;</span>
          <time dateTime="2026-08-12">August 12, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />7 min read
          </span>
        </div>
      </header>

      <ShareBar
        path="/originals/pixel-11-tensor-g6-ram-cut-ondevice-ai"
        title="Google Shipped the First 2nm Phone and Took 4GB of RAM Out of the Pro. On-Device AI Is Still a Cloud Product."
      />

      <ArticleHero
        mode="graphic"
        icon={Cpu}
        gradientFrom="#0F172A"
        gradientTo="#4C1D95"
        eyebrow="Edge Inference &middot; Silicon"
      />

      {/* Article body */}
      <div className="prose-custom space-y-6 text-lg text-text-primary leading-relaxed">
        <p>
          Google held Made by Google 2026 on Wednesday, August 12, and the headline is legitimately
          a first. Tensor G6 is the first chip built on TSMC&apos;s 2nm process to reach a shipping
          phone, roughly a month ahead of whatever Apple puts in the iPhone 18 in September. The new
          TPU carries 50 percent more compute and twice the memory bandwidth of the G5. Google says
          on-device AI tasks run up to 3.5 times faster while using up to 3.5 times less energy.
        </p>

        <p>
          Then read the spec sheet for the Pixel 11 Pro. Twelve gigabytes of RAM on the 256GB model.
          Last year&apos;s Pro shipped with sixteen. Google removed four gigabytes of memory from
          the phone whose entire pitch is on-device intelligence, and credited &ldquo;software and
          silicon optimization&rdquo; for the fact that it still feels fast. If you want the 16GB
          back, you buy the 512GB or 1TB configuration.
        </p>

        <p>
          That is the story. Not the process node. Memory is the resource that decides how large a
          model can sit resident on a device, and Google just moved it in the wrong direction on its
          most expensive slab of glass.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">The Lineup, and the Memory Line</h2>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Device</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Price</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">RAM at base</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Pixel 11</td>
                <td className="px-4 py-3 font-mono text-accent-primary">$899</td>
                <td className="px-4 py-3 font-mono">12 GB</td>
                <td className="px-4 py-3">256GB is the new baseline</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Pixel 11 Pro</td>
                <td className="px-4 py-3 font-mono text-accent-primary">$1,099</td>
                <td className="px-4 py-3 font-mono">12 GB</td>
                <td className="px-4 py-3">Down 4GB from last year&apos;s Pro</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Pixel 11 Pro XL</td>
                <td className="px-4 py-3 font-mono text-accent-primary">$1,299</td>
                <td className="px-4 py-3 font-mono">12 GB</td>
                <td className="px-4 py-3">16GB only at 512GB or 1TB</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Pixel 11 Pro Fold</td>
                <td className="px-4 py-3 font-mono text-accent-primary">$1,899</td>
                <td className="px-4 py-3 font-mono">16 GB</td>
                <td className="px-4 py-3">Up $100; the only 16GB base in the line</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Pixel Watch 5</td>
                <td className="px-4 py-3 font-mono text-accent-primary">$399</td>
                <td className="px-4 py-3 font-mono">3 GB</td>
                <td className="px-4 py-3">Up from 2GB; first RAM bump in the line</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The Fold is the tell inside the tell. It is the one device in the family that kept 16GB at
          base, and it is also the one that took a $100 price increase. Google knows exactly what
          the memory is worth. It just decided most buyers would not price it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Twelve Gigabytes Shared Versus Twenty Dedicated
        </h2>

        <p>
          Put this launch next to the one from two days earlier and the ceiling becomes obvious. On
          Monday, Meta published Muse Glimmer, a{' '}
          <Link
            href="/originals/meta-muse-glimmer-30b-local-agent"
            className="text-accent-primary hover:underline"
          >
            roughly 30 billion parameter agentic model that runs on a single consumer GPU
          </Link>
          , compressed to just under 20GB at about 4-bit. That is the current floor for a
          genuinely capable local agent: twenty gigabytes, dedicated, on a card that draws hundreds
          of watts.
        </p>

        <p>
          The Pixel 11 Pro has twelve, and it is not dedicated. That pool holds the operating
          system, the browser, the camera pipeline that Google spent most of the keynote on, and
          every background app. The slice actually available to a resident language model is a
          fraction of it. Gemini Nano 4 fits in that slice. A 30B agent does not, and no process
          shrink changes that arithmetic, because 2nm buys you transistors and efficiency, not
          capacity.
        </p>

        <p>
          This is why I keep saying the TOPS number on a phone chip is the least interesting figure
          on the page. Compute determines how fast you run the model you can hold. Memory determines
          which model that is. Google doubled the TPU&apos;s memory bandwidth, which is a real and
          meaningful win for the model it already ships. It did not raise the ceiling on what that
          model could be.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What Actually Stays Local</h2>

        <p>
          Sort the announced features by where the inference happens and the picture is clean.
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Feature</th>
                <th className="text-left px-4 py-3 text-text-primary font-semibold">Where it runs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Camera Looks, Instant Night Sight, 4K Bokeh video</td>
                <td className="px-4 py-3 text-accent-primary">On device (ISP and custom accelerator)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Gboard Rambler speech cleanup</td>
                <td className="px-4 py-3 text-accent-primary">On device (Gemini Nano 4)</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Live Translate in calls, podcasts, video</td>
                <td className="px-4 py-3 text-accent-primary">On device</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Cross-app task automation, orders and bookings</td>
                <td className="px-4 py-3">Cloud</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Gemini dialing businesses to complete tasks</td>
                <td className="px-4 py-3">Cloud</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Proactive Assistance, At a Glance context</td>
                <td className="px-4 py-3">Cloud</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-text-primary font-medium">Watch 5 offline Gemini</td>
                <td className="px-4 py-3">On device, limited to timers, alarms, workouts</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Everything in the local column is perception and transformation: pixels, audio, text
          cleanup. Real work, and the class of work the Santafe TPU was designed for. Everything in
          the cloud column is agency. The features Google led the keynote with, the ones that place
          an order or call a store on your behalf, are all round trips to a datacenter.
        </p>

        <p>
          The Watch 5 row is the most honest line in the table. Google doubled the wearable&apos;s
          RAM from 2GB to 3GB specifically for Gemini, and the offline capability it earned is
          timers, alarms, and starting a workout. That is what a gigabyte of headroom buys at the
          current state of the art. Everything else on the wrist goes over the network.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Six Months, Not Twelve
        </h2>

        <p>
          The second number worth flagging is the one nobody put on a slide. Buyers of the Pro
          phones now get six months of bundled AI Pro access. It used to be twelve.
        </p>

        <p>
          Read that alongside the RAM cut and the business model stops being ambiguous. If the
          strategy were genuinely local-first, the trial length would not matter, because the
          valuable features would keep working when the subscription lapsed. Google shortened the
          window because it expects these devices to convert into recurring cloud inference revenue,
          and it wants the conversion event to arrive sooner. Halving the free period on a phone
          whose marketing is built on AI is a forecast, not an oversight.
        </p>

        <p>
          None of that is a scandal. Cloud inference has gotten{' '}
          <Link
            href="/originals/ai-inference-floor-may-2026"
            className="text-accent-primary hover:underline"
          >
            extraordinarily cheap
          </Link>
          , the models that live there are two orders of magnitude larger than anything a handset
          will hold this decade, and a serving fleet can be updated on a Tuesday while a phone
          cannot. Routing the hard work to the datacenter is the correct engineering decision. I
          just want the marketing to match it. &ldquo;Gemini Intelligence, embedded&rdquo; describes
          the entry point, not the location of the model.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">
          Where the Counterargument Sits
        </h2>

        <p>
          The strongest case against my reading is that raw capacity is the wrong metric for a
          phone. Distillation and quantization have moved fast enough that Nano 4 in 2026 is
          plausibly doing what a cloud model did in 2024, and the 3.5x energy reduction matters more
          to actual users than headroom for a model class that would flatten the battery in twenty
          minutes anyway. A phone is a thermal budget wearing a screen. Shipping a smaller, faster,
          cooler model that runs all day beats shipping a bigger one you throttle after two prompts.
          Google also spent real silicon on things that are not language models at all: a new custom
          accelerator for portrait video, an upgraded ISP, and a Titan M3 security chip aimed at
          post-quantum threats.
        </p>

        <p>
          Fair. My response is that Google chose to frame the whole product around agentic
          capability, and agentic capability is where the local ceiling bites hardest. Automating a
          booking means holding context, calling tools, and recovering from failure across many
          turns. That is the workload with the worst memory profile, and it is exactly the workload
          Google shipped to the cloud.
        </p>

        <p>
          The thing I find genuinely interesting is that Google is now the assistant layer on both
          sides of the fence. It is putting Gemini on Pixel hardware it controls and, per the WWDC
          arrangement,{' '}
          <Link
            href="/originals/apple-gemini-siri-extensions-wwdc-2026"
            className="text-accent-primary hover:underline"
          >
            under Siri on hardware it does not
          </Link>
          . If the valuable inference happens in Google&apos;s datacenter either way, then the 2nm
          milestone is a margin story and a battery story, not a strategy story. The strategy already
          shipped, and it lives in a rack.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Three Signposts</h2>

        <p>
          First, whether Google publishes the memory footprint of Gemini Nano 4 or leaves it
          unstated. Every vendor quotes speed multiples and none of them quote resident size,
          because size is the number that reveals the ceiling.
        </p>

        <p>
          Second, whether the 12GB base holds through next generation or the Pro quietly returns to
          16GB once agentic features start failing on memory pressure. A reversal within a cycle
          would tell you this was a bill-of-materials decision that ran into physics.
        </p>

        <p>
          Third, whether Apple takes the opposite bet in September. Apple has been the loudest voice
          for on-device processing and has more incentive than anyone to keep inference off a rival
          cloud. If the iPhone 18 ships with more memory rather than more TOPS, that is the industry
          conceding which number actually governs.
        </p>
      </div>

      {/* Related */}
      <footer className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Related</h2>
        <div className="grid gap-3">
          <Link
            href="/originals/meta-muse-glimmer-30b-local-agent"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Three Days After OpenAI Hit the Brakes, Meta Handed Everyone a 30B Agent That Runs on
              One GPU.
            </span>
          </Link>
          <Link
            href="/originals/apple-gemini-siri-extensions-wwdc-2026"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              Apple Rebuilt Siri on Gemini and Opened the iPhone to Claude. The Assistant Layer Just
              Became Swappable.
            </span>
          </Link>
          <Link
            href="/originals/ai-inference-floor-may-2026"
            className="block bg-bg-secondary border border-border rounded-lg px-4 py-3 hover:border-accent-primary transition-colors"
          >
            <span className="text-text-primary text-sm">
              The Cheapest AI Model on the Market Costs 1.7 Cents per Million Tokens
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
        <Link href="/" className="text-text-muted hover:text-accent-primary transition-colors">
          Back to Feed
        </Link>
      </div>
    </article>
  );
}
