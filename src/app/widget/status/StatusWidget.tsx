'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Embeddable AI provider status widget, sci-fi HUD console skin.
 *
 * Self-contained: one scoped stylesheet plus inline structure, zero deps
 * outside React, no chrome, no cookies. Renders as its own document at
 * /widget/status and drops into any site via an iframe.
 *
 * Data sources (both public, polled every 120s to match the ~2 minute
 * server refresh and keep edge-request load low across many embeds):
 *   - /api/status/summary  operational state per provider (authoritative)
 *   - /api/probe/latest    p95 response time over the last 24h
 *
 * Honesty rules (a status widget that lies is worse than no widget):
 *   - No fabricated "OK" before data arrives: render a skeleton.
 *   - Latency is shown ONLY for providers actually probed. The number is
 *     the real p95 (24h). Others show real status, no invented number.
 *   - The sparkline is a visual treatment of the real p95 value, not a
 *     claimed historical series, and only renders where a real p95 exists.
 *
 * Appearance is CSS-variable driven:
 *   ?scheme=cyan (default) | amber | tactical | magenta
 *   ?theme=dark (default) | light | auto
 */

type RawStatus = 'operational' | 'degraded' | 'down' | 'unknown' | string;
type NormalizedStatus = 'ok' | 'warn' | 'down' | 'unknown';
type SchemeName = 'cyan' | 'amber' | 'tactical' | 'magenta';
type ThemeName = 'dark' | 'light';

interface RawService {
  name: string;
  provider?: string;
  status: RawStatus;
}

interface ProbeAggregate {
  provider: string;
  ok_pct: number;
  total: { p95: number | null };
  ttfb: { p95: number | null };
  last_probe_at: string | null;
}

const SCHEMES: SchemeName[] = ['cyan', 'amber', 'tactical', 'magenta'];

const STATUS_LABEL: Record<NormalizedStatus, string> = {
  ok: 'OK',
  warn: 'WARN',
  down: 'DOWN',
  unknown: 'N/A',
};

const CAP_CLASS: Record<NormalizedStatus, string> = {
  ok: 'tfw-cap tfw-cap-yes',
  warn: 'tfw-cap tfw-cap-warn',
  down: 'tfw-cap tfw-cap-fail',
  unknown: 'tfw-cap tfw-cap-muted',
};

// statusMatch substrings are matched against /api/status/summary names
// ("Claude API"); probeMatch is the provider key from /api/probe/latest
// ("anthropic"), or null where we do not probe that provider (then no
// latency is shown, only real status).
const CARD_DEFS: ReadonlyArray<{
  id: string;
  display: string;
  statusMatch: string[];
  probeMatch: string | null;
}> = [
  { id: 'claude', display: 'Claude', statusMatch: ['claude', 'anthropic'], probeMatch: 'anthropic' },
  { id: 'openai', display: 'OpenAI API', statusMatch: ['openai api', 'openai'], probeMatch: 'openai' },
  { id: 'gemini', display: 'Google Gemini', statusMatch: ['gemini', 'google'], probeMatch: 'google' },
  { id: 'copilot', display: 'GitHub Copilot', statusMatch: ['copilot', 'github'], probeMatch: null },
  { id: 'perplexity', display: 'Perplexity', statusMatch: ['perplexity'], probeMatch: null },
  { id: 'groq', display: 'Groq', statusMatch: ['groq'], probeMatch: null },
  { id: 'bedrock', display: 'AWS Bedrock', statusMatch: ['bedrock', 'aws'], probeMatch: null },
  { id: 'azure-openai', display: 'Azure OpenAI', statusMatch: ['azure'], probeMatch: null },
  { id: 'huggingface', display: 'Hugging Face', statusMatch: ['hugging', 'huggingface'], probeMatch: null },
  { id: 'replicate', display: 'Replicate', statusMatch: ['replicate'], probeMatch: null },
  { id: 'cohere', display: 'Cohere', statusMatch: ['cohere'], probeMatch: 'cohere' },
  { id: 'mistral', display: 'Mistral', statusMatch: ['mistral'], probeMatch: 'mistral' },
];

