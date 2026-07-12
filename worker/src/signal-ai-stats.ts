import type { Env } from './types';

// Private Signal analytics console: AI-bot, referral, and human traffic view
// sourced from the Analytics Engine "tf_signal" dataset that the Pages
// middleware fills (one datapoint per pageview or bot hit). Read-only and
// never-throw: a missing credential returns a fully zeroed response, and any
// single query failure degrades only its own section (empty array, empty
// record, or available:false) rather than nuking the whole payload. Latency
// carries its own quantile-to-average fallback, which is the model for the
// per-section behavior. Not public; the console is admin-gated upstream.
//
// AE samples under load, so EVERY count is weighted by _sample_interval
// (SUM(_sample_interval) for a plain count, SUM(IF(cond,_sample_interval,0))
// for a conditional one); COUNT(*) is never used. Distinct-IP counts are
// unreliable on AE, so every uniqueIps / uniqueVisitors field is reported as 0.

// tf_signal blob/double layout (positional contract written by the middleware):
//   blob1 = kind ('ai' | 'search' | 'human')
//   blob2 = botName (stable key, '' for human)
//   blob3 = vendor ('' for human)
//   blob4 = mode ('live' | 'crawl' | '')
//   blob5 = path (pathname, no query)
//   blob6 = country (cf country code)
//   blob7 = cacheStatus (cf-cache-status)
//   blob8 = referralSource ('chatgpt'|'perplexity'|'gemini'|'claude'|'copilot'|'')
//   blob9 = refererHost (or '(direct)')
//   double1 = status (http status)
//   double2 = bytes
//   double3 = rtMs
//   double4 = isPage (1/0)
//   double5 = isPageLike404 (1/0)
//   double6 = hourUtc (0..23)

export interface SignalAiStatsResponse {
  version: string;
  fetchedAt: number;
  windowHours: number;
  bots: Array<{ name: string; label: string; vendor: string; hits: number; uniqueIps: number }>;
  botsTotalHits: number;
  vendorTotals: Record<string, number>;
  chatgptUser: {
    hits: number;
    uniqueIps: number;
    distinctPages: number;
    status2xx: number;
    statusOther: number;
    topPages: Array<{ path: string; hits: number }>;
    hourlyUtc: number[];
  };
  referrals: { total: number; bySource: Record<string, number>; chatgptUniqueVisitors: number };
  topReferrers: Array<{ host: string; pageviews: number }>;
  searchReference: Record<string, number>;
  humanTopPages: Array<{ path: string; hits: number }>;
  notFound: Array<{ path: string; hits: number }>;
  aiModes: { live: { hits: number; uniqueIps: number }; crawl: { hits: number; uniqueIps: number } };
  latency: { available: boolean; avgMs: number; p50Ms: number; p95Ms: number; samples: number };
  cache: { available: boolean; hitRatio: number; hits: number; total: number; byStatus: Record<string, number> };
  geo: { available: boolean; topCountries: Array<{ code: string; visitors: number }> };
  trend?: Array<{ date: string; chatgptUser: number; aiTotal: number }>;
}

// Fully zeroed shape for every graceful-degrade path (no credential, total
// query failure). Latency, cache, and geo report available:false; no trend.
function zeroedSignalAiStats(): SignalAiStatsResponse {
  return {
    version: '1.0',
    fetchedAt: Date.now(),
    windowHours: 24,
    bots: [],
    botsTotalHits: 0,
    vendorTotals: {},
    chatgptUser: {
      hits: 0,
      uniqueIps: 0,
      distinctPages: 0,
      status2xx: 0,
      statusOther: 0,
      topPages: [],
      hourlyUtc: new Array<number>(24).fill(0),
    },
    referrals: { total: 0, bySource: {}, chatgptUniqueVisitors: 0 },
    topReferrers: [],
    searchReference: {},
    humanTopPages: [],
    notFound: [],
    aiModes: { live: { hits: 0, uniqueIps: 0 }, crawl: { hits: 0, uniqueIps: 0 } },
    latency: { available: false, avgMs: 0, p50Ms: 0, p95Ms: 0, samples: 0 },
    cache: { available: false, hitRatio: 0, hits: 0, total: 0, byStatus: {} },
    geo: { available: false, topCountries: [] },
  };
}

