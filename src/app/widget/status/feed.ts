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
const LEADERBOARD_URL = 'https://tensorfeed.ai/api/status/leaderboard?days=7';
const UTM = 'utm_source=widget&utm_medium=embed&utm_campaign=detail';

// Per-provider deep-link slugs. TF has a rich /uptime/{slug} page
// (7-day chart, downtime, FAQ, cross-links) for these. Detail links
// there when we can resolve a slug, else falls back to /status (which
// the owner explicitly likes), anchored by id.
const DETAIL_SLUGS: Array<[string, string]> = [
  ['claude', 'claude'], ['anthropic', 'claude'], ['openai', 'openai'], ['gpt', 'openai'],
  ['gemini', 'gemini'], ['google', 'gemini'], ['groq', 'groq'], ['bedrock', 'bedrock'],
  ['azure', 'azure'], ['deepseek', 'deepseek'], ['together', 'together'],
  ['fireworks', 'fireworks'], ['openrouter', 'openrouter'], ['perplexity', 'perplexity'],
  ['copilot', 'copilot'], ['github', 'copilot'], ['hugging', 'huggingface'],
  ['replicate', 'replicate'], ['cohere', 'cohere'], ['mistral', 'mistral'],
  ['elevenlabs', 'elevenlabs'], ['stability', 'stability'], ['runway', 'runway'],
  ['luma', 'luma'],
];

function detailHref(name: string, vendor: string, id: string): string {
  const hay = `${name} ${vendor}`.toLowerCase();
  const hit = DETAIL_SLUGS.find(([kw]) => hay.includes(kw));
  return hit
    ? `https://tensorfeed.ai/uptime/${hit[1]}?${UTM}`
    : `https://tensorfeed.ai/status?${UTM}#${id}`;
}

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

interface LeaderboardEntry {
  provider: string;
  uptime_pct: number;
}

// Match a row to its 7-day uptime entry by fuzzy provider-name overlap
// (leaderboard "provider" is the display name, same family as the
// status feed name/provider).
function findUptime(name: string, vendor: string, lb: LeaderboardEntry[]): number | null {
  const a = name.toLowerCase();
  const v = vendor.toLowerCase();
  for (const e of lb) {
    const p = (e.provider || '').toLowerCase();
    if (!p) continue;
    if (p === a || p.includes(a) || a.includes(p) || p === v || p.includes(v) || v.includes(p)) {
      return typeof e.uptime_pct === 'number' ? e.uptime_pct : null;
    }
  }
  return null;
}

function toItem(svc: RawService, probes: ProbeAggregate[], lb: LeaderboardEntry[]): Item {
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
    uptimePct: findUptime(name, provider, lb),
    lastCheckedAgoS: probe ? agoSeconds(probe.last_probe_at) : null,
    history: makeHistory(id, state),
    detailHref: detailHref(name, provider, id),
  };
}

export function buildFeed(statusJson: unknown, probeJson: unknown, leaderboardJson: unknown): Feed {
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

  const lb: LeaderboardEntry[] =
    leaderboardJson &&
    typeof leaderboardJson === 'object' &&
    Array.isArray((leaderboardJson as { entries?: unknown }).entries)
      ? ((leaderboardJson as { entries: LeaderboardEntry[] }).entries)
      : [];

  const llms: Item[] = [];
  const svc: Item[] = [];
  for (const raw of services) {
    if (!raw || !raw.name) continue;
    const item = toItem(raw, probes, lb);
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
    const [statusRes, probeRes, lbRes] = await Promise.all([
      fetch(STATUS_URL, { cache: 'no-store' }),
      fetch(PROBE_URL, { cache: 'no-store' }).catch(() => null),
      fetch(LEADERBOARD_URL, { cache: 'no-store' }).catch(() => null),
    ]);
    if (!statusRes.ok) return null;
    const statusJson = await statusRes.json();
    const probeJson = probeRes && probeRes.ok ? await probeRes.json() : null;
    const leaderboardJson = lbRes && lbRes.ok ? await lbRes.json() : null;
    return buildFeed(statusJson, probeJson, leaderboardJson);
  } catch {
    return null;
  }
}

