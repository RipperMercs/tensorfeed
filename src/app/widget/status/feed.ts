// Maps TensorFeed's live public endpoints onto the design's Feed/Item
// contract. Coverage is the whole point: the widget renders EVERY
// provider /api/status/summary tracks (no hardcoded catalog), so it
// always mirrors the site's status page and auto-includes anything TF
// adds later. Honesty rules hold: latency is the real probed p95 or
// null (never invented); state is derived from real signals only with
// vendor status authoritative; the 16-bar sparkline is the design's
// sanctioned deterministic default (README section 7).

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

// A service goes in the LLMs tab if its name or provider matches a
// model / LLM-gateway keyword; everything else (voice, image, video,
// other infra) goes in the Services tab. New providers classify
// automatically. The design's LLMs tab is "LLM endpoints", Services is
// "everything else we monitor".
const LLM_KEYWORDS = [
  'claude', 'anthropic', 'openai', 'gpt', 'chatgpt', 'gemini', 'google', 'bard',
  'mistral', 'cohere', 'deepseek', 'llama', 'meta', 'groq', 'perplexity',
  'together', 'fireworks', 'openrouter', 'bedrock', 'azure', 'copilot',
  'hugging', 'replicate', 'qwen', 'grok', 'xai', 'ai21', 'reka', 'nous',
  'databricks', 'inflection', 'nvidia', 'nim', 'sambanova', 'cerebras',
];

// Provider keys present in /api/probe/latest (latency is only measured
// for these). Any service whose name/provider contains one of these
// gets the real p95; the rest show no latency, just real status.
const PROBE_KEYS = ['anthropic', 'openai', 'google', 'mistral', 'cohere'];

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'svc';
}

function classifyTab(name: string, provider: string): 'llm' | 'service' {
  const hay = `${name} ${provider}`.toLowerCase();
  return LLM_KEYWORDS.some((k) => hay.includes(k)) ? 'llm' : 'service';
}

function normalizeStatus(s: string): 'ok' | 'warn' | 'down' | 'unknown' {
  const v = (s || '').toLowerCase();
  if (v === 'down' || v === 'outage' || v === 'major') return 'down';
  if (v === 'degraded' || v === 'partial' || v === 'warn') return 'warn';
  if (v === 'operational' || v === 'ok') return 'ok';
  return 'unknown';
}

// Vendor status is authoritative. TF's own synthetic probe (ok_pct) is
// NOT a provider-health signal on its own: a low ok_pct is frequently
// TF's probe key being rate-limited or on a trial quota (verified
// 2026-05-15: Google ok_pct 0.35 = "quota issues", Cohere 0.0 = "trial
// key", both vendor-operational). A public embed must never declare an
// operational provider CRITICAL because of our own probe limits. So
// status decides state; the probe only decides when there is no vendor
// signal at all; the probe p95 is still shown as latency regardless.
// downgraded is a routing-layer signal TF does not publish, never
// inferred. unknown + no probe -> offline, kept for full coverage but
// treated as non-escalating by computeCondition (TF "unknown" means
// "no status source right now", a coverage gap, not an outage).
function deriveState(
  status: 'ok' | 'warn' | 'down' | 'unknown',
  hasProbe: boolean,
  okPct: number | null,
): ItemState {
  if (status === 'down') return 'critical';
  if (status === 'warn') return 'degraded';
  if (status === 'ok') return 'nominal';
  if (hasProbe && okPct != null) {
    if (okPct < 0.5) return 'critical';
    if (okPct < 0.95) return 'degraded';
    return 'nominal';
  }
  return 'offline';
}

// Deterministic 16-bar [0,1] shape seeded by id, biased by state, so
// the sparkline does not flicker between polls. Mirrors the prototype.
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

function toItem(svc: RawService, probes: ProbeAggregate[]): Item {
  const name = svc.name || 'Unknown';
  const provider = svc.provider || '';
  const hay = `${name} ${provider}`.toLowerCase();
  const probeKey = PROBE_KEYS.find((k) => hay.includes(k));
  const probe = probeKey ? probes.find((p) => p.provider === probeKey) : undefined;
  const status = normalizeStatus(svc.status);
  const okPct = probe ? probe.ok_pct : null;
  const state = deriveState(status, Boolean(probe), okPct);
  const latencyMs = probe ? (probe.total?.p95 ?? probe.ttfb?.p95 ?? null) : null;
  const id = slug(name);
  return {
    id,
    name,
    vendor: provider || name,
    state,
    latencyMs: latencyMs != null ? Math.round(latencyMs) : null,
    lastCheckedAgoS: probe ? agoSeconds(probe.last_probe_at) : null,
    history: makeHistory(id, state),
    detailHref: `${DETAIL_BASE}#${id}`,
  };
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

  const llms: Item[] = [];
  const svc: Item[] = [];
  for (const raw of services) {
    if (!raw || !raw.name) continue;
    const item = toItem(raw, probes);
    if (classifyTab(raw.name, raw.provider || '') === 'llm') llms.push(item);
    else svc.push(item);
  }
  return {
    pollIntervalMs: POLL_MS,
    generatedAt: new Date().toISOString(),
    llms,
    services: svc,
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