// Minimal name-to-label map for the known AI bot keys. Anything not listed
// falls back to the raw bot name as its label. Kept inline because the Pages
// functions/ tree is a separate tsconfig and cannot be imported here.
const AI_BOT_LABELS: Record<string, string> = {
  'chatgpt-user': 'ChatGPT (live answers)',
  'oai-searchbot': 'OpenAI SearchBot',
  gptbot: 'GPTBot (training)',
  'claude-user': 'Claude (live answers)',
  claudebot: 'ClaudeBot (crawler)',
  'claude-searchbot': 'Claude SearchBot',
  'anthropic-ai': 'Anthropic AI',
  perplexitybot: 'PerplexityBot',
  'perplexity-user': 'Perplexity (live)',
  'google-extended': 'Google Extended',
  'gemini-user': 'Gemini (live answers)',
  googlebot: 'Googlebot',
  bingbot: 'Bingbot',
  ccbot: 'CCBot (Common Crawl)',
  bytespider: 'Bytespider',
  amazonbot: 'Amazonbot',
  applebot: 'Applebot',
  'applebot-extended': 'Applebot Extended',
  'meta-externalagent': 'Meta External Agent',
  youbot: 'YouBot',
  'cohere-ai': 'Cohere AI',
  copilot: 'Copilot',
};

function botLabel(name: string): string {
  return AI_BOT_LABELS[name] ?? name;
}

// Coerce any AE cell (typed unknown off the JSON) to a finite number, else 0.
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Round to one decimal place for the millisecond and ratio figures.
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Window lower bound shared by every 24h query. AE understands now() and the
// INTERVAL literal (see usage-meter queryUsageFunnel), so the window is a fixed
// string with no interpolated input.
const DAY = "timestamp > now() - INTERVAL '1' DAY";

// One AE SQL read. Returns the data rows, or null on any failure (missing
// binding is guarded before this is called; non-2xx, parse error, timeout, and
// network error all degrade to null). Never throws. Mirrors the fetch pattern
// in usage-meter queryUsageFunnel / queryRequestHealth exactly.
async function runAeSql(env: Env, sql: string): Promise<Array<Record<string, unknown>> | null> {
  try {
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, 'Content-Type': 'text/plain' },
        body: sql,
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!resp.ok) return null;
    const json = (await resp.json()) as { data?: Array<Record<string, unknown>> };
    return json.data ?? null;
  } catch {
    return null;
  }
}

