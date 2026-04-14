'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import fallbackData from '@/../data/pricing.json';

interface Model {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow: number;
  capabilities: string[];
}

interface Provider {
  id: string;
  name: string;
  models: Model[];
}

interface PricingData {
  providers: Provider[];
  pricingNotes: { disclaimer: string };
}

function formatContext(ctx: number): string {
  return ctx >= 1000000
    ? `${(ctx / 1000000).toFixed(0)}M`
    : `${(ctx / 1000).toFixed(0)}K`;
}

function formatPrice(price: number): string {
  return price === 0 ? 'Free*' : `$${price.toFixed(2)}`;
}

// Shared pricing data context to avoid duplicate fetches
const PricingContext = createContext<PricingData | null>(null);

function usePricingData(): PricingData {
  const ctx = useContext(PricingContext);
  if (ctx) return ctx;
  // Fallback for standalone usage (shouldn't happen with PricingProvider)
  return fallbackData as PricingData;
}

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<PricingData>(fallbackData as PricingData);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/models')
      .then(res => res.ok ? res.json() : null)
      .then((api: { ok?: boolean; providers?: Provider[]; pricingNotes?: PricingData['pricingNotes'] } | null) => {
        if (api?.ok && api.providers?.length) {
          setData({ providers: api.providers, pricingNotes: api.pricingNotes || data.pricingNotes });
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PricingContext.Provider value={data}>
      {children}
    </PricingContext.Provider>
  );
}

export function PricingOverviewTable() {
  const data = usePricingData();

  return (
    <>
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
            {data.providers.flatMap((provider) =>
              provider.models.map((model) => (
                <tr key={model.id} className="bg-bg-secondary">
                  <td className="p-3 text-text-primary font-medium">{provider.name}</td>
                  <td className="p-3 text-text-secondary">{model.name}</td>
                  <td className="p-3 text-right text-text-secondary">{formatPrice(model.inputPrice)}</td>
                  <td className="p-3 text-right text-text-secondary">{formatPrice(model.outputPrice)}</td>
                  <td className="p-3 text-right text-text-muted">{formatContext(model.contextWindow)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-text-muted text-sm mt-3">
        * Open source models are free to self-host. Hosted API pricing varies by provider
        (e.g., Together, Fireworks, Groq). {data.pricingNotes.disclaimer}
      </p>
    </>
  );
}

export function ProviderDetailsTables() {
  const data = usePricingData();

  return (
    <>
      {data.providers.map((provider) => (
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
                    <td className="py-2 text-right text-text-secondary">{formatPrice(model.inputPrice)}</td>
                    <td className="py-2 text-right text-text-secondary">{formatPrice(model.outputPrice)}</td>
                    <td className="py-2 text-right text-text-muted">{formatContext(model.contextWindow)}</td>
                    <td className="py-2 pl-4 text-text-muted">{model.capabilities.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
