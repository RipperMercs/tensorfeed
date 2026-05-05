import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { ArticleJsonLd } from '@/components/seo/JsonLd';
import AdPlaceholder from '@/components/AdPlaceholder';

export const metadata: Metadata = {
  title: 'The Cheapest AI Model on the Market Costs 1.7 Cents per Million Tokens',
  description:
    'I pulled the live OpenRouter catalog this afternoon. 372 models, 33 of them free, the cheapest paid input at $0.017 per million tokens. The story is what the floor is doing to everyone above it.',
  openGraph: {
    title: 'The Cheapest AI Model on the Market Costs 1.7 Cents per Million Tokens',
    description:
      'OpenRouter now lists 372 models. 33 are free. The cheapest paid model costs less than a penny per page of text. Real numbers and what they mean.',
    type: 'article',
    publishedTime: '2026-05-04T20:00:00Z',
    authors: ['Ripper'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Cheapest AI Model on the Market Costs 1.7 Cents per Million Tokens',
    description:
      'I pulled the live OpenRouter catalog. 372 models, 33 free, cheapest paid at $0.017/Mtok. The race to the bottom is louder than the race to the top.',
  },
};

export default function AiInferenceFloorMay2026Page() {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <ArticleJsonLd
        title="The Cheapest AI Model on the Market Costs 1.7 Cents per Million Tokens"
        description="OpenRouter now lists 372 models. 33 are free. The cheapest paid model costs $0.017 per million tokens. What the inference floor looks like in May 2026."
        datePublished="2026-05-04"
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
          The Cheapest AI Model on the Market Costs 1.7 Cents per Million Tokens
        </h1>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="text-text-secondary font-medium">Ripper</span>
          <span>&middot;</span>
          <time dateTime="2026-05-04">May 4, 2026</time>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            5 min read
          </span>
        </div>
      </header>

      <div className="prose-custom space-y-6 text-text-secondary leading-relaxed">
        <p className="text-lg text-text-primary leading-relaxed">
          I pulled the live <Link href="/api/openrouter/models" className="text-accent-primary hover:underline">OpenRouter catalog</Link> this afternoon. 372 models routed across 50-plus providers, normalized to the same per-token pricing schema. The shape of the inference market in one snapshot. And the headline number is small: $0.017 per million input tokens for IBM&apos;s granite-4.0-h-micro, currently the cheapest paid model on OpenRouter.
        </p>

        <p>
          That is one and seven-tenths of a US cent for one million tokens of inference. A million tokens is roughly 750,000 words. So you can run a token through a model and pay less than a millionth of a cent for the privilege. The inference floor is now too cheap to think about.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">372 Models, 33 of Them Free</h2>

        <p>
          The most-cited number in any AI pricing piece is &quot;flagship per-token cost.&quot; That number tells you what Anthropic and OpenAI charge for their best stuff and not much else. The catalog tells a different story. Below the flagships there is an enormous shelf of capable, cheap, and increasingly free models that handle 80% of real workloads.
        </p>

        <p>
          Snapshot of the top namespaces today: OpenAI lists 64 models on OpenRouter, Qwen lists 51, Google lists 31, Mistral 25, Anthropic 14, Meta 14, DeepSeek 13, Z.ai 13. Open-weight providers (Qwen, Mistral, DeepSeek, Meta, Z.ai) are over 100 models combined. The proprietary frontier is a thin layer on top of a dense open-source middle.
        </p>

        <p>
          And 33 of those models are priced at zero. Free tier. Real free, not promotional-credits free. Google&apos;s Gemma family, Meta&apos;s Llama Guard, Baidu&apos;s Qianfan OCR, several distillations of frontier models, Mistral&apos;s smaller variants. If you are willing to use a smaller or more permissively-licensed model, the marginal cost of inference is literally nothing.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What the Floor Tells You About the Ceiling</h2>

        <p>
          Anthropic charges $15 per million input tokens for Claude Opus 4.7. The cheapest paid model on OpenRouter is roughly 880 times cheaper. A 880x spread between cheapest and most expensive is not a market with a clean substitute curve. It is a market with two distinct products that share a name.
        </p>

        <p>
          One product is &quot;raw text-token transformation,&quot; which is becoming a commodity. Open-weight models running on cloud GPU at scale, dispatched through OpenRouter or directly via Together or Fireworks, can do this for under a cent per million tokens. The price floor is set by the cost of GPU minutes, not by the cost of training the model. That floor will keep falling as GPU rental rates fall and as smaller distillations get good enough.
        </p>

        <p>
          The other product is &quot;intelligence on the hard problem.&quot; SWE-bench scores of 65+, 200K+ context with no degradation, multi-turn tool use that does not lose the thread, careful refusal behavior. Anthropic, OpenAI, and Google sell that product. They will keep charging premium prices for it as long as the gap to the open shelf is large enough to justify the spread.
        </p>

        <p>
          The interesting question for 2026 is how fast the gap closes. DeepSeek R1 shocked everyone by closing it on reasoning at a tenth of the price. Qwen has been closing it on Chinese-language benchmarks. The frontier labs respond by extending the spread on capabilities the open shelf cannot easily replicate (1M+ context, agentic reliability, multimodal). So far the spread has held. But it has narrowed.
        </p>

        <AdPlaceholder format="in-article" className="my-8" />

        <h2 className="text-2xl font-semibold text-text-primary pt-4">Practical Numbers Worth Remembering</h2>

        <p>
          Some price points from today&apos;s pull, for the next time someone asks you what AI inference costs:
        </p>

        <ul className="list-disc list-inside space-y-2 pl-2">
          <li>
            <span className="text-text-primary font-medium">Cheapest paid input:</span> IBM&apos;s granite-4.0-h-micro at $0.017 per million tokens. 131K context window.
          </li>
          <li>
            <span className="text-text-primary font-medium">Cheapest paid output:</span> Meta&apos;s Llama Guard 3 8B at $0.03 per million tokens. Designed for content classification.
          </li>
          <li>
            <span className="text-text-primary font-medium">Cheap-but-capable workhorses:</span> Mistral Nemo at $0.02 input / $0.03 output, Llama 3.1 8B at $0.02 / $0.05, Qwen Turbo at $0.03 / $0.13. All with 16K-131K context. Each costs less per million tokens than a stamp.
          </li>
          <li>
            <span className="text-text-primary font-medium">Free with reasonable quality:</span> Google&apos;s Gemma 3 family in 4B, 12B, and 27B sizes. The 27B model has 131K context at zero cost.
          </li>
          <li>
            <span className="text-text-primary font-medium">Largest context window in the catalog:</span> OpenRouter&apos;s auto-routed model at 2,000,000 tokens. Two million tokens is roughly a copy of every Tolkien novel, with room to spare.
          </li>
        </ul>

        <p>
          What this list says, more loudly than any headline: if you are building agentic workflows that fan out reads across many small tasks (parsing, summarization, classification, intent detection, embedding generation), you should not be paying flagship rates for those steps. You should route them to the cheap shelf and reserve the flagship for the steps that actually need it.
        </p>

        <h2 className="text-2xl font-semibold text-text-primary pt-4">What I Do With This Data</h2>

        <p>
          On TensorFeed I built two endpoints around the OpenRouter catalog because it is the most useful inference snapshot we publish. <Link href="/api/openrouter/models" className="text-accent-primary hover:underline">/api/openrouter/models</Link> gives you the raw JSON of all 372 models with normalized pricing. <Link href="/api/today" className="text-accent-primary hover:underline">/api/today</Link> bundles a summary of the catalog into a single morning brief alongside news, papers, and HF trending.
        </p>

        <p>
          Both are free, no auth. If you build a routing layer for your own agent and want a daily-refreshed source for &quot;cheapest model for X,&quot; that data is sitting there. If you publish your own pricing comparison, our snapshot is the closest thing to a daily census. The data acquisition is the moat, and we are giving the moat away.
        </p>

        <p>
          The thesis is simple. The AI ecosystem is too fragmented for any one team to track, and the prices change too often for any cached page to stay accurate. So we capture the snapshot every day, expose it on a stable URL, and let the agents and humans who need it pull what they need. That is what TensorFeed is, and the pricing data is one of the cleanest examples.
        </p>

        <p>
          Tomorrow these numbers will be different. The cheapest model will be cheaper, the catalog will be larger, the namespaces will reshuffle. The thing that will stay the same is the direction. Down and out and free.
        </p>

        <p className="text-sm text-text-muted pt-8 border-t border-border">
          Live data: <Link href="/api/openrouter/models" className="text-accent-primary hover:underline">/api/openrouter/models</Link>. Companion piece: <Link href="/originals/ai-api-pricing-war-2026" className="text-accent-primary hover:underline">The AI API Pricing War of 2026</Link>.
        </p>
      </div>
    </article>
  );
}