// Assemble the AI / referral / human traffic snapshot from tf_signal over the
// last 24h, plus an optional per-day trend. Degrades to a zeroed response when
// the AE credentials are absent or an unexpected error is thrown; individual
// query failures degrade only their own section. Never throws.
export async function buildSignalAiStats(env: Env, trendDays: number): Promise<SignalAiStatsResponse> {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) return zeroedSignalAiStats();
  try {
    const run = (sql: string): Promise<Array<Record<string, unknown>> | null> => runAeSql(env, sql);

    // AI bots grouped by name / vendor / mode. Rows are collapsed to one entry
    // per bot in JS (a bot's vendor and mode are stable, but grouping by all
    // three is defensive against a bot that ever reports two modes).
    const botsSql = `SELECT blob2 AS name, blob3 AS vendor, blob4 AS mode, SUM(_sample_interval) AS hits FROM tf_signal WHERE blob1='ai' AND ${DAY} GROUP BY name, vendor, mode ORDER BY hits DESC LIMIT 200`;
    const modesSql = `SELECT blob4 AS mode, SUM(_sample_interval) AS hits FROM tf_signal WHERE blob1='ai' AND blob4 IN ('live','crawl') AND ${DAY} GROUP BY mode`;
    const cguPagesSql = `SELECT blob5 AS path, SUM(_sample_interval) AS hits FROM tf_signal WHERE blob2='chatgpt-user' AND ${DAY} GROUP BY path ORDER BY hits DESC LIMIT 20`;
    const cguHourSql = `SELECT double6 AS hour, SUM(_sample_interval) AS hits FROM tf_signal WHERE blob2='chatgpt-user' AND ${DAY} GROUP BY hour`;
    const cguStatusSql = `SELECT SUM(_sample_interval) AS total, SUM(IF(double1>=200 AND double1<300,_sample_interval,0)) AS s2xx, SUM(IF(double1<200 OR double1>=300,_sample_interval,0)) AS sother FROM tf_signal WHERE blob2='chatgpt-user' AND ${DAY}`;
    const referralsSql = `SELECT blob8 AS src, SUM(_sample_interval) AS n FROM tf_signal WHERE blob8 != '' AND ${DAY} GROUP BY src ORDER BY n DESC`;
    const referrersSql = `SELECT blob9 AS host, SUM(_sample_interval) AS pv FROM tf_signal WHERE blob1='human' AND double4=1 AND blob9 != '(direct)' AND ${DAY} GROUP BY host ORDER BY pv DESC LIMIT 15`;
    const searchSql = `SELECT blob2 AS name, SUM(_sample_interval) AS hits FROM tf_signal WHERE blob1='search' AND ${DAY} GROUP BY name ORDER BY hits DESC`;
    const humanPagesSql = `SELECT blob5 AS path, SUM(_sample_interval) AS hits FROM tf_signal WHERE blob1='human' AND double4=1 AND double1>=200 AND double1<400 AND ${DAY} GROUP BY path ORDER BY hits DESC LIMIT 15`;
    const notFoundSql = `SELECT blob5 AS path, SUM(_sample_interval) AS hits FROM tf_signal WHERE double5=1 AND ${DAY} GROUP BY path ORDER BY hits DESC LIMIT 12`;
    const cacheSql = `SELECT blob7 AS status, SUM(_sample_interval) AS n FROM tf_signal WHERE blob7 != '' AND ${DAY} GROUP BY status`;
    const geoSql = `SELECT blob6 AS code, SUM(_sample_interval) AS visitors FROM tf_signal WHERE blob6 != '' AND ${DAY} GROUP BY code ORDER BY visitors DESC LIMIT 12`;

    const [
      botRows,
      modeRows,
      cguPageRows,
      cguHourRows,
      cguStatusRows,
      referralRows,
      referrerRows,
      searchRows,
      humanPageRows,
      notFoundRows,
      cacheRows,
      geoRows,
    ] = await Promise.all([
      run(botsSql),
      run(modesSql),
      run(cguPagesSql),
      run(cguHourSql),
      run(cguStatusSql),
      run(referralsSql),
      run(referrersSql),
      run(searchSql),
      run(humanPagesSql),
      run(notFoundSql),
      run(cacheSql),
      run(geoSql),
    ]);

    // Latency. quantileWeighted(level, value, weight) is the AE-native weighted
    // quantile; if AE rejects it the primary query returns null and we fall
    // back to a weighted-average-only query, setting p50 = p95 = avg.
    const latencyQuantileSql = `SELECT SUM(double3 * _sample_interval) AS wsum, SUM(_sample_interval) AS samples, quantileWeighted(0.5, double3, _sample_interval) AS p50, quantileWeighted(0.95, double3, _sample_interval) AS p95 FROM tf_signal WHERE double3 > 0 AND ${DAY}`;
    const latencyAvgSql = `SELECT SUM(double3 * _sample_interval) AS wsum, SUM(_sample_interval) AS samples FROM tf_signal WHERE double3 > 0 AND ${DAY}`;
    const latQuantileRows = await run(latencyQuantileSql);
    const latencyHasQuantile = latQuantileRows !== null;
    const latRows = latQuantileRows !== null ? latQuantileRows : await run(latencyAvgSql);

    // Bots: collapse to one row per bot name, summing weighted hits, non-zero
    // only, sorted hits desc.
    const botAgg = new Map<string, { name: string; vendor: string; hits: number }>();
    for (const r of botRows ?? []) {
      const name = String(r.name ?? '');
      if (!name) continue;
      const hits = num(r.hits);
      const existing = botAgg.get(name);
      if (existing) {
        existing.hits += hits;
        if (!existing.vendor) existing.vendor = String(r.vendor ?? '');
      } else {
        botAgg.set(name, { name, vendor: String(r.vendor ?? ''), hits });
      }
    }
    const bots = [...botAgg.values()]
      .filter((b) => b.hits > 0)
      .map((b) => ({ name: b.name, label: botLabel(b.name), vendor: b.vendor, hits: b.hits, uniqueIps: 0 }))
      .sort((a, b) => b.hits - a.hits);
    const botsTotalHits = bots.reduce((s, b) => s + b.hits, 0);
    const vendorTotals: Record<string, number> = {};
    for (const b of bots) {
      if (!b.vendor) continue;
      vendorTotals[b.vendor] = (vendorTotals[b.vendor] ?? 0) + b.hits;
    }

    // AI modes (live vs crawl), weighted hits.
    const aiModes = { live: { hits: 0, uniqueIps: 0 }, crawl: { hits: 0, uniqueIps: 0 } };
    for (const r of modeRows ?? []) {
      const mode = String(r.mode ?? '');
      const hits = num(r.hits);
      if (mode === 'live') aiModes.live.hits = hits;
      else if (mode === 'crawl') aiModes.crawl.hits = hits;
    }

    // ChatGPT (live-answers) detail.
    const cguTopPages = (cguPageRows ?? []).map((r) => ({ path: String(r.path ?? ''), hits: num(r.hits) }));
    const cguHourly = new Array<number>(24).fill(0);
    for (const r of cguHourRows ?? []) {
      const h = Math.floor(num(r.hour));
      if (h >= 0 && h < 24) cguHourly[h] = num(r.hits);
    }
    const cguStatus: Record<string, unknown> = (cguStatusRows ?? [])[0] ?? {};
    const chatgptUser = {
      hits: num(cguStatus.total),
      uniqueIps: 0,
      // Best-effort: distinct pages seen among the returned top-pages rows
      // (each GROUP BY blob5 row is a distinct path, capped at the LIMIT).
      distinctPages: cguTopPages.length,
      status2xx: num(cguStatus.s2xx),
      statusOther: num(cguStatus.sother),
      topPages: cguTopPages,
      hourlyUtc: cguHourly,
    };

    // Referrals by source tag.
    const referralBySource: Record<string, number> = {};
    for (const r of referralRows ?? []) {
      const src = String(r.src ?? '');
      if (!src) continue;
      referralBySource[src] = num(r.n);
    }
    const referrals = {
      total: Object.values(referralBySource).reduce((s, n) => s + n, 0),
      bySource: referralBySource,
      chatgptUniqueVisitors: 0,
    };

    // Human referrer hosts (excluding direct).
    const topReferrers = (referrerRows ?? [])
      .map((r) => ({ host: String(r.host ?? ''), pageviews: num(r.pv) }))
      .filter((r) => r.host && r.host !== '(direct)');

    // Search-engine reference crawlers, keyed by label.
    const searchReference: Record<string, number> = {};
    for (const r of searchRows ?? []) {
      const name = String(r.name ?? '');
      if (!name) continue;
      const label = botLabel(name);
      searchReference[label] = (searchReference[label] ?? 0) + num(r.hits);
    }

    const humanTopPages = (humanPageRows ?? []).map((r) => ({ path: String(r.path ?? ''), hits: num(r.hits) }));
    const notFound = (notFoundRows ?? []).map((r) => ({ path: String(r.path ?? ''), hits: num(r.hits) }));

    // Cache: hits, total, ratio, and the full status breakdown, all weighted.
    const cacheByStatus: Record<string, number> = {};
    let cacheHits = 0;
    let cacheTotal = 0;
    for (const r of cacheRows ?? []) {
      const status = String(r.status ?? '');
      if (!status) continue;
      const n = num(r.n);
      cacheByStatus[status] = n;
      cacheTotal += n;
      if (status.toUpperCase() === 'HIT') cacheHits += n;
    }
    const cache = {
      available: cacheRows !== null,
      hitRatio: cacheTotal > 0 ? round1((cacheHits / cacheTotal) * 100) : 0,
      hits: cacheHits,
      total: cacheTotal,
      byStatus: cacheByStatus,
    };

    // Geo: top countries by weighted visitor count.
    const topCountries = (geoRows ?? [])
      .map((r) => ({ code: String(r.code ?? ''), visitors: num(r.visitors) }))
      .filter((c) => c.code);
    const geo = { available: geoRows !== null, topCountries };

    // Latency assembly. avgMs is the weighted mean; when the quantile query was
    // rejected p50 / p95 fall back to the average.
    const latRow: Record<string, unknown> = (latRows ?? [])[0] ?? {};
    const latSamples = num(latRow.samples);
    const avgMs = latSamples > 0 ? round1(num(latRow.wsum) / latSamples) : 0;
    let p50Ms = avgMs;
    let p95Ms = avgMs;
    if (latencyHasQuantile) {
      const p50 = num(latRow.p50);
      const p95 = num(latRow.p95);
      p50Ms = p50 > 0 ? round1(p50) : avgMs;
      p95Ms = p95 > 0 ? round1(p95) : avgMs;
    }
    const latency = {
      available: latRows !== null,
      avgMs,
      p50Ms,
      p95Ms,
      samples: latSamples,
    };

    // Optional trend, only when trendDays is a finite value in [1, 14]. The day
    // count is floored and clamped to an integer BEFORE it touches SQL, so no
    // untrusted string is ever interpolated into the query.
    let trend: Array<{ date: string; chatgptUser: number; aiTotal: number }> | undefined;
    const rawTrend = Number(trendDays);
    if (Number.isFinite(rawTrend) && rawTrend >= 1 && rawTrend <= 14) {
      const trendClamped = Math.max(1, Math.min(14, Math.floor(rawTrend)));
      const trendSql = `SELECT toDate(timestamp) AS day, SUM(IF(blob2='chatgpt-user',_sample_interval,0)) AS cgu, SUM(IF(blob1='ai',_sample_interval,0)) AS aiTotal FROM tf_signal WHERE timestamp > now() - INTERVAL '${trendClamped}' DAY GROUP BY day ORDER BY day ASC`;
      const trendRows = await run(trendSql);
      if (trendRows !== null) {
        trend = trendRows.map((r) => ({
          date: String(r.day ?? '').slice(0, 10),
          chatgptUser: num(r.cgu),
          aiTotal: num(r.aiTotal),
        }));
      }
    }

    return {
      version: '1.0',
      fetchedAt: Date.now(),
      windowHours: 24,
      bots,
      botsTotalHits,
      vendorTotals,
      chatgptUser,
      referrals,
      topReferrers,
      searchReference,
      humanTopPages,
      notFound,
      aiModes,
      latency,
      cache,
      geo,
      ...(trend ? { trend } : {}),
    };
  } catch {
    return zeroedSignalAiStats();
  }
}
