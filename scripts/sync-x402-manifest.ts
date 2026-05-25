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

interface ResourceInfo {
  url: string;
  description?: string;
  mimeType?: string;
}

interface ManifestItem {
  // Per canonical x402 v2 PaymentRequiredV2Schema, `resource` is an object
  // {url, description?, mimeType?}, NOT a bare string. Our runtime 402 response
  // already emits the object form; this script now emits it for the static
  // manifest too. Audited 2026-05-24: the bare-string form was the root cause
  // of x402scan's `parseResponse: Missing input schema` rejection (their
  // server validates against the canonical zod schema). Aligning the static
  // manifest with what the runtime already does eliminates the gap.
  resource: ResourceInfo;
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

// ── Per-param manifest split ───────────────────────────────────────
//
// BlockRun ships ~100 manifest resources by listing per-ticker entries
// (/usstock/price/AAPL, /usstock/price/TSLA...) as separate manifest
// items even though they're served by one parameterized handler.
// agentic.market's manifest crawler treats each one as its own catalog
// entry. Net result: BlockRun shows 35+ listings, TF shows 1.
//
// We replicate that pattern for our path-param Wave 14 pilots. Each
// concrete entry below becomes its own ManifestItem with a fully-
// qualified URL (no `:id` template literal). Same extensions.bazaar
// config as the parent template (the routeTemplate field still tells
// CDP that all concrete instances consolidate into one catalog row).
//
// Picked instances reflect what an agent is actually likely to query:
// canonical famous CVEs for the security cleaners, top-tracked model
// vendors for the OpenRouter cleaner, top frontier-lab providers for
// the provider digest.

interface SplitInstance {
  /** The fully-qualified concrete path (no `:id` template). */
  concretePath: string;
  /** Display name for the manifest item. */
  name: string;
  /** Category (matches PILOT_METADATA naming). */
  category: string;
}

// Top 10 famous CVEs that agents are most likely to look up. Used by
// all four single-CVE cleaners (clean/cve, clean/kev, clean/epss,
// security/verified).
const TOP_CVES: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'CVE-2021-44228', label: 'Log4Shell' },
  { id: 'CVE-2024-3094', label: 'xz-utils backdoor' },
  { id: 'CVE-2017-0144', label: 'EternalBlue' },
  { id: 'CVE-2014-0160', label: 'Heartbleed' },
  { id: 'CVE-2021-34527', label: 'PrintNightmare' },
  { id: 'CVE-2019-0708', label: 'BlueKeep' },
  { id: 'CVE-2021-26855', label: 'ProxyLogon' },
  { id: 'CVE-2020-1472', label: 'Zerologon' },
  { id: 'CVE-2022-22965', label: 'Spring4Shell' },
  { id: 'CVE-2021-26084', label: 'Confluence OGNL' },
];

const TOP_PROVIDERS: ReadonlyArray<{ slug: string; label: string }> = [
  { slug: 'anthropic', label: 'Anthropic' },
  { slug: 'openai', label: 'OpenAI' },
  { slug: 'google', label: 'Google' },
  { slug: 'meta', label: 'Meta' },
  { slug: 'mistral', label: 'Mistral' },
  { slug: 'cohere', label: 'Cohere' },
  { slug: 'deepseek', label: 'DeepSeek' },
  { slug: 'xai', label: 'xAI' },
  { slug: 'microsoft', label: 'Microsoft' },
  { slug: 'amazon', label: 'Amazon Bedrock' },
];

const TOP_OPENROUTER_MODELS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'anthropic/claude-opus-4-7', label: 'Claude Opus 4.7' },
  { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5' },
  { id: 'openai/gpt-5-5', label: 'GPT-5.5' },
  { id: 'openai/gpt-5-5-mini', label: 'GPT-5.5 Mini' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'deepseek/deepseek-chat-v3.1', label: 'DeepSeek V3.1' },
  { id: 'meta-llama/llama-3.3-70b', label: 'Llama 3.3 70B' },
  { id: 'mistralai/mistral-large', label: 'Mistral Large' },
  { id: 'x-ai/grok-3', label: 'Grok 3' },
];

function buildSplitInstances(): SplitInstance[] {
  const out: SplitInstance[] = [];
  // 4 single-CVE cleaners x 10 CVEs = 40 entries
  const cveTemplates: ReadonlyArray<{ template: string; nameStem: string; category: string }> = [
    { template: '/api/premium/clean/cve/',         nameStem: 'CVE record (LLM-ready)',      category: 'ai-cve-cleaner-mitre' },
    { template: '/api/premium/clean/kev/',         nameStem: 'KEV entry (LLM-ready)',       category: 'ai-cve-cleaner-kev' },
    { template: '/api/premium/clean/epss/',        nameStem: 'EPSS score (LLM-ready)',      category: 'ai-cve-cleaner-epss' },
    { template: '/api/premium/security/verified/', nameStem: 'Cross-database CVE verified', category: 'ai-cve-corroborated' },
  ];
  for (const tmpl of cveTemplates) {
    for (const cve of TOP_CVES) {
      out.push({
        concretePath: `${tmpl.template}${cve.id}`,
        name: `${tmpl.nameStem}: ${cve.id} (${cve.label})`,
        category: tmpl.category,
      });
    }
  }
  // 10 providers
  for (const p of TOP_PROVIDERS) {
    out.push({
      concretePath: `/api/premium/providers/${p.slug}`,
      name: `Provider digest: ${p.label}`,
      category: 'ai-provider-digest',
    });
  }
  // 10 OpenRouter models. Path needs URL-encoded slash.
  for (const m of TOP_OPENROUTER_MODELS) {
    out.push({
      concretePath: `/api/premium/clean/openrouter/${encodeURIComponent(m.id)}`,
      name: `OpenRouter model card: ${m.label}`,
      category: 'ai-openrouter-model-card',
    });
  }
  return out;
}

