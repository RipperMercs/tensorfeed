// Maps TensorFeed's live public endpoints onto the design's Feed/Item
// contract. Honesty rules hold: a row only appears when the real status
// feed has it; latency is the real probed p95 or null (never invented);
// state is derived only from real signals (operational status + ok_pct).
// The 16-bar sparkline is a deterministic per-id shape: the design ships
// this as the sanctioned default (README section 7) since the free
// endpoints do not expose a 16-sample history.

import type { Feed, Item, ItemState } from './types';

export const POLL_MS = 30_000;
const STATUS_URL = 'https://tensorfeed.ai/api/status/summary';
const PROBE_URL = 'https://tensorfeed.ai/api/probe/latest';
const DETAIL_BASE =
  'https://tensorfeed.ai/status?utm_source=widget&utm_medium=embed&utm_campaign=detail';

interface RawService {
  name: string;
  provider?: string;
  status: string;
}
interface ProbeAggregate {
  provider: string;
  ok_pct: number;
  total: { p95: number | null };
  ttfb: { p95: number | null };
  last_probe_at: string | null;
}

interface CatalogEntry {
  id: string;
  name: string;
  vendor: string;
  match: string[]; // substrings tested against status name + provider
  probe: string | null; // /api/probe/latest provider key, or null
}

// Frontier model labs -> LLMs tab.
const LLM_CATALOG: ReadonlyArray<CatalogEntry> = [
  { id: 'anthropic', name: 'Claude', vendor: 'Anthropic', match: ['claude', 'anthropic'], probe: 'anthropic' },
  { id: 'openai', name: 'OpenAI', vendor: 'OpenAI', match: ['openai'], probe: 'openai' },
  { id: 'google', name: 'Google Gemini', vendor: 'Google', match: ['gemini', 'google'], probe: 'google' },
  { id: 'mistral', name: 'Mistral', vendor: 'Mistral', match: ['mistral'], probe: 'mistral' },
  { id: 'cohere', name: 'Cohere', vendor: 'Cohere', match: ['cohere'], probe: 'cohere' },
  { id: 'meta', name: 'Llama', vendor: 'Meta', match: ['llama', 'meta'], probe: null },
  { id: 'deepseek', name: 'DeepSeek', vendor: 'DeepSeek', match: ['deepseek'], probe: null },
  { id: 'groq', name: 'Groq', vendor: 'Groq', match: ['groq'], probe: null },
  { id: 'perplexity', name: 'Perplexity', vendor: 'Perplexity', match: ['perplexity'], probe: null },
];

// Cloud LLM gateways / infrastructure -> Services tab.
const SERVICE_CATALOG: ReadonlyArray<CatalogEntry> = [
  { id: 'bedrock', name: 'AWS Bedrock', vendor: 'AWS', match: ['bedrock', 'aws'], probe: null },
  { id: 'azure-openai', name: 'Azure OpenAI', vendor: 'Microsoft', match: ['azure'], probe: null },
  { id: 'huggingface', name: 'Hugging Face', vendor: 'Hugging Face', match: ['hugging'], probe: null },
  { id: 'replicate', name: 'Replicate', vendor: 'Replicate', match: ['replicate'], probe: null },
  { id: 'copilot', name: 'GitHub Copilot', vendor: 'GitHub', match: ['copilot', 'github'], probe: null },
  { id: 'openrouter', name: 'OpenRouter', vendor: 'OpenRouter', match: ['openrouter'], probe: null },
];

function normalizeStatus(s: string): 'ok' | 'warn' | 'down' | 'unknown' {
  const v = (s || '').toLowerCase();
  if (v === 'down' || v === 'outage' || v === 'major') return 'down';
  if (v === 'degraded' || v === 'partial' || v === 'warn') return 'warn';
  if (v === 'operational' || v === 'ok') return 'ok';
  return 'unknown';
}

