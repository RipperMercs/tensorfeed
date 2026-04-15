'use client';

import { useState, useEffect, useMemo } from 'react';
import { Cpu, Plus, X, ChevronDown, ArrowRight } from 'lucide-react';
import fallbackPricingData from '@/../data/pricing.json';
import Link from 'next/link';
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

function formatContext(ctx: number): string {
  if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(ctx % 1000000 === 0 ? 0 : 1)}M`;
  return `${(ctx / 1000).toFixed(0)}K`;
}

function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  return `$${price.toFixed(2)}`;
}

const popularComparisons: { label: string; ids: string[] }[] = [
  { label: 'Claude Opus vs GPT-4o', ids: ['claude-opus-4-6', 'gpt-4o'] },
  { label: 'Claude Sonnet vs GPT-4o-mini', ids: ['claude-sonnet-4-6', 'gpt-4o-mini'] },
  { label: 'Gemini 2.5 Pro vs Claude Opus', ids: ['gemini-2-5-pro', 'claude-opus-4-6'] },
  { label: 'Llama 4 vs Mistral Large', ids: ['llama-4-scout', 'mistral-large'] },
];

function ModelSelector({
  allModels,
  selectedId,
  onSelect,
  onRemove,
  removable,
}: {
  allModels: FlatModel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove?: () => void;
  removable?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const selected = allModels.find((m) => m.id === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-bg-secondary border border-border rounded-xl text-sm hover:border-accent-primary/50 transition-colors"
      >
        <span className={selected ? 'text-text-primary font-medium' : 'text-text-muted'}>
          {selected ? `${selected.name} (${selected.provider})` : 'Select a model...'}
        </span>
        <div className="flex items-center gap-1">
          {removable && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
              className="p-0.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-text-muted" />
        </div>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-96 overflow-y-auto bg-bg-secondary border border-border rounded-xl shadow-lg">
          {allModels.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onSelect(model.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-bg-tertiary transition-colors ${
                model.id === selectedId
                  ? 'text-accent-primary font-medium'
                  : 'text-text-primary'
              }`}
            >
              <span>{model.name}</span>
              <span className="text-text-muted ml-2 text-xs">{model.provider}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const [pricingData, setPricingData] = useState<PricingData>(fallbackPricingData as PricingData);
  const [selectedIds, setSelectedIds] = useState<(string | null)[]>(['claude-opus-4-6', 'gpt-4o']);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/models')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && data.providers?.length) {
          setPricingData({
            lastUpdated: data.lastUpdated || '',
            providers: data.providers,
          });
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

  const selectedModels = selectedIds
    .map((id) => (id ? allModels.find((m) => m.id === id) ?? null : null))
    .filter((m): m is FlatModel => m !== null);

  function setModelAt(index: number, id: string) {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[index] = id;
      return next;
    });
  }

  function removeSlot(index: number) {
    setSelectedIds((prev) => prev.filter((_, i) => i !== index));
  }

  function addSlot() {
    if (selectedIds.length < 3) {
      setSelectedIds((prev) => [...prev, null]);
    }
  }

  function applyComparison(ids: string[]) {
    const slots: (string | null)[] = [...ids];
    while (slots.length < 2) slots.push(null);
    setSelectedIds(slots);
  }

  // Determine winners for highlighting
  const cheapestInput =
    selectedModels.length >= 2
      ? Math.min(...selectedModels.filter((m) => m.inputPrice > 0).map((m) => m.inputPrice))
      : null;
  const cheapestOutput =
    selectedModels.length >= 2
      ? Math.min(...selectedModels.filter((m) => m.outputPrice > 0).map((m) => m.outputPrice))
      : null;
  const largestContext =
    selectedModels.length >= 2 ? Math.max(...selectedModels.map((m) => m.contextWindow)) : null;

  const rows: {
    label: string;
    getValue: (m: FlatModel) => string;
    isWinner: (m: FlatModel) => boolean;
    isTags?: boolean;
    getTags?: (m: FlatModel) => string[];
  }[] = [
    {
      label: 'Provider',
      getValue: (m) => m.provider,
      isWinner: () => false,
    },
    {
      label: 'Input Price (per 1M tokens)',
      getValue: (m) => formatPrice(m.inputPrice),
      isWinner: (m) =>
        m.inputPrice === 0
          ? true
          : cheapestInput !== null && m.inputPrice === cheapestInput,
    },
    {
      label: 'Output Price (per 1M tokens)',
      getValue: (m) => formatPrice(m.outputPrice),
      isWinner: (m) =>
        m.outputPrice === 0
          ? true
          : cheapestOutput !== null && m.outputPrice === cheapestOutput,
    },
    {
      label: 'Context Window',
      getValue: (m) => formatContext(m.contextWindow),
      isWinner: (m) => largestContext !== null && m.contextWindow === largestContext,
    },
    {
      label: 'Released',
      getValue: (m) => m.released,
      isWinner: () => false,
    },
    {
      label: 'Capabilities',
      getValue: () => '',
      isWinner: () => false,
      isTags: true,
      getTags: (m) => m.capabilities,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Cpu className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Compare AI Models</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl">
          Side-by-side comparison of pricing, capabilities, and specs.
        </p>
      </div>

      {/* Editorial Intro */}
      <div className="max-w-4xl mb-10 text-text-secondary leading-relaxed space-y-4">
        <p>
          Choosing between Claude, GPT-4, and Gemini isn&apos;t obvious. They&apos;re all excellent models, but they have different strengths, different pricing, and different deployment options. Claude excels at nuanced reasoning and long-context analysis. GPT-4 dominates at code generation and multimodal understanding. Gemini has the longest context window available. The question is: which one makes sense for your use case and your budget?
        </p>
        <p>
          Use this comparison tool to evaluate models across the dimensions that matter: pricing (input and output token costs), context window (how much text you can process at once), release date, and capabilities (coding, vision, function calling, fine-tuning). Context window is often overlooked but critical. A model that costs half as much but has a 4K context window isn&apos;t useful if your documents are 20K tokens. Benchmarks tell you how smart a model is; we show you what it costs and what it can do.
        </p>
        <p>
          The pricing vs performance tradeoff is central to AI economics. The newest flagship models offer marginal improvements over previous generations for 2-3x the cost. Open-source models like Llama are free but require self-hosting infrastructure. Small models like Claude Haiku or GPT-4o-mini are dramatically cheaper and often sufficient for non-critical tasks. See our <Link href="/ai-api-pricing-guide" className="text-accent-primary hover:underline">pricing guide</Link> for deeper analysis and cost optimization strategies, and <Link href="/benchmarks" className="text-accent-primary hover:underline">benchmarks</Link> to understand raw capability.
        </p>
      </div>

      {/* Model Selectors */}
      <section className="mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {selectedIds.map((id, index) => (
            <ModelSelector
              key={index}
              allModels={allModels}
              selectedId={id}
              onSelect={(newId) => setModelAt(index, newId)}
              onRemove={() => removeSlot(index)}
              removable={selectedIds.length > 2}
            />
          ))}
        </div>
        {selectedIds.length < 3 && (
          <button
            onClick={addSlot}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-secondary border border-border transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add model
          </button>
        )}
      </section>

      {/* Comparison Table */}
      {selectedModels.length >= 2 ? (
        <section className="mb-14">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-tertiary">
                  <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider w-48">
                    Spec
                  </th>
                  {selectedModels.map((model) => (
                    <th
                      key={model.id}
                      className="px-4 py-3 text-xs font-semibold text-text-primary uppercase tracking-wider"
                    >
                      {model.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.label} className="bg-bg-secondary hover:bg-bg-tertiary/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-secondary font-medium">{row.label}</td>
                    {selectedModels.map((model) => (
                      <td key={model.id} className="px-4 py-3 text-sm">
                        {row.isTags && row.getTags ? (
                          <div className="flex flex-wrap gap-1.5">
                            {row.getTags(model).map((cap) => (
                              <span
                                key={cap}
                                className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary border border-border"
                              >
                                {cap}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span
                            className={
                              row.isWinner(model) ? 'text-accent-green font-medium' : 'text-text-secondary'
                            }
                          >
                            {row.getValue(model)}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="mb-14 bg-bg-secondary border border-border rounded-xl p-10 text-center">
          <p className="text-text-muted text-sm">
            Select at least two models above to see the comparison table.
          </p>
        </div>
      )}

      {/* Popular Comparisons */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-text-primary mb-6">Popular Comparisons</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {popularComparisons.map((comp) => (
            <button
              key={comp.label}
              onClick={() => applyComparison(comp.ids)}
              className="bg-bg-secondary border border-border rounded-xl p-5 hover:shadow-glow transition-shadow text-left group"
            >
              <div className="flex items-center justify-between">
                <span className="text-text-primary font-semibold text-sm group-hover:text-accent-primary transition-colors">
                  {comp.label}
                </span>
                <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-primary transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