/**
 * Resolve a concrete split path back to its parent template pilot path
 * so we can read the parent's BazaarPilotConfig (description + extensions).
 */
function resolveSplitParent(concretePath: string): string | null {
  if (concretePath.startsWith('/api/premium/clean/cve/'))         return '/api/premium/clean/cve/:id';
  if (concretePath.startsWith('/api/premium/clean/kev/'))         return '/api/premium/clean/kev/:id';
  if (concretePath.startsWith('/api/premium/clean/epss/'))        return '/api/premium/clean/epss/:id';
  if (concretePath.startsWith('/api/premium/security/verified/')) return '/api/premium/security/verified/:id';
  if (concretePath.startsWith('/api/premium/clean/openrouter/'))  return '/api/premium/clean/openrouter/:model_id';
  if (concretePath.startsWith('/api/premium/providers/'))         return '/api/premium/providers/:name';
  return null;
}

// ── Build a manifest item from a pilot path + config ──────────────

function buildItem(pilotPath: string, pilot: BazaarPilotConfig, meta: PilotMeta, today: string): ManifestItem {
  const amount = String(meta.credits * CENTS_PER_CREDIT * Math.pow(10, USDC_DECIMALS - 2));
  return {
    resource: {
      url: `${SITE_URL}${pilotPath}`,
      description: pilot.description,
      mimeType: 'application/json',
    },
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

  // Migration: rewrite any string-form `resource` into the canonical object
  // {url, description, mimeType} form per x402 v2. This eliminates the
  // structural drift between this static manifest and the Worker's runtime
  // 402 challenge response, and unblocks x402scan registration. Existing
  // object-form resources pass through unchanged. Idempotent.
  let migrated = 0;
  for (const item of manifest.items) {
    const r = item.resource as unknown;
    if (typeof r === 'string') {
      item.resource = {
        url: r,
        description: item.metadata?.description ?? item.metadata?.name ?? '',
        mimeType: 'application/json',
      };
      migrated++;
    }
  }
  if (migrated > 0) {
    console.log(`[sync-x402-manifest] resource-shape migration: ${migrated} string-form items rewritten to canonical object form`);
  }

  const existingByPath = new Map<string, number>();
  manifest.items.forEach((item, idx) => {
    try {
      // Post-migration, item.resource is always the object form.
      const urlStr = typeof item.resource === 'string' ? item.resource : item.resource.url;
      const u = new URL(urlStr);
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

  // ── Per-param split: append concrete instances for path-param pilots ──
  // BlockRun-style manifest inflation (5-10x catalog listings). Each
  // SplitInstance becomes its own ManifestItem with a fully-qualified URL
  // and inherits its parent template's BazaarPilotConfig. Idempotent: skips
  // any concrete path already in the manifest.
  let splitAdded = 0;
  let splitRefreshed = 0;
  for (const inst of buildSplitInstances()) {
    const parentTemplate = resolveSplitParent(inst.concretePath);
    if (!parentTemplate) continue;
    const parentPilot = getBazaarPilotConfig(parentTemplate);
    if (!parentPilot) continue;
    const meta: PilotMeta = {
      name: inst.name,
      category: inst.category,
      credits: 1,
      method: 'GET',
    };
    const existingIdx = existingByPath.get(inst.concretePath);
    if (existingIdx !== undefined) {
      const item = manifest.items[existingIdx];
      const before = JSON.stringify(item.extensions ?? null) + '|' + (item.metadata?.description ?? '');
      item.extensions = parentPilot.extension;
      if (item.metadata) {
        item.metadata.description = parentPilot.description;
        item.metadata.name = inst.name;
        item.metadata.category = inst.category;
      }
      const after = JSON.stringify(item.extensions) + '|' + item.metadata.description;
      if (before !== after) {
        item.lastUpdated = today;
        splitRefreshed++;
      }
    } else {
      const newItem = buildItem(inst.concretePath, parentPilot, meta, today);
      walkAndAssertLatin1(newItem, `split-item ${inst.concretePath}`);
      manifest.items.push(newItem);
      splitAdded++;
    }
  }

  // Bump the top-level lastUpdated only if anything actually changed.
  if (added > 0 || refreshed > 0 || splitAdded > 0 || splitRefreshed > 0) {
    manifest.lastUpdated = today;
  }

  // Defensive Latin1 sweep over every item we might emit (catches em-dash regression).
  walkAndAssertLatin1(manifest.items, 'manifest.items');

  const out = JSON.stringify(manifest, null, 2) + '\n';
  fs.writeFileSync(MANIFEST_PATH, out, 'utf-8');

  console.log(`[sync-x402-manifest] items: ${manifest.items.length} total, +${added} new pilots, ${refreshed} refreshed pilots, +${splitAdded} new splits, ${splitRefreshed} refreshed splits`);
}

main();
