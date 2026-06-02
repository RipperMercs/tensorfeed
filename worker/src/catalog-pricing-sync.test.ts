import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BASELINE_PRICING } from './catalog';

/**
 * Coverage guard for the pricing baseline (the second instance of the
 * mirror-drift trap). data/pricing.json is the canonical editorial source;
 * BASELINE_PRICING is the worker mirror that seeds the models KV. On 2026-06-01
 * the canonical file had DeepSeek, Alibaba, and NVIDIA while BASELINE_PRICING
 * still had only six providers, so /api/models silently dropped them for weeks.
 *
 * This is a COVERAGE check, not deep-equality: the live LiteLLM merge revises
 * prices at runtime, so exact price equality is not the invariant. The invariant
 * is that every provider id and model id in the canonical file is present in the
 * baseline, so the worker can never serve a narrower catalog than canonical.
 */
function loadCanonical(): { providers: { id: string; models: { id: string }[] }[] } {
  for (const rel of ['../data/pricing.json', 'data/pricing.json', '../../data/pricing.json']) {
    const abs = resolve(process.cwd(), rel);
    if (existsSync(abs)) return JSON.parse(readFileSync(abs, 'utf8'));
  }
  throw new Error(`data/pricing.json not found from cwd ${process.cwd()}`);
}

describe('BASELINE_PRICING covers every provider and model in data/pricing.json', () => {
  const canonical = loadCanonical();
  const baseProviders = new Map(
    BASELINE_PRICING.providers.map((p) => [p.id, new Set(p.models.map((m) => m.id))]),
  );

  it('includes every canonical provider id', () => {
    const missing = canonical.providers.filter((p) => !baseProviders.has(p.id)).map((p) => p.id);
    expect(missing).toEqual([]);
  });

  it('includes every canonical model id under its provider', () => {
    const missing: string[] = [];
    for (const p of canonical.providers) {
      const baseModels = baseProviders.get(p.id);
      if (!baseModels) continue; // provider-level miss already covered above
      for (const m of p.models) if (!baseModels.has(m.id)) missing.push(`${p.id}/${m.id}`);
    }
    expect(missing).toEqual([]);
  });
});
