'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calculator, Info } from 'lucide-react';
import fallbackPricingData from '@/../data/pricing.json';
import { FAQPageJsonLd } from '@/components/seo/JsonLd';

interface Model {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow: number;
  released: string;
  capabilities: string[];
  openSource?: boolean;
}

interface Provider {
  id: string;
  name: string;
  logo: string;
  url: string;
  models: Model[];
}

interface PricingData {
  lastUpdated: string;
  providers: Provider[];
}

interface FlatModel extends Model {
  provider: string;
}

const TOKEN_PRESETS = [
  { label: '100K', value: 100_000 },
  { label: '1M', value: 1_000_000 },
  { label: '5M', value: 5_000_000 },
  { label: '10M', value: 10_000_000 },
  { label: '50M', value: 50_000_000 },
  { label: '100M', value: 100_000_000 },
];

const USE_CASES = [
  { id: 'general', label: 'General' },
  { id: 'coding', label: 'Coding' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'creative', label: 'Creative' },
];

const USE_CASE_TIPS: Record<string, string> = {
  general:
    'For general tasks, mid-tier models like Claude Sonnet, GPT-4o, or Gemini 2.5 Pro offer a strong balance of quality and cost.',
  coding:
    'For coding tasks, Claude Sonnet 4.6 and GPT-4o excel at code generation and debugging. Consider o3-mini for complex reasoning at lower cost.',
  analysis:
    'For data analysis, Gemini 2.5 Pro handles massive contexts well. Claude Opus 4.6 and o1 provide the deepest reasoning capabilities.',
  creative:
    'For creative writing, Claude Opus 4.6 and GPT-4o produce the most nuanced output. Smaller models work fine for shorter-form content.',
};