// Derive state from real signals only. downgraded is a routing-layer
// signal TF does not publish, so it is never inferred (README section
// 12 says collapse it; we simply never produce it).
function deriveState(
  matched: boolean,
  status: 'ok' | 'warn' | 'down' | 'unknown',
  okPct: number | null,
): ItemState {
  if (!matched && okPct == null) return 'offline';
  if (status === 'down' || (okPct != null && okPct < 0.5)) return 'critical';
  if (status === 'warn' || (okPct != null && okPct < 0.95)) return 'degraded';
  if (status === 'unknown' && okPct == null) return 'offline';
  return 'nominal';
}

// Deterministic 16-bar [0,1] shape seeded by id, biased by state, so the
// sparkline does not flicker between polls. Mirrors the prototype.
function makeHistory(id: string, state: ItemState): number[] {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) % 233280;
  const base =
    state === 'critical' ? 0.18 : state === 'offline' ? 0.04 : state === 'degraded' ? 0.55 : state === 'downgraded' ? 0.45 : 0.7;
  const out: number[] = [];
  for (let i = 0; i < 16; i++) {
    s = (s * 9301 + 49297) % 233280;
    const wobble = (s / 233280) * 0.45;
    out.push(Math.max(0.04, base + wobble - 0.2));
  }
  return out;
}

function agoSeconds(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / 1000);
}

function buildItems(
  catalog: ReadonlyArray<CatalogEntry>,
  services: RawService[],
  probes: ProbeAggregate[],
): Item[] {
  const items: Item[] = [];
  for (const c of catalog) {
    let svc: RawService | undefined;
    for (const s of services) {
      const lc = (s.name || '').toLowerCase();
      const pv = (s.provider || '').toLowerCase();
      if (c.match.some((m) => lc.includes(m) || pv.includes(m))) {
        svc = s;
        break;
      }
    }
    const probe = c.probe ? probes.find((p) => p.provider === c.probe) : undefined;
    // Only render rows we actually monitor. Showing an un-monitored
    // provider as "offline" would falsely imply we track it and it is
    // down, so exclude when there is neither status nor probe data.
    if (!svc && !probe) continue;

    const status = svc ? normalizeStatus(svc.status) : 'unknown';
    const okPct = probe ? probe.ok_pct : null;
    const state = deriveState(Boolean(svc), status, okPct);
    const latencyMs = probe ? (probe.total?.p95 ?? probe.ttfb?.p95 ?? null) : null;
    items.push({
      id: c.id,
      name: c.name,
      vendor: c.vendor,
      state,
      latencyMs: latencyMs != null ? Math.round(latencyMs) : null,
      lastCheckedAgoS: probe ? agoSeconds(probe.last_probe_at) : null,
      history: makeHistory(c.id, state),
      detailHref: `${DETAIL_BASE}#${c.id}`,
    });
  }
  return items;
}

export function buildFeed(statusJson: unknown, probeJson: unknown): Feed {
  const services: RawService[] =
    statusJson && typeof statusJson === 'object' && Array.isArray((statusJson as { services?: unknown }).services)
      ? ((statusJson as { services: RawService[] }).services)
      : [];
  const probes: ProbeAggregate[] =
    probeJson &&
    typeof probeJson === 'object' &&
    (probeJson as { summary?: { providers?: unknown } }).summary &&
    Array.isArray((probeJson as { summary: { providers?: unknown } }).summary.providers)
      ? ((probeJson as { summary: { providers: ProbeAggregate[] } }).summary.providers)
      : [];
  return {
    pollIntervalMs: POLL_MS,
    generatedAt: new Date().toISOString(),
    llms: buildItems(LLM_CATALOG, services, probes),
    services: buildItems(SERVICE_CATALOG, services, probes),
  };
}

export async function fetchFeed(): Promise<Feed | null> {
  try {
    const [statusRes, probeRes] = await Promise.all([
      fetch(STATUS_URL, { cache: 'no-store' }),
      fetch(PROBE_URL, { cache: 'no-store' }).catch(() => null),
    ]);
    if (!statusRes.ok) return null;
    const statusJson = await statusRes.json();
    const probeJson = probeRes && probeRes.ok ? await probeRes.json() : null;
    return buildFeed(statusJson, probeJson);
  } catch {
    return null;
  }
}
