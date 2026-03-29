import { Metadata } from 'next';
import Link from 'next/link';
import { ArticleJsonLd, FAQPageJsonLd } from '@/components/seo/JsonLd';
import pricingData from '@/../data/pricing.json';

export const metadata: Metadata = {
  title: 'AI API Pricing Guide 2026: Every Provider Compared | TensorFeed',
  description:
    'Complete AI API pricing comparison for 2026. Compare costs for OpenAI, Anthropic, Google, Meta, Mistral, and Cohere models. Includes cost calculator examples, free tier comparison, and tips for reducing API costs.',
  openGraph: {
    title: 'AI API Pricing Guide 2026: Every Provider Compared',
    description:
      'Compare AI API pricing across OpenAI, Anthropic, Google, Mistral, and more. Cost calculators, free tiers, and optimization tips.',
    url: 'https://tensorfeed.ai/ai-api-pricing-guide',
  },
};

export default function AIAPIPricingGuidePage() {
  const { providers, pricingNotes } = pricingData;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ArticleJsonLd
        title="AI API Pricing Guide 2026: Every Provider Compared"
        description="Complete AI API pricing comparison for 2026 covering all major providers, cost calculators, free tier details, and optimization tips."
        datePublished="2025-07-01"
        dateModified="2026-03-28"
      />

      <p className="text-text-muted text-sm mb-4">Last Updated: March 2026</p>

      <h1 className="text-4xl font-bold text-text-primary mb-6">
        AI API Pricing Guide: Every Provider Compared
      </h1>

      <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-xl p-4 mb-8">
        <p className="text-text-secondary text-base leading-relaxed">
          AI API pricing in 2026 ranges from free open-source models to $75 per million tokens for
          premium models like Claude Opus. Most developers spend between $0.10 and $15 per million
          input tokens depending on the model tier and use case.
        </p>
      </div>

      <p className="text-lg text-text-secondary mb-8 leading-relaxed">
        AI API pricing can be confusing. Every provider uses slightly different units, some charge
        differently for input and output tokens, and prices change frequently. This guide breaks
        it all down in one place, with real cost examples so you can estimate what your project
        will actually cost. All prices are in USD per 1 million tokens unless noted otherwise.
      </p>

      {/* Table of Contents */}
      <nav className="bg-bg-secondary border border-border rounded-lg p-6 mb-10">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Table of Contents</h2>
        <ol className="space-y-2 text-accent-primary list-decimal list-inside">
          <li><a href="#overview" className="hover:underline">Pricing Overview: All Models</a></li>
          <li><a href="#provider-details" className="hover:underline">Pricing by Provider</a></li>
          <li><a href="#cost-calculator" className="hover:underline">Cost Calculator Examples</a></li>
          <li><a href="#free-tiers" className="hover:underline">Free Tier Comparison</a></li>
          <li><a href="#per-task-costs" className="hover:underline">Price Per Task Estimates</a></li>
          <li><a href="#reducing-costs" className="hover:underline">Tips for Reducing API Costs</a></li>
          <li><a href="#understanding-tokens" className="hover:underline">Understanding Tokens</a></li>
        </ol>
      </nav>

      {/* Overview Table */}
      <section id="overview" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Pricing Overview: All Models</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Here is every major API model with its current pricing, sorted by provider. Prices are
          per 1 million tokens. For context, 1 million tokens is roughly 750,000 words, or about
          4-5 full-length novels.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border border-border rounded-lg overflow-hidden text-sm">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="text-left p-3 text-text-primary font-semibold">Provider</th>
                <th className="text-left p-3 text-text-primary font-semibold">Model</th>
                <th className="text-right p-3 text-text-primary font-semibold">Input $/1M</th>
                <th className="text-right p-3 text-text-primary font-semibold">Output $/1M</th>
                <th className="text-right p-3 text-text-primary font-semibold">Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {providers.flatMap((provider) =>
                provider.models.map((model) => (
                  <tr key={model.id} className="bg-bg-secondary">
                    <td className="p-3 text-text-primary font-medium">{provider.name}</td>
                    <td className="p-3 text-text-secondary">{model.name}</td>
                    <td className="p-3 text-right text-text-secondary">
                      {model.inputPrice === 0 ? 'Free*' : `$${model.inputPrice.toFixed(2)}`}
                    </td>
                    <td className="p-3 text-right text-text-secondary">
                      {model.outputPrice === 0 ? 'Free*' : `$${model.outputPrice.toFixed(2)}`}
                    </td>
                    <td className="p-3 text-right text-text-muted">
                      {model.contextWindow >= 1000000
                        ? `${(model.contextWindow / 1000000).toFixed(0)}M`
                        : `${(model.contextWindow / 1000).toFixed(0)}K`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-text-muted text-sm mt-3">
          * Open source models are free to self-host. Hosted API pricing varies by provider
          (e.g., Together, Fireworks, Groq). {pricingNotes.disclaimer}
        </p>
      </section>

      {/* Provider Details */}
      <section id="provider-details" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Pricing by Provider</h2>

        {providers.map((provider) => (
          <div key={provider.id} className="bg-bg-secondary border border-border rounded-lg p-5 mb-4">
            <h3 className="text-xl font-semibold text-text-primary mb-3">{provider.name}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-primary font-medium">Model</th>
                    <th className="text-right py-2 text-text-primary font-medium">Input</th>
                    <th className="text-right py-2 text-text-primary font-medium">Output</th>
                    <th className="text-right py-2 text-text-primary font-medium">Context</th>
                    <th className="text-left py-2 pl-4 text-text-primary font-medium">Capabilities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {provider.models.map((model) => (
                    <tr key={model.id}>
                      <td className="py-2 text-text-secondary">{model.name}</td>
                      <td className="py-2 text-right text-text-secondary">
                        {model.inputPrice === 0 ? 'Free*' : `$${model.inputPrice.toFixed(2)}`}
                      </td>
                      <td className="py-2 text-right text-text-secondary">
                        {model.outputPrice === 0 ? 'Free*' : `$${model.outputPrice.toFixed(2)}`}
                      </td>
                      <td className="py-2 text-right text-text-muted">
                        {model.contextWindow >= 1000000
                          ? `${(model.contextWindow / 1000000).toFixed(0)}M`
                          : `${(model.contextWindow / 1000).toFixed(0)}K`}
                      </td>
                      <td className="py-2 pl-4 text-text-muted">
                        {model.capabilities.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {/* Cost Calculator */}
      <section id="cost-calculator" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Cost Calculator Examples</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          Abstract token prices are hard to reason about. Here are concrete examples showing what
          common tasks actually cost with different models. These assume typical token counts for
          each task type.
        </p>

        <div className="space-y-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-3">
              Example 1: Chatbot Application (10,000 conversations/month)
            </h3>
            <p className="text-text-secondary text-sm mb-3">
              Assuming each conversation averages 2,000 input tokens and 1,000 output tokens:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-primary font-medium">Model</th>
                    <th className="text-right py-2 text-text-primary font-medium">Input Cost</th>
                    <th className="text-right py-2 text-text-primary font-medium">Output Cost</th>
                    <th className="text-right py-2 text-text-primary font-semibold">Total/month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="py-2 text-text-secondary">Claude Opus 4.6</td>
                    <td className="py-2 text-right text-text-muted">$300.00</td>
                    <td className="py-2 text-right text-text-muted">$750.00</td>
                    <td className="py-2 text-right text-text-primary font-semibold">$1,050.00</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-secondary">Claude Sonnet 4.6</td>
                    <td className="py-2 text-right text-text-muted">$60.00</td>
                    <td className="py-2 text-right text-text-muted">$150.00</td>
                    <td className="py-2 text-right text-text-primary font-semibold">$210.00</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-secondary">GPT-4o</td>
                    <td className="py-2 text-right text-text-muted">$50.00</td>
                    <td className="py-2 text-right text-text-muted">$100.00</td>
                    <td className="py-2 text-right text-text-primary font-semibold">$150.00</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-secondary">GPT-4o-mini</td>
                    <td className="py-2 text-right text-text-muted">$3.00</td>
                    <td className="py-2 text-right text-text-muted">$6.00</td>
                    <td className="py-2 text-right text-text-primary font-semibold">$9.00</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-secondary">Claude Haiku 4.5</td>
                    <td className="py-2 text-right text-text-muted">$16.00</td>
                    <td className="py-2 text-right text-text-muted">$40.00</td>
                    <td className="py-2 text-right text-text-primary font-semibold">$56.00</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-secondary">Gemini 2.0 Flash</td>
                    <td className="py-2 text-right text-text-muted">$2.00</td>
                    <td className="py-2 text-right text-text-muted">$4.00</td>
                    <td className="py-2 text-right text-accent-primary font-semibold">$6.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-text-muted text-sm mt-3">
              The takeaway: there is a 175x cost difference between the most expensive and cheapest
              options for the same workload. Choosing the right model matters enormously.
            </p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-3">
              Example 2: Document Summarization (1,000 documents/month)
            </h3>
            <p className="text-text-secondary text-sm mb-3">
              Assuming each document is 10,000 input tokens and the summary is 500 output tokens:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-primary font-medium">Model</th>
                    <th className="text-right py-2 text-text-primary font-semibold">Total/month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="py-2 text-text-secondary">Claude Opus 4.6</td>
                    <td className="py-2 text-right text-text-primary font-semibold">$187.50</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-secondary">Gemini 2.5 Pro</td>
                    <td className="py-2 text-right text-text-primary font-semibold">$17.50</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-secondary">Mistral Small</td>
                    <td className="py-2 text-right text-text-primary font-semibold">$1.15</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-secondary">Gemini 2.0 Flash</td>
                    <td className="py-2 text-right text-accent-primary font-semibold">$1.20</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-3">
              Example 3: Code Generation (500 requests/day)
            </h3>
            <p className="text-text-secondary text-sm mb-3">
              Assuming 1,500 input tokens (prompt + context) and 2,000 output tokens (generated code) per request:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-text-primary font-medium">Model</th>
                    <th className="text-right py-2 text-text-primary font-semibold">Total/month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr>
                    <td className="py-2 text-text-secondary">o1 (reasoning)</td>
                    <td className="py-2 text-right text-text-primary font-semibold">$2,137.50</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-secondary">Claude Sonnet 4.6</td>
                    <td className="py-2 text-right text-text-primary font-semibold">$517.50</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-secondary">GPT-4o</td>
                    <td className="py-2 text-right text-text-primary font-semibold">$356.25</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-secondary">o3-mini</td>
                    <td className="py-2 text-right text-text-primary font-semibold">$156.75</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-text-secondary">GPT-4o-mini</td>
                    <td className="py-2 text-right text-accent-primary font-semibold">$21.38</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Free Tiers */}
      <section id="free-tiers" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Free Tier Comparison</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          Most providers offer free API access with usage limits. Here is what you get without
          spending anything:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border border-border rounded-lg overflow-hidden text-sm">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="text-left p-3 text-text-primary font-semibold">Provider</th>
                <th className="text-left p-3 text-text-primary font-semibold">Free Tier Details</th>
                <th className="text-left p-3 text-text-primary font-semibold">Models Available</th>
                <th className="text-left p-3 text-text-primary font-semibold">Limits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">OpenAI</td>
                <td className="p-3 text-text-secondary">Free credits for new accounts</td>
                <td className="p-3 text-text-secondary">GPT-4o-mini, GPT-3.5</td>
                <td className="p-3 text-text-muted">Rate limited; credit expires</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Anthropic</td>
                <td className="p-3 text-text-secondary">Free credits for new accounts</td>
                <td className="p-3 text-text-secondary">Claude Haiku, Sonnet</td>
                <td className="p-3 text-text-muted">Rate limited; credit expires</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Google</td>
                <td className="p-3 text-text-secondary">Generous free tier via AI Studio</td>
                <td className="p-3 text-text-secondary">Gemini 2.0 Flash, 2.5 Pro (limited)</td>
                <td className="p-3 text-text-muted">15 RPM for Flash; lower for Pro</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Mistral</td>
                <td className="p-3 text-text-secondary">Free tier available</td>
                <td className="p-3 text-text-secondary">Mistral Small, open models</td>
                <td className="p-3 text-text-muted">Rate limited</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Meta (via hosts)</td>
                <td className="p-3 text-text-secondary">Free self-hosting; hosted free tiers vary</td>
                <td className="p-3 text-text-secondary">Llama 4 Scout, Maverick</td>
                <td className="p-3 text-text-muted">Unlimited if self-hosted</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-bg-tertiary border border-border rounded-lg p-4 mt-4">
          <p className="text-text-secondary text-sm leading-relaxed">
            <strong className="text-text-primary">Pro tip:</strong> Google AI Studio offers the
            most generous free API access. If you are prototyping or building a low-traffic
            application, you can potentially run entirely on Google&apos;s free tier with Gemini
            2.0 Flash.
          </p>
        </div>
      </section>

      {/* Per Task Costs */}
      <section id="per-task-costs" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Price Per Task Estimates</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          Here is roughly what common tasks cost per individual request using different model tiers.
          These are estimates based on typical token counts.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border border-border rounded-lg overflow-hidden text-sm">
            <thead className="bg-bg-tertiary">
              <tr>
                <th className="text-left p-3 text-text-primary font-semibold">Task</th>
                <th className="text-left p-3 text-text-primary font-semibold">Tokens (in/out)</th>
                <th className="text-right p-3 text-text-primary font-semibold">Frontier Model</th>
                <th className="text-right p-3 text-text-primary font-semibold">Mid-tier Model</th>
                <th className="text-right p-3 text-text-primary font-semibold">Budget Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Summarize an article</td>
                <td className="p-3 text-text-muted">3K / 300</td>
                <td className="p-3 text-right text-text-secondary">$0.067</td>
                <td className="p-3 text-right text-text-secondary">$0.014</td>
                <td className="p-3 text-right text-text-secondary">$0.0006</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Translate 1 page</td>
                <td className="p-3 text-text-muted">500 / 600</td>
                <td className="p-3 text-right text-text-secondary">$0.052</td>
                <td className="p-3 text-right text-text-secondary">$0.011</td>
                <td className="p-3 text-right text-text-secondary">$0.0004</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Generate a function</td>
                <td className="p-3 text-text-muted">1K / 500</td>
                <td className="p-3 text-right text-text-secondary">$0.053</td>
                <td className="p-3 text-right text-text-secondary">$0.011</td>
                <td className="p-3 text-right text-text-secondary">$0.0005</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Write a blog post</td>
                <td className="p-3 text-text-muted">500 / 3K</td>
                <td className="p-3 text-right text-text-secondary">$0.233</td>
                <td className="p-3 text-right text-text-secondary">$0.047</td>
                <td className="p-3 text-right text-text-secondary">$0.0019</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Analyze a spreadsheet</td>
                <td className="p-3 text-text-muted">10K / 1K</td>
                <td className="p-3 text-right text-text-secondary">$0.225</td>
                <td className="p-3 text-right text-text-secondary">$0.045</td>
                <td className="p-3 text-right text-text-secondary">$0.0016</td>
              </tr>
              <tr className="bg-bg-secondary">
                <td className="p-3 text-text-primary font-medium">Chat response (avg)</td>
                <td className="p-3 text-text-muted">2K / 500</td>
                <td className="p-3 text-right text-text-secondary">$0.068</td>
                <td className="p-3 text-right text-text-secondary">$0.014</td>
                <td className="p-3 text-right text-text-secondary">$0.0005</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-text-muted text-sm mt-3">
          Frontier model = Claude Opus 4.6 / o1. Mid-tier = Claude Sonnet 4.6 / GPT-4o. Budget = GPT-4o-mini / Gemini Flash.
        </p>
      </section>

      {/* Reducing Costs */}
      <section id="reducing-costs" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Tips for Reducing API Costs</h2>
        <p className="text-text-secondary leading-relaxed mb-6">
          API costs can add up quickly, especially at scale. Here are practical strategies for
          keeping them under control:
        </p>

        <div className="space-y-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">1. Use the smallest model that works</h3>
            <p className="text-text-secondary leading-relaxed">
              This is the single most impactful optimization. For many tasks, GPT-4o-mini or
              Gemini Flash produces results that are nearly as good as frontier models at a
              fraction of the cost. Test your use case with cheaper models first and only upgrade
              if quality is genuinely insufficient. A model that is 10x cheaper and 95% as good
              is almost always the right choice.
            </p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">2. Implement caching</h3>
            <p className="text-text-secondary leading-relaxed">
              If users ask similar questions, cache the responses. Both Anthropic and OpenAI offer
              prompt caching features that can reduce costs by up to 90% for repeated prefixes.
              Even simple application-level caching (storing responses for identical inputs) can
              save significant money.
            </p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">3. Optimize your prompts</h3>
            <p className="text-text-secondary leading-relaxed">
              Shorter prompts cost less. Remove unnecessary instructions, examples, and context.
              Use system prompts efficiently. If you are including few-shot examples, test whether
              you really need all of them. Often 1-2 examples work nearly as well as 5-6.
            </p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">4. Set max token limits</h3>
            <p className="text-text-secondary leading-relaxed">
              Always set a max_tokens parameter to prevent unexpectedly long (and expensive)
              responses. For a summarization task, you probably do not need more than 500 output
              tokens. For code generation, 2,000 is usually plenty.
            </p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">5. Use model routing</h3>
            <p className="text-text-secondary leading-relaxed">
              Route different requests to different models based on complexity. Simple questions
              go to a cheap model; complex ones go to a frontier model. You can implement this
              with a classifier (which itself can be a cheap model) or with simple heuristics
              based on input length or keywords.
            </p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">6. Batch your requests</h3>
            <p className="text-text-secondary leading-relaxed">
              Both OpenAI and Anthropic offer batch APIs with 50% discounts. If your use case
              does not require real-time responses (e.g., processing a backlog of documents),
              batching can cut your costs in half.
            </p>
          </div>

          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">7. Consider open source models</h3>
            <p className="text-text-secondary leading-relaxed">
              For high-volume applications, self-hosting an open source model like Llama 4 or
              Mistral can be dramatically cheaper than API calls. The upfront infrastructure cost
              is higher, but per-request costs approach zero. See our{' '}
              <Link href="/best-open-source-llms" className="text-accent-primary hover:underline">
                open source LLM guide
              </Link>{' '}
              for details.
            </p>
          </div>
        </div>
      </section>

      {/* Understanding Tokens */}
      <section id="understanding-tokens" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Understanding Tokens</h2>
        <p className="text-text-secondary leading-relaxed mb-4">
          Tokens are the fundamental unit of AI API pricing. A token is roughly three-quarters of
          a word in English. Here are some helpful benchmarks:
        </p>

        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <ul className="space-y-2 text-text-secondary">
            <li><strong className="text-text-primary">1 token</strong> = roughly 4 characters or 0.75 words in English</li>
            <li><strong className="text-text-primary">100 tokens</strong> = roughly 75 words (a short paragraph)</li>
            <li><strong className="text-text-primary">1,000 tokens</strong> = roughly 750 words (about 1.5 pages)</li>
            <li><strong className="text-text-primary">10,000 tokens</strong> = roughly 7,500 words (a long article)</li>
            <li><strong className="text-text-primary">100,000 tokens</strong> = roughly 75,000 words (a short novel)</li>
            <li><strong className="text-text-primary">1,000,000 tokens</strong> = roughly 750,000 words (several novels)</li>
          </ul>
        </div>

        <p className="text-text-secondary leading-relaxed mt-4">
          Important: input tokens and output tokens are priced differently, with output tokens
          typically costing 2-5x more than input tokens. This is because generating text is more
          computationally intensive than processing it. When estimating costs, always account for
          both sides.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">How much does the OpenAI API cost?</h3>
            <p className="text-text-secondary leading-relaxed">
              OpenAI API pricing varies by model. GPT-4o costs $2.50 per 1M input tokens and $10 per
              1M output tokens. GPT-4o-mini is much cheaper at $0.15/$0.60. The o1 reasoning model
              costs $15/$60.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">What is the cheapest AI API?</h3>
            <p className="text-text-secondary leading-relaxed">
              Google&apos;s Gemini 2.0 Flash is one of the cheapest at $0.10 per 1M input tokens.
              Open-source models like Llama 4 are free to self-host. Groq offers fast inference at
              competitive prices.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">How are AI API tokens counted?</h3>
            <p className="text-text-secondary leading-relaxed">
              Roughly, 1 token equals about 4 characters or 0.75 words in English. A 1,000-word
              document is approximately 1,333 tokens. Most APIs charge separately for input (prompt)
              and output (completion) tokens.
            </p>
          </div>
          <div className="bg-bg-secondary border border-border rounded-lg p-5">
            <h3 className="text-lg font-semibold text-text-primary mb-2">Which AI API is best for production?</h3>
            <p className="text-text-secondary leading-relaxed">
              For reliability and quality, Anthropic (Claude) and OpenAI (GPT-4o) are the most popular
              choices. For cost-sensitive applications, Gemini Flash or self-hosted open-source models
              offer the best value.
            </p>
          </div>
        </div>
      </section>

      <FAQPageJsonLd
        faqs={[
          { question: 'How much does the OpenAI API cost?', answer: 'OpenAI API pricing varies by model. GPT-4o costs $2.50 per 1M input tokens and $10 per 1M output tokens. GPT-4o-mini is much cheaper at $0.15/$0.60. The o1 reasoning model costs $15/$60.' },
          { question: 'What is the cheapest AI API?', answer: "Google's Gemini 2.0 Flash is one of the cheapest at $0.10 per 1M input tokens. Open-source models like Llama 4 are free to self-host. Groq offers fast inference at competitive prices." },
          { question: 'How are AI API tokens counted?', answer: 'Roughly, 1 token equals about 4 characters or 0.75 words in English. A 1,000-word document is approximately 1,333 tokens. Most APIs charge separately for input (prompt) and output (completion) tokens.' },
          { question: 'Which AI API is best for production?', answer: 'For reliability and quality, Anthropic (Claude) and OpenAI (GPT-4o) are the most popular choices. For cost-sensitive applications, Gemini Flash or self-hosted open-source models offer the best value.' },
        ]}
      />

      {/* Related Content */}
      <section className="bg-bg-secondary border border-border rounded-lg p-6 mb-10">
        <h2 className="text-xl font-bold text-text-primary mb-4">Related Resources</h2>
        <ul className="space-y-2">
          <li>
            <Link href="/models" className="text-accent-primary hover:underline">
              TensorFeed Model Tracker (live pricing data)
            </Link>
          </li>
          <li>
            <Link href="/best-ai-chatbots" className="text-accent-primary hover:underline">
              Best AI Chatbots Compared (2026)
            </Link>
          </li>
          <li>
            <Link href="/best-open-source-llms" className="text-accent-primary hover:underline">
              Best Open Source LLMs in 2026
            </Link>
          </li>
          <li>
            <Link href="/best-ai-tools" className="text-accent-primary hover:underline">
              Best AI Tools in 2026
            </Link>
          </li>
        </ul>
      </section>

      <div className="text-center">
        <Link href="/" className="text-accent-primary hover:underline text-sm">
          &larr; Back to Feed
        </Link>
      </div>
    </div>
  );
}