const FAQ_ITEMS = [
  {
    question: 'How much does the Claude API cost?',
    answer:
      'Claude API pricing varies by model tier. Claude Opus 4.6 costs $15/1M input tokens and $75/1M output tokens. Claude Sonnet 4.6 is $3/1M input and $15/1M output. Claude Haiku 4.5 is the most affordable at $0.80/1M input and $4/1M output. All Claude models support 200K context windows.',
  },
  {
    question: 'What is the cheapest AI API?',
    answer:
      'The cheapest AI APIs include Google Gemini 2.0 Flash at $0.10/1M input tokens, Mistral Small at $0.10/1M input, and GPT-4o-mini at $0.15/1M input. Open-source models like Llama 4 Scout and Llama 4 Maverick are free to self-host, though you will pay for compute infrastructure.',
  },
  {
    question: 'How are AI API tokens counted?',
    answer:
      'AI tokens are the basic units of text that language models process. One token is roughly 4 characters or about 0.75 words in English. A 1,000-word article is approximately 1,333 tokens. Pricing is typically quoted per 1 million tokens, with input (prompt) and output (completion) priced separately.',
  },
  {
    question: 'Which AI API is best for production?',
    answer:
      'The best AI API for production depends on your use case. Claude Sonnet 4.6 and GPT-4o offer strong all-around performance at moderate cost. For budget-sensitive applications, GPT-4o-mini and Gemini 2.0 Flash deliver solid results at a fraction of the price. For tasks requiring deep reasoning, Claude Opus 4.6 or o1 are top choices, though they cost significantly more.',
  },
];

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K`;
  return tokens.toString();
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

export default function CostCalculatorPage() {
  const [pricingData, setPricingData] = useState<PricingData>(fallbackPricingData as PricingData);
  const [monthlyTokens, setMonthlyTokens] = useState(1_000_000);
  const [inputRatio, setInputRatio] = useState(70);
  const [useCase, setUseCase] = useState('general');
  const [tokenInputValue, setTokenInputValue] = useState('1000000');

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/models')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.providers?.length) {
          setPricingData(data);
        }
      })
      .catch(() => {});
  }, []);

  const allModels: FlatModel[] = useMemo(
    () =>
      pricingData.providers.flatMap((provider) =>
        provider.models.map((model) => ({
          provider: provider.name,
          ...model,
        }))
      ),
    [pricingData]
  );

  const outputRatio = 100 - inputRatio;
  const inputTokens = monthlyTokens * (inputRatio / 100);
  const outputTokens = monthlyTokens * (outputRatio / 100);

  const results = useMemo(() => {
    return allModels
      .map((model) => {
        const inputCost = (inputTokens / 1_000_000) * model.inputPrice;
        const outputCost = (outputTokens / 1_000_000) * model.outputPrice;
        const totalCost = inputCost + outputCost;
        return { ...model, inputCost, outputCost, totalCost };
      })
      .sort((a, b) => a.totalCost - b.totalCost);
  }, [allModels, inputTokens, outputTokens]);

  const cheapestPaidModel = results.find((r) => r.totalCost > 0);
  const mostCapableIds = ['claude-opus-4-6', 'gpt-4o', 'gemini-2-5-pro'];

  function handleTokenInput(value: string) {
    setTokenInputValue(value);
    const parsed = parseInt(value.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setMonthlyTokens(parsed);
    }
  }

  function applyPreset(value: number) {
    setMonthlyTokens(value);
    setTokenInputValue(value.toString());
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FAQPageJsonLd faqs={FAQ_ITEMS} />

      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Calculator className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">AI API Cost Calculator</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl">
          Estimate your monthly AI API spend across all major providers. Adjust your token volume and
          input/output ratio to see real-time cost comparisons.
        </p>
      </div>

      {/* Inputs Section */}
      <section className="mb-10 bg-bg-secondary border border-border rounded-xl p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-6">Configure Your Usage</h2>

        {/* Monthly Token Volume */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Monthly Token Volume
          </label>
          <input
            type="text"
            value={tokenInputValue}
            onChange={(e) => handleTokenInput(e.target.value)}
            className="w-full sm:w-64 px-4 py-2.5 bg-bg-tertiary border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-primary/50 transition-colors"
            placeholder="Enter token count"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            {TOKEN_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => applyPreset(preset.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  monthlyTokens === preset.value
                    ? 'bg-accent-primary/10 border-accent-primary/50 text-accent-primary'
                    : 'bg-bg-tertiary border-border text-text-secondary hover:text-text-primary hover:border-accent-primary/30'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input/Output Ratio */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Input / Output Ratio
          </label>
          <div className="flex items-center gap-4">
            <span className="text-sm text-accent-primary font-medium w-20">Input: {inputRatio}%</span>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={inputRatio}
              onChange={(e) => setInputRatio(parseInt(e.target.value, 10))}
              className="flex-1 accent-accent-primary"
            />
            <span className="text-sm text-accent-secondary font-medium w-24">Output: {outputRatio}%</span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            {formatTokens(inputTokens)} input tokens + {formatTokens(outputTokens)} output tokens per month
          </p>
        </div>

        {/* Use Case Selector */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Use Case</label>
          <div className="flex flex-wrap gap-2">
            {USE_CASES.map((uc) => (
              <button
                key={uc.id}
                onClick={() => setUseCase(uc.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  useCase === uc.id
                    ? 'bg-accent-primary/10 border-accent-primary/50 text-accent-primary'
                    : 'bg-bg-tertiary border-border text-text-secondary hover:text-text-primary hover:border-accent-primary/30'
                }`}
              >
                {uc.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-2 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {USE_CASE_TIPS[useCase]}
          </p>
        </div>
      </section>

      {/* Results Table */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold text-text-primary mb-6">
          Estimated Monthly Costs
          <span className="text-sm font-normal text-text-muted ml-3">
            for {formatTokens(monthlyTokens)} tokens/month
          </span>
        </h2>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-bg-tertiary">
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">
                  Monthly Cost
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right hidden sm:table-cell">
                  Input Cost
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right hidden sm:table-cell">
                  Output Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((model, index) => {
                const isCheapest = index === 0;
                const isBestValue =
                  cheapestPaidModel && model.id === cheapestPaidModel.id && !isCheapest;
                const isMostCapable = mostCapableIds.includes(model.id);

                return (
                  <tr
                    key={model.id}
                    className={`bg-bg-secondary hover:bg-bg-tertiary/50 transition-colors ${
                      isCheapest ? 'ring-1 ring-inset ring-accent-green/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-text-secondary">{model.provider}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-text-primary font-medium">{model.name}</span>
                      <span className="inline-flex gap-1.5 ml-2">
                        {isCheapest && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-green/10 text-accent-green border border-accent-green/30 font-medium">
                            Cheapest
                          </span>
                        )}
                        {isBestValue && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium">
                            Best Value
                          </span>
                        )}
                        {isMostCapable && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 font-medium">
                            Most Capable
                          </span>
                        )}
                        {model.openSource && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted border border-border font-medium">
                            Open Source
                          </span>
                        )}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-semibold ${
                        isCheapest ? 'text-accent-green' : 'text-text-primary'
                      }`}
                    >
                      {formatCost(model.totalCost)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-text-secondary hidden sm:table-cell">
                      {formatCost(model.inputCost)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-text-secondary hidden sm:table-cell">
                      {formatCost(model.outputCost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Show the math for cheapest paid model */}
        {cheapestPaidModel && (
          <div className="mt-4 bg-bg-secondary border border-border rounded-xl p-4">
            <p className="text-xs text-text-muted font-medium mb-1">Cost breakdown for {cheapestPaidModel.name}:</p>
            <p className="text-sm text-text-secondary">
              {formatTokens(inputTokens)} input tokens x ${cheapestPaidModel.inputPrice.toFixed(2)}/1M +{' '}
              {formatTokens(outputTokens)} output tokens x ${cheapestPaidModel.outputPrice.toFixed(2)}/1M ={' '}
              <span className="text-text-primary font-medium">{formatCost(cheapestPaidModel.totalCost)}/month</span>
            </p>
          </div>
        )}
      </section>

      {/* FAQ Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((faq) => (
            <details
              key={faq.question}
              className="bg-bg-secondary border border-border rounded-xl group"
            >
              <summary className="px-6 py-4 cursor-pointer text-text-primary font-medium text-sm hover:text-accent-primary transition-colors list-none flex items-center justify-between">
                {faq.question}
                <span className="text-text-muted group-open:rotate-180 transition-transform ml-4">
                  &#9662;
                </span>
              </summary>
              <div className="px-6 pb-4 text-sm text-text-secondary leading-relaxed">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