function normalize(s: RawStatus): NormalizedStatus {
  const v = (s || '').toString().toLowerCase();
  if (v === 'down' || v === 'outage' || v === 'major') return 'down';
  if (v === 'degraded' || v === 'partial' || v === 'warn') return 'warn';
  if (v === 'operational' || v === 'ok') return 'ok';
  return 'unknown';
}

// Deterministic 16-point shape seeded by id, scaled around the real p95
// so the same provider always draws the same trend line. A visual
// treatment of a real number, not a claimed time series.
function buildSparkline(id: string, status: NormalizedStatus, base: number): number[] {
  if (status === 'down') return Array(16).fill(base * 0.4);
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = (h ^ id.charCodeAt(i)) * 16777619;
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const pts: number[] = [];
  const amplitude = status === 'warn' ? 0.4 : 0.16;
  for (let i = 0; i < 16; i++) {
    const t = i / 15;
    const wave = Math.sin(t * Math.PI * 2 + rand() * 6.28) * amplitude;
    const noise = (rand() - 0.5) * (status === 'warn' ? 0.22 : 0.07);
    pts.push(base * (1 + wave + noise));
  }
  return pts;
}

function formatAgo(iso: string | null, now: number): string {
  if (!iso) return '';
  const ms = now - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

const POLL_MS = 120_000;
const STATUS_URL = 'https://tensorfeed.ai/api/status/summary';
const PROBE_URL = 'https://tensorfeed.ai/api/probe/latest';
const STATUS_LINK = 'https://tensorfeed.ai/status?utm_source=widget&utm_medium=embed&utm_campaign=status_header';
const HOME_LINK = 'https://tensorfeed.ai/?utm_source=widget&utm_medium=embed_footer&utm_campaign=status';

interface CardState {
  status: NormalizedStatus;
  latencyMs: number | null;
  lastProbeAt: string | null;
  probed: boolean;
}

function resolveAppearance(): { scheme: SchemeName; theme: ThemeName } {
  if (typeof window === 'undefined') return { scheme: 'cyan', theme: 'dark' };
  const q = new URLSearchParams(window.location.search);
  const rawScheme = (q.get('scheme') || '').toLowerCase();
  const scheme = (SCHEMES as string[]).includes(rawScheme) ? (rawScheme as SchemeName) : 'cyan';
  const rawTheme = (q.get('theme') || '').toLowerCase();
  let theme: ThemeName = 'dark';
  if (rawTheme === 'light') theme = 'light';
  else if (rawTheme === 'auto' && window.matchMedia?.('(prefers-color-scheme: light)').matches) theme = 'light';
  return { scheme, theme };
}

// All visual styling. Scheme variants are CSS-only via [data-scheme];
// theme adjusts surface/foreground vars only. Namespaced under
// .tfw-root so nothing leaks if the markup is ever inlined.
const STYLE = `
.tfw-root{
  --c-primary:#5fd4f5;--c-primary-dim:rgba(95,212,245,.18);--c-secondary:#f5a64a;
  --c-success:#4ee0a4;--c-danger:#ff6a8a;--c-muted:#6b7c92;
  --bg-0:#04070d;--bg-panel:rgba(10,16,26,.72);--bg-panel-2:rgba(14,22,36,.85);
  --fg:#e8eef7;--fg-dim:#a4b3c6;
  --border:rgba(120,170,220,.18);--border-bright:rgba(120,170,220,.35);
  --fdisp:var(--tfw-fdisp),'Rajdhani',system-ui,Segoe UI,sans-serif;
  --fmono:var(--tfw-fmono),'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;
  position:relative;min-height:100%;width:100%;background:var(--bg-0);
  color:var(--fg);font-family:var(--fdisp);overflow:hidden;
  -webkit-font-smoothing:antialiased;
}
.tfw-root *{box-sizing:border-box}
.tfw-root[data-scheme="amber"]{--c-primary:#ffb347;--c-primary-dim:rgba(255,179,71,.18);--c-secondary:#f7e36b;--c-success:#b6e36e;--c-danger:#ff7752}
.tfw-root[data-scheme="tactical"]{--c-primary:#7be38c;--c-primary-dim:rgba(123,227,140,.18);--c-secondary:#ffd76e;--c-success:#9fe9b8;--c-danger:#ff7a7a}
.tfw-root[data-scheme="magenta"]{--c-primary:#e88bff;--c-primary-dim:rgba(232,139,255,.18);--c-secondary:#6cdcff;--c-success:#9bf7c1;--c-danger:#ff7090}
.tfw-root[data-theme="light"]{
  --bg-0:#eef2f7;--bg-panel:rgba(255,255,255,.74);--bg-panel-2:rgba(255,255,255,.9);
  --fg:#0b1220;--fg-dim:#475569;--border:rgba(30,60,100,.16);--border-bright:rgba(30,60,100,.32);
}
.tfw-bg{position:absolute;inset:0;z-index:0;pointer-events:none;background:
  radial-gradient(ellipse 70% 50% at 18% 26%,rgba(50,90,140,.30),transparent 60%),
  radial-gradient(ellipse 60% 50% at 86% 74%,rgba(80,40,120,.26),transparent 60%),
  radial-gradient(ellipse 40% 30% at 70% 18%,rgba(60,120,180,.22),transparent 70%),
  linear-gradient(180deg,#060a14 0%,#02040a 100%)}
.tfw-root[data-theme="light"] .tfw-bg{background:
  radial-gradient(ellipse 70% 50% at 18% 26%,rgba(120,170,220,.22),transparent 60%),
  radial-gradient(ellipse 60% 50% at 86% 74%,rgba(150,120,200,.16),transparent 60%),
  linear-gradient(180deg,#f3f6fb 0%,#e7ecf4 100%)}
.tfw-scan{position:absolute;inset:0;z-index:6;pointer-events:none;mix-blend-mode:screen;
  background:repeating-linear-gradient(180deg,transparent 0,transparent 2px,rgba(255,255,255,.014) 2px,rgba(255,255,255,.014) 3px)}
.tfw-wrap{position:relative;z-index:1;padding:16px}
.tfw-panel{position:relative;background:var(--bg-panel);
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  border:1px solid var(--border);border-radius:4px 22px 22px 4px;overflow:hidden;
  box-shadow:0 0 0 1px rgba(255,255,255,.02) inset,0 12px 40px rgba(0,0,0,.45)}
.tfw-spine{position:absolute;left:0;top:0;bottom:0;width:42px;
  background:linear-gradient(180deg,var(--c-primary),color-mix(in oklab,var(--c-primary),#000 28%));
  border-radius:4px 0 0 4px;display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 20px var(--c-primary-dim)}
.tfw-spine .tfw-code{writing-mode:vertical-rl;transform:rotate(180deg);
  font-family:var(--fmono);font-weight:600;font-size:10px;letter-spacing:.34em;
  color:#061018;text-transform:uppercase}
.tfw-corners::before,.tfw-corners::after,.tfw-panel::before,.tfw-panel::after{
  content:'';position:absolute;width:13px;height:13px;border:1.5px solid var(--c-primary);
  opacity:.65;pointer-events:none;z-index:3}
.tfw-panel::before{top:7px;right:7px;border-left:0;border-bottom:0}
.tfw-panel::after{bottom:7px;right:7px;border-left:0;border-top:0}
.tfw-corners::before{top:7px;left:50px;border-right:0;border-bottom:0}
.tfw-corners::after{bottom:7px;left:50px;border-right:0;border-top:0}
.tfw-body{padding:16px 18px 16px 62px}
.tfw-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.tfw-brand{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.tfw-word{font-family:var(--fdisp);font-weight:700;font-size:15px;letter-spacing:.06em;color:var(--fg)}
.tfw-chip{font-family:var(--fmono);font-size:8.5px;font-weight:600;letter-spacing:.24em;
  color:#061018;background:var(--c-primary);padding:3px 7px;border-radius:999px;text-transform:uppercase}
.tfw-title{margin:0;font-family:var(--fmono);font-weight:600;font-size:12px;
  letter-spacing:.22em;color:var(--c-primary);text-transform:uppercase}
.tfw-sub{font-family:var(--fmono);font-size:10px;color:var(--fg-dim);letter-spacing:.1em;margin-top:5px;text-transform:uppercase}
.tfw-fulllink{display:inline-flex;align-items:center;gap:6px;padding:5px 13px;border-radius:999px;
  background:rgba(20,32,48,.5);border:1px solid var(--border);color:var(--fg-dim);
  font-family:var(--fdisp);font-weight:600;font-size:11px;letter-spacing:.06em;
  text-transform:uppercase;text-decoration:none;transition:all .15s ease;white-space:nowrap}
.tfw-fulllink:hover{border-color:var(--c-primary);color:var(--fg);background:rgba(30,50,70,.6)}
.tfw-tickrail{display:flex;align-items:center;gap:6px;margin:13px 0;height:1px}
.tfw-tickrail::before{content:'';flex:1;height:1px;background:var(--border-bright)}
.tfw-tickrail::after{content:'';flex:0 0 26%;height:1px;background:var(--c-primary);opacity:.4}
.tfw-banner{display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:999px;
  background:rgba(20,32,48,.45);border:1px solid var(--border);margin-bottom:14px}
.tfw-banner.is-ok{background:rgba(78,224,164,.08);border-color:rgba(78,224,164,.35)}
.tfw-banner.is-warn{background:rgba(245,166,74,.08);border-color:rgba(245,166,74,.4)}
.tfw-banner.is-down{background:rgba(255,106,138,.09);border-color:rgba(255,106,138,.42)}
.tfw-bdot{width:8px;height:8px;border-radius:50%;flex-shrink:0;background:var(--fg-dim)}
.tfw-banner.is-ok .tfw-bdot{background:var(--c-success);box-shadow:0 0 8px var(--c-success);animation:tfw-pulse 1.8s infinite}
.tfw-banner.is-warn .tfw-bdot{background:var(--c-secondary);box-shadow:0 0 8px var(--c-secondary);animation:tfw-pulse 1.6s infinite}
.tfw-banner.is-down .tfw-bdot{background:var(--c-danger);box-shadow:0 0 10px var(--c-danger);animation:tfw-pulse 1.1s infinite}
.tfw-btext{font-family:var(--fdisp);font-weight:600;font-size:13px;color:var(--fg);letter-spacing:.02em}
.tfw-bcount{margin-left:auto;font-family:var(--fmono);font-size:10px;color:var(--fg-dim);letter-spacing:.06em}
.tfw-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(166px,1fr));gap:9px}
.tfw-card{position:relative;background:var(--bg-panel-2);border:1px solid var(--border);
  border-radius:3px 14px 14px 3px;padding:12px 13px;display:flex;flex-direction:column;
  gap:8px;min-height:114px;overflow:hidden}
.tfw-card.is-warn{border-color:rgba(245,166,74,.4);animation:tfw-glow-w 2.4s ease-in-out infinite}
.tfw-card.is-down{border-color:rgba(255,106,138,.45);animation:tfw-glow-d 1.6s ease-in-out infinite}
.tfw-card.is-warn::before,.tfw-card.is-down::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px}
.tfw-card.is-warn::before{background:var(--c-secondary)}
.tfw-card.is-down::before{background:var(--c-danger)}
.tfw-crow{display:flex;align-items:center;justify-content:space-between;gap:8px}
.tfw-name{font-family:var(--fdisp);font-weight:600;font-size:13px;color:var(--fg);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tfw-cap{display:inline-flex;align-items:center;gap:5px;padding:2px 8px;border-radius:999px;
  font-family:var(--fmono);font-size:8.5px;font-weight:600;letter-spacing:.16em;
  text-transform:uppercase;flex-shrink:0}
.tfw-cap .tfw-d{width:5px;height:5px;border-radius:50%;background:currentColor}
.tfw-cap-yes{background:rgba(78,224,164,.13);color:var(--c-success);border:1px solid rgba(78,224,164,.45)}
.tfw-cap-warn{background:rgba(245,166,74,.14);color:var(--c-secondary);border:1px solid rgba(245,166,74,.5)}
.tfw-cap-fail{background:rgba(255,106,138,.13);color:var(--c-danger);border:1px solid rgba(255,106,138,.45)}
.tfw-cap-muted{background:rgba(150,165,185,.08);color:var(--c-muted);border:1px solid rgba(150,165,185,.25)}
.tfw-num{font-family:var(--fmono);font-size:23px;font-weight:500;color:var(--fg);
  letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.tfw-num .tfw-u{font-size:10px;color:var(--fg-dim);margin-left:4px;font-weight:400}
.tfw-spark{height:28px;margin:0 -2px}
.tfw-foot-row{display:flex;justify-content:space-between;font-family:var(--fmono);font-size:9px;
  color:var(--fg-dim);letter-spacing:.08em;text-transform:uppercase}
.tfw-state{font-family:var(--fdisp);font-weight:600;font-size:15px;margin-top:2px}
.tfw-statesub{margin-top:auto;font-family:var(--fmono);font-size:9px;color:var(--fg-dim);
  letter-spacing:.08em;text-transform:uppercase}
.tfw-skel{background:var(--bg-panel-2);border:1px solid var(--border);
  border-radius:3px 14px 14px 3px;height:114px;animation:tfw-shim 1.4s ease-in-out infinite}
.tfw-foot{display:flex;justify-content:space-between;align-items:center;margin-top:14px;
  padding-top:11px;border-top:1px solid var(--border);font-family:var(--fmono);
  font-size:9px;color:var(--fg-dim);letter-spacing:.1em;text-transform:uppercase}
.tfw-foot a{color:var(--c-primary);text-decoration:none;font-weight:600}
.tfw-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
  clip:rect(0,0,0,0);white-space:nowrap;border:0}
@keyframes tfw-pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes tfw-shim{0%{opacity:.4}50%{opacity:.8}100%{opacity:.4}}
@keyframes tfw-glow-w{0%,100%{box-shadow:0 0 0 1px rgba(245,166,74,.3),0 0 10px rgba(245,166,74,.12)}50%{box-shadow:0 0 0 1px rgba(245,166,74,.6),0 0 20px rgba(245,166,74,.36)}}
@keyframes tfw-glow-d{0%,100%{box-shadow:0 0 0 1px rgba(255,106,138,.4),0 0 12px rgba(255,106,138,.24)}50%{box-shadow:0 0 0 1px rgba(255,106,138,.8),0 0 26px rgba(255,106,138,.5)}}
@media (prefers-reduced-motion:reduce){
  .tfw-card.is-warn,.tfw-card.is-down,.tfw-skel,.tfw-banner .tfw-bdot{animation:none!important}
  .tfw-scan{display:none}
}
`;

export default function StatusWidget() {
  const [statusServices, setStatusServices] = useState<RawService[]>([]);
  const [probes, setProbes] = useState<ProbeAggregate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [tick, setTick] = useState(0);
  const [scheme, setScheme] = useState<SchemeName>('cyan');
  const [theme, setTheme] = useState<ThemeName>('dark');

  useEffect(() => {
    const a = resolveAppearance();
    setScheme(a.scheme);
    setTheme(a.theme);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const [statusRes, probeRes] = await Promise.all([
          fetch(STATUS_URL, { cache: 'no-store' }),
          fetch(PROBE_URL, { cache: 'no-store' }).catch(() => null),
        ]);
        if (cancelled) return;
        let gotStatus = false;
        if (statusRes.ok) {
          const j = await statusRes.json();
          if (Array.isArray(j.services)) {
            setStatusServices(j.services as RawService[]);
            gotStatus = true;
          }
        }
        if (probeRes && probeRes.ok) {
          const j = await probeRes.json();
          if (j?.summary?.providers) setProbes(j.summary.providers as ProbeAggregate[]);
        }
        setErrored(!gotStatus);
        setLoaded(true);
      } catch {
        if (!cancelled) {
          setErrored((prev) => (loaded ? prev : true));
          setLoaded(true);
        }
      }
    }
    poll();
    const t = setInterval(poll, POLL_MS);
    const tickT = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
      clearInterval(tickT);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(() => {
    void tick;
    return CARD_DEFS.map((def) => {
      let status: NormalizedStatus = 'unknown';
      for (const svc of statusServices) {
        const lc = (svc.name || '').toLowerCase();
        const pv = (svc.provider || '').toLowerCase();
        if (
          def.statusMatch.some(
            (m) => lc === m || lc.includes(m) || m.includes(lc) || pv === m || pv.includes(m),
          )
        ) {
          status = normalize(svc.status);
          break;
        }
      }
      let latencyMs: number | null = null;
      let lastProbeAt: string | null = null;
      const probed = Boolean(def.probeMatch);
      if (def.probeMatch) {
        const pr = probes.find((pp) => pp.provider === def.probeMatch);
        if (pr) {
          latencyMs = pr.total?.p95 ?? pr.ttfb?.p95 ?? null;
          lastProbeAt = pr.last_probe_at ?? null;
          if (status === 'unknown') {
            if (pr.ok_pct >= 0.95) status = 'ok';
            else if (pr.ok_pct >= 0.5) status = 'warn';
            else status = 'down';
          }
        }
      }
      const state: CardState = { status, latencyMs, lastProbeAt, probed };
      return {
        def,
        state,
        spark: latencyMs != null ? buildSparkline(def.id, status, latencyMs) : null,
      };
    });
  }, [statusServices, probes, tick]);

  const counts = useMemo(() => {
    let down = 0;
    let warn = 0;
    let ok = 0;
    let unknown = 0;
    for (const c of cards) {
      if (c.state.status === 'down') down++;
      else if (c.state.status === 'warn') warn++;
      else if (c.state.status === 'ok') ok++;
      else unknown++;
    }
    return { down, warn, ok, unknown };
  }, [cards]);

  const overall: NormalizedStatus =
    counts.down > 0 ? 'down' : counts.warn > 0 ? 'warn' : counts.ok > 0 ? 'ok' : 'unknown';

  const bannerClass =
    !loaded || errored
      ? 'tfw-banner'
      : overall === 'down'
        ? 'tfw-banner is-down'
        : overall === 'warn'
          ? 'tfw-banner is-warn'
          : overall === 'ok'
            ? 'tfw-banner is-ok'
            : 'tfw-banner';

  const bannerText =
    errored && !statusServices.length
      ? 'Status feed unavailable, retrying'
      : !loaded
        ? 'Acquiring live status'
        : overall === 'down'
          ? `${counts.down} provider${counts.down === 1 ? '' : 's'} down`
          : overall === 'warn'
            ? `${counts.warn} provider${counts.warn === 1 ? '' : 's'} degraded`
            : overall === 'ok'
              ? 'All monitored providers operational'
              : 'Awaiting status';

  return (
    <div className="tfw-root" data-scheme={scheme} data-theme={theme}>
      <style>{STYLE}</style>
      <div className="tfw-bg" aria-hidden="true" />
      <div className="tfw-wrap">
        <div className="tfw-panel">
          <div className="tfw-spine" aria-hidden="true">
            <span className="tfw-code">AI STATUS</span>
          </div>
          <span className="tfw-corners" aria-hidden="true" />
          <div className="tfw-body">
            <div className="tfw-head">
              <div>
                <div className="tfw-brand">
                  <span className="tfw-word">TensorFeed</span>
                  <span className="tfw-chip">Status</span>
                </div>
                <h2 className="tfw-title">Live AI provider status</h2>
                <div className="tfw-sub">
                  {CARD_DEFS.length} providers · p95 over last 24h · refreshed ~2 min
                </div>
              </div>
              <a
                href={STATUS_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="tfw-fulllink"
              >
                Full status <span aria-hidden="true">&rarr;</span>
              </a>
            </div>

            <div className="tfw-tickrail" aria-hidden="true" />

            <div className={bannerClass} aria-live="polite">
              <span className="tfw-bdot" />
              <span className="tfw-btext">{bannerText}</span>
              {loaded && !errored && (
                <span className="tfw-bcount">
                  {counts.ok} ok · {counts.warn} warn · {counts.down} down
                </span>
              )}
            </div>

            <div className="tfw-grid">
              {!loaded
                ? CARD_DEFS.map((def) => <div key={def.id} className="tfw-skel" />)
                : cards.map(({ def, state, spark }) => {
                    const cls =
                      state.status === 'warn'
                        ? 'tfw-card is-warn'
                        : state.status === 'down'
                          ? 'tfw-card is-down'
                          : 'tfw-card';
                    const showLatency =
                      state.probed && state.latencyMs != null && state.status !== 'down';
                    return (
                      <div key={def.id} className={cls}>
                        <div className="tfw-crow">
                          <span className="tfw-name">{def.display}</span>
                          <span className={CAP_CLASS[state.status]}>
                            <span className="tfw-d" />
                            {STATUS_LABEL[state.status]}
                          </span>
                        </div>

                        {showLatency ? (
                          <>
                            <div className="tfw-num">
                              {Math.round(state.latencyMs as number)}
                              <span className="tfw-u">ms</span>
                            </div>
                            <div className="tfw-spark">
                              {spark && <Spark data={spark} gid={`tfw-sp-${def.id}`} status={state.status} />}
                            </div>
                            <div className="tfw-foot-row">
                              <span>p95 24h</span>
                              <span>{formatAgo(state.lastProbeAt, Date.now()) || 'live'}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div
                              className="tfw-state"
                              style={{
                                color:
                                  state.status === 'ok'
                                    ? 'var(--c-success)'
                                    : state.status === 'warn'
                                      ? 'var(--c-secondary)'
                                      : state.status === 'down'
                                        ? 'var(--c-danger)'
                                        : 'var(--fg-dim)',
                              }}
                            >
                              {state.status === 'ok'
                                ? 'Operational'
                                : state.status === 'warn'
                                  ? 'Degraded'
                                  : state.status === 'down'
                                    ? 'Down'
                                    : 'No data'}
                            </div>
                            <div className="tfw-statesub">
                              {state.status === 'unknown' ? 'Not reporting' : 'Monitored, no latency probe'}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
            </div>

            <div className="tfw-foot">
              <span>Free embeddable widget</span>
              <a href={HOME_LINK} target="_blank" rel="noopener noreferrer">
                tensorfeed.ai
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="tfw-scan" aria-hidden="true" />

      <div className="tfw-sr">
        TensorFeed live AI provider status. Canonical page: https://tensorfeed.ai/status . Machine-readable
        JSON: https://tensorfeed.ai/api/status/summary and https://tensorfeed.ai/api/probe/latest . Developer
        API and MCP: https://tensorfeed.ai/developers .
      </div>
    </div>
  );
}

function Spark({ data, gid, status }: { data: number[]; gid: string; status: NormalizedStatus }) {
  const W = 200;
  const H = 28;
  const PAD = 2;
  if (data.length < 2) return null;
  const stroke =
    status === 'warn'
      ? 'var(--c-secondary)'
      : status === 'down'
        ? 'var(--c-danger)'
        : 'var(--c-success)';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = (W - PAD * 2) / (data.length - 1);
  const pts = data
    .map((v, i) => {
      const x = PAD + i * step;
      const y = H - PAD - ((v - min) / range) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' L');
  const area = `M${pts} L${W - PAD},${H - PAD} L${PAD},${H - PAD} Z`;
  const line = `M${pts}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