// Self-contained demo feed for ?demo= preview. Does NOT touch the live
// API or the real feed: it must render the alert chrome instantly and
// unconditionally, even offline or before any poll returns. A
// representative provider set, every row forced to the chosen state.
const DEMO_ROWS: ReadonlyArray<{ id: string; name: string; vendor: string; base: number; tab: 'llm' | 'service' }> = [
  { id: 'claude', name: 'Claude API', vendor: 'Anthropic', base: 1174, tab: 'llm' },
  { id: 'openai', name: 'OpenAI API', vendor: 'OpenAI', base: 287, tab: 'llm' },
  { id: 'gemini', name: 'Google Gemini', vendor: 'Google', base: 1209, tab: 'llm' },
  { id: 'mistral', name: 'Mistral', vendor: 'Mistral AI', base: 655, tab: 'llm' },
  { id: 'cohere', name: 'Cohere', vendor: 'Cohere', base: 412, tab: 'llm' },
  { id: 'deepseek', name: 'DeepSeek', vendor: 'DeepSeek', base: 530, tab: 'llm' },
  { id: 'groq', name: 'Groq', vendor: 'Groq', base: 142, tab: 'llm' },
  { id: 'perplexity', name: 'Perplexity', vendor: 'Perplexity AI', base: 388, tab: 'llm' },
  { id: 'bedrock', name: 'AWS Bedrock', vendor: 'AWS', base: 264, tab: 'llm' },
  { id: 'azure-openai', name: 'Azure OpenAI', vendor: 'Microsoft Azure', base: 301, tab: 'llm' },
  { id: 'huggingface', name: 'Hugging Face', vendor: 'Hugging Face', base: 233, tab: 'service' },
  { id: 'replicate', name: 'Replicate', vendor: 'Replicate', base: 540, tab: 'service' },
  { id: 'openrouter', name: 'OpenRouter', vendor: 'OpenRouter', base: 319, tab: 'service' },
  { id: 'together', name: 'Together AI', vendor: 'Together AI', base: 198, tab: 'service' },
  { id: 'fireworks', name: 'Fireworks AI', vendor: 'Fireworks AI', base: 176, tab: 'service' },
];

// Realistic incident, not "paint everything red". A calm mostly-nominal
// board with a couple of real problems is both how production actually
// looks and the right backdrop for judging whether the alert chrome
// pops. Deterministic by id so it is stable to look at. Flagship
// providers are kept nominal even in the obviously-labelled sim.
function demoStateFor(s: 'nominal' | 'degraded' | 'critical' | 'offline', id: string): ItemState {
  if (s === 'nominal') return 'nominal';
  if (s === 'degraded') return id === 'mistral' || id === 'perplexity' ? 'degraded' : 'nominal';
  if (s === 'offline') return id === 'deepseek' || id === 'replicate' ? 'offline' : 'nominal';
  // critical: two down, one degraded, the rest healthy
  return id === 'cohere' || id === 'deepseek'
    ? 'critical'
    : id === 'mistral'
      ? 'degraded'
      : 'nominal';
}

export function buildDemoFeed(s: 'nominal' | 'degraded' | 'critical' | 'offline'): Feed {
  const mk = (r: (typeof DEMO_ROWS)[number]): Item => {
    const state = demoStateFor(s, r.id);
    const latencyMs =
      state === 'offline'
        ? null
        : state === 'critical'
          ? Math.round(r.base * 1.9)
          : state === 'degraded'
            ? Math.round(r.base * 1.5)
            : r.base;
    return {
      id: r.id,
      name: r.name,
      vendor: r.vendor,
      state,
      latencyMs,
      uptimePct: null,
      lastCheckedAgoS: state === 'offline' ? null : 9,
      history: makeHistory(r.id, state),
      detailHref: 'https://tensorfeed.ai/status?utm_source=widget&utm_medium=demo',
    };
  };
  return {
    pollIntervalMs: POLL_MS,
    generatedAt: new Date().toISOString(),
    llms: DEMO_ROWS.filter((r) => r.tab === 'llm').map(mk),
    services: DEMO_ROWS.filter((r) => r.tab === 'service').map(mk),
  };
}
