/**
 * sync-x402-manifest.ts
 *
 * Build-time generator that keeps `public/.well-known/x402.json` in sync with
 * the Bazaar pilot roster declared in `worker/src/bazaar-pilots.ts`.
 *
 * Pattern:
 *   1. Read the existing manifest file (preserves hand-authored items for
 *      endpoints that aren't Bazaar pilots and rich metadata blocks).
 *   2. Walk BAZAAR_PILOTS from the worker source.
 *   3. For every pilot path NOT already in `items`, append a fresh item with:
 *        - resource URL, method, x402Version, accepts block (priced from
 *          PILOT_PRICING below), lastUpdated, metadata, extensions.bazaar
 *   4. For pilots already present, refresh `extensions.bazaar` from the
 *      pilot config (single source of truth for the bazaar block) but leave
 *      the rest of the existing item untouched.
 *   5. Bump the top-level `lastUpdated`.
 *   6. Pretty-print and write back.
 *
 * Sources of truth:
 *   - bazaar-pilots.ts → description + bazaar extension blob
 *   - PILOT_METADATA below → name, category, credits, method (per pilot path)
 *   - Existing items in x402.json → all non-Bazaar priced endpoints + any
 *     hand-curated overrides that pre-date this script
 *
 * Hooked into prebuild after fetch-feeds + generate-llms-full so every
 * deploy emits a current manifest. Idempotent: running twice produces the
 * same output if BAZAAR_PILOTS is unchanged.
 *
 * Per the no-em-dash rule (and the 2026-05-24 btoa() crash this same rule
 * caused on apis-guru/ai-feed), this script is Latin1-clean. Strings emitted
 * into the manifest are validated before write.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  bazaarPilotPaths,
  getBazaarPilotConfig,
  type BazaarPilotConfig,
} from '../worker/src/bazaar-pilots';

// ── Constants ──────────────────────────────────────────────────────

const MANIFEST_PATH = path.resolve(__dirname, '../public/.well-known/x402.json');
const SITE_URL = 'https://tensorfeed.ai';
const USDC_BASE_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PAYMENT_WALLET = '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1';
const CENTS_PER_CREDIT = 2; // 1 credit = $0.02 USDC = 20000 atomic units (6 decimals)
const USDC_DECIMALS = 6;

// ── Per-pilot metadata (path → display info) ───────────────────────
//
// New Bazaar pilots that weren't already in x402.json get their item
// constructed from these defaults. Edit when adding a new pilot. The
// pilot's `description` comes from bazaar-pilots.ts itself.

interface PilotMeta {
  name: string;
  category: string;
  credits: number;
  method: 'GET' | 'POST';
}

const PILOT_METADATA: Record<string, PilotMeta> = {
  '/api/premium/whats-new':                          { name: "What's new",                            category: 'ai-agent-brief',          credits: 1, method: 'GET' },
  '/api/premium/routing':                            { name: 'Premium routing recommendations',       category: 'ai-model-routing',        credits: 1, method: 'GET' },
  '/api/premium/compare/models':                     { name: 'Compare models',                        category: 'ai-model-comparison',     credits: 1, method: 'GET' },
  '/api/premium/cost/projection':                    { name: 'Cost projection',                       category: 'ai-cost-projection',      credits: 1, method: 'GET' },
  '/api/premium/agents/directory':                   { name: 'Enriched agents directory',             category: 'ai-agents-directory',     credits: 1, method: 'GET' },
  '/api/premium/funding/exposure':                   { name: 'AI funding exposure metrics',           category: 'ai-funding-exposure',     credits: 3, method: 'GET' },
  '/api/premium/packages/pypi/momentum':             { name: 'PyPI packages momentum',                category: 'package-ecosystem-momentum', credits: 1, method: 'GET' },
  '/api/premium/research/velocity':                  { name: 'AI research velocity',                  category: 'research-momentum',       credits: 1, method: 'GET' },
  '/api/premium/research/authors':                   { name: 'Top AI authors',                        category: 'research-authors',        credits: 1, method: 'GET' },
  '/api/premium/research/citation-velocity':         { name: 'AI citation velocity',                  category: 'research-citation-velocity', credits: 1, method: 'GET' },
  '/api/premium/research/milestones':                { name: 'arXiv milestone candidates',            category: 'research-milestones',     credits: 1, method: 'GET' },
  '/api/premium/research/emerging-keywords':         { name: 'arXiv emerging keywords',               category: 'research-emerging-keywords', credits: 1, method: 'GET' },
  '/api/premium/economy/recession-watch':            { name: 'Recession watch',                       category: 'macro-recession-signal',  credits: 1, method: 'GET' },
  '/api/premium/policy/timeline':                    { name: 'AI policy timeline',                    category: 'ai-policy-temporal',      credits: 1, method: 'GET' },
  '/api/premium/apis-guru/ai-feed':                  { name: 'APIs.guru AI feed',                     category: 'ai-api-directory',        credits: 1, method: 'GET' },
  '/api/premium/model-deprecations/timeline':        { name: 'Model deprecations timeline',           category: 'ai-model-lifecycle',      credits: 1, method: 'GET' },
  '/api/premium/inference-providers/arbitrage':      { name: 'Inference-provider arbitrage',          category: 'ai-inference-arbitrage',  credits: 1, method: 'GET' },
  '/api/premium/ai-safety/incidents/exposure':       { name: 'AI safety incidents exposure',          category: 'ai-safety-exposure',      credits: 1, method: 'GET' },
  '/api/premium/ai-safety/packages/security/radar':  { name: 'AI-package security radar',             category: 'ai-package-security',     credits: 1, method: 'GET' },
  '/api/premium/packages/releases/velocity':         { name: 'AI-package release velocity',           category: 'package-release-velocity', credits: 1, method: 'GET' },
  '/api/premium/ai-velocity':                        { name: 'AI velocity (federation cross-call)',   category: 'ai-velocity-cross-surface', credits: 1, method: 'GET' },
  '/api/premium/ai-crypto-pulse':                    { name: 'AI-thesis crypto pulse',                category: 'ai-crypto-funding',       credits: 1, method: 'GET' },
  '/api/premium/coding-harnesses/weekly-deltas':     { name: 'Coding-harness weekly deltas',          category: 'coding-harness-deltas',   credits: 1, method: 'GET' },
  '/api/premium/news/action-cards':                  { name: 'News action cards (Haiku-derived)',     category: 'news-action-cards',       credits: 1, method: 'GET' },
  '/api/premium/status/incidents/triage':            { name: 'Status incident triage (Haiku-derived)', category: 'status-incident-triage', credits: 1, method: 'GET' },
};

// ── Latin1 hygiene ─────────────────────────────────────────────────
//
// Per [[feedback_em_dash_crashes_btoa]]: any non-Latin1 char in a Bazaar
// pilot string crashes btoa() in the 402-challenge encoder. Validate every
// string before emit.

function assertLatin1(value: unknown, label: string): void {
  if (typeof value !== 'string') return;
  for (let i = 0; i < value.length; i++) {
    const cp = value.charCodeAt(i);
    if (cp > 255) {
      const sample = value.slice(Math.max(0, i - 30), Math.min(value.length, i + 30));
      throw new Error(
        `[sync-x402-manifest] Non-Latin1 char U+${cp.toString(16).toUpperCase().padStart(4, '0')} at offset ${i} of ${label}\n  context: ${sample}`,
      );
    }
  }
}

function walkAndAssertLatin1(obj: unknown, label: string): void {
  if (typeof obj === 'string') {
    assertLatin1(obj, label);
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => walkAndAssertLatin1(item, `${label}[${idx}]`));
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      walkAndAssertLatin1(v, `${label}.${k}`);
    }
  }
}

// ── Manifest shape (just enough for type safety) ───────────────────

interface ManifestItem {
  resource: string;
  type: string;
  method: string;
  x402Version: number;
  accepts: Array<Record<string, unknown>>;
  lastUpdated: string;
  metadata: {
    name: string;
    description: string;
    tier: number;
    credits: number;
    category: string;
    [k: string]: unknown;
  };
  extensions?: Record<string, unknown>;
}

interface Manifest {
  x402Version: number;
  site: string;
  publisher: Record<string, unknown>;
  payment: Record<string, unknown>;
  items: ManifestItem[];
  freeEndpoints?: Array<Record<string, unknown>>;
  sdks?: Array<Record<string, unknown>>;
  lastUpdated: string;
  [k: string]: unknown;
}

// ── Build a manifest item from a pilot path + config ──────────────

function buildItem(pilotPath: string, pilot: BazaarPilotConfig, meta: PilotMeta, today: string): ManifestItem {
  const amount = String(meta.credits * CENTS_PER_CREDIT * Math.pow(10, USDC_DECIMALS - 2));
  return {
    resource: `${SITE_URL}${pilotPath}`,
    type: 'http',
    method: meta.method,
    x402Version: 2,
    accepts: [
      {
        scheme: 'exact',
        network: 'eip155:8453',
        amount,
        asset: USDC_BASE_CONTRACT,
        payTo: PAYMENT_WALLET,
        maxTimeoutSeconds: 60,
        extra: { name: 'USD Coin', version: '2' },
      },
    ],
    lastUpdated: today,
    metadata: {
      name: meta.name,
      description: pilot.description,
      tier: 1,
      credits: meta.credits,
      category: meta.category,
    },
    extensions: pilot.extension,
  };
}

// ── Main ───────────────────────────────────────────────────────────

function main(): void {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`[sync-x402-manifest] Manifest not found: ${MANIFEST_PATH}`);
  }
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  const manifest: Manifest = JSON.parse(raw);
  if (!Array.isArray(manifest.items)) {
    throw new Error('[sync-x402-manifest] manifest.items is not an array');
  }

  const today = new Date().toISOString().slice(0, 10) + 'T00:00:00Z';
  const existingByPath = new Map<string, number>();
  manifest.items.forEach((item, idx) => {
    try {
      const u = new URL(item.resource);
      existingByPath.set(u.pathname, idx);
    } catch {
      // Item with non-URL resource — skip indexing
    }
  });

  let added = 0;
  let refreshed = 0;

  for (const pilotPath of bazaarPilotPaths()) {
    const pilot = getBazaarPilotConfig(pilotPath);
    if (!pilot) continue;
    const meta = PILOT_METADATA[pilotPath];
    if (!meta) {
      console.warn(`[sync-x402-manifest] No PILOT_METADATA entry for ${pilotPath}; skipping. Add an entry to PILOT_METADATA in scripts/sync-x402-manifest.ts.`);
      continue;
    }
    const existingIdx = existingByPath.get(pilotPath);
    if (existingIdx !== undefined) {
      // Refresh the bazaar extension block + description so single-source-of-truth
      // updates in bazaar-pilots.ts propagate to the manifest. Leave everything else.
      const item = manifest.items[existingIdx];
      const before = JSON.stringify(item.extensions ?? null) + '|' + (item.metadata?.description ?? '');
      item.extensions = pilot.extension;
      if (item.metadata) {
        item.metadata.description = pilot.description;
      }
      const after = JSON.stringify(item.extensions) + '|' + item.metadata.description;
      if (before !== after) {
        item.lastUpdated = today;
        refreshed++;
      }
    } else {
      const newItem = buildItem(pilotPath, pilot, meta, today);
      walkAndAssertLatin1(newItem, `new-item ${pilotPath}`);
      manifest.items.push(newItem);
      added++;
    }
  }

  // Bump the top-level lastUpdated only if anything actually changed.
  if (added > 0 || refreshed > 0) {
    manifest.lastUpdated = today;
  }

  // Defensive Latin1 sweep over every item we might emit (catches em-dash regression).
  walkAndAssertLatin1(manifest.items, 'manifest.items');

  const out = JSON.stringify(manifest, null, 2) + '\n';
  fs.writeFileSync(MANIFEST_PATH, out, 'utf-8');

  console.log(`[sync-x402-manifest] items: ${manifest.items.length} total, +${added} new, ${refreshed} refreshed (extensions/description from bazaar-pilots.ts)`);
}

main();
