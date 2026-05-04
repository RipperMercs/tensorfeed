import { Env } from './types';
import { RSSPollResult } from './rss';

/**
 * Alerting + failure history.
 *
 * Pragmatic alerting: email is only sent when data actually ages past the
 * staleness threshold (not on every transient fetch failure). Throttled so
 * the same alert class cannot fire more than once per hour.
 *
 * Daily summary: once per day at 8am UTC, if any RSS source failures were
 * recorded in the last 24 hours, send one digest email summarizing them.
 * If everything ran clean, no email is sent.
 */

const SOURCE_HISTORY_KEY = 'source-history';
const ALERT_STATE_KEY = 'alert-state';
const SOURCE_HISTORY_MAX_AGE_MS = 25 * 60 * 60 * 1000;
const STALE_NEWS_THRESHOLD_MS = 30 * 60 * 1000;
const STALE_ALERT_THROTTLE_MS = 60 * 60 * 1000;

interface HistoryEntry {
  timestamp: string;
  cron: string;
  sources: Array<{
    id: string;
    name: string;
    status: 'ok' | 'empty' | 'error';
    articles: number;
    error?: string;
  }>;
}

interface AlertState {
  lastStaleAlertAt?: string;
  lastDailySummaryAt?: string;
  lastRestoreAlertAt?: string;
}

async function getAlertState(env: Env): Promise<AlertState> {
  const raw = (await env.TENSORFEED_CACHE.get(ALERT_STATE_KEY, 'json')) as AlertState | null;
  return raw || {};
}

async function setAlertState(env: Env, state: AlertState): Promise<void> {
  await env.TENSORFEED_CACHE.put(ALERT_STATE_KEY, JSON.stringify(state));
}

/**
 * Send an email via the Resend API. Returns true on success, false on
 * failure. Failures are logged but never thrown so the caller can keep
 * running the rest of the cron pipeline.
 */
async function sendEmail(
  env: Env,
  subject: string,
  html: string,
  text: string,
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn('sendEmail skipped: RESEND_API_KEY not set');
    return false;
  }
  if (!env.ALERT_EMAIL_TO || !env.ALERT_EMAIL_FROM) {
    console.warn('sendEmail skipped: ALERT_EMAIL_TO or ALERT_EMAIL_FROM not set');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `TensorFeed Alerts <${env.ALERT_EMAIL_FROM}>`,
        to: [env.ALERT_EMAIL_TO],
        subject,
        html,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Resend API failed: ${res.status} ${body}`);
      return false;
    }
    console.log(`alert email sent: ${subject}`);
    return true;
  } catch (err) {
    console.error('sendEmail error:', err);
    return false;
  }
}

/**
 * Append a poll run to the rolling 24 hour history. Older than 25 hours
 * entries are pruned.
 */
export async function recordPollRun(
  env: Env,
  cron: string,
  result: RSSPollResult,
): Promise<void> {
  const existing = (await env.TENSORFEED_CACHE.get(SOURCE_HISTORY_KEY, 'json')) as
    | HistoryEntry[]
    | null;
  const entries = Array.isArray(existing) ? existing : [];

  const now = Date.now();
  const pruned = entries.filter((e) => {
    const t = Date.parse(e.timestamp);
    return Number.isFinite(t) && now - t < SOURCE_HISTORY_MAX_AGE_MS;
  });

  pruned.push({
    timestamp: new Date().toISOString(),
    cron,
    sources: result.sourceResults,
  });

  await env.TENSORFEED_CACHE.put(SOURCE_HISTORY_KEY, JSON.stringify(pruned));
}

interface NewsMeta {
  totalArticles?: number;
  lastUpdated?: string;
  restoredFromSnapshot?: boolean;
  snapshotTimestamp?: string;
}

/**
 * Check if the news feed is stale past the threshold. If so, caller should
 * trigger a snapshot restore and this function will send a throttled email
 * alert describing the situation.
 */
export async function checkNewsStaleness(env: Env): Promise<{
  stale: boolean;
  ageMinutes: number;
  lastUpdated: string | null;
}> {
  const meta = (await env.TENSORFEED_NEWS.get('meta', 'json')) as NewsMeta | null;
  if (!meta?.lastUpdated) {
    return { stale: true, ageMinutes: Infinity, lastUpdated: null };
  }
  const ageMs = Date.now() - Date.parse(meta.lastUpdated);
  const ageMinutes = Math.round(ageMs / 60_000);
  return {
    stale: ageMs > STALE_NEWS_THRESHOLD_MS,
    ageMinutes,
    lastUpdated: meta.lastUpdated,
  };
}

/**
 * Send a throttled alert describing a stale feed + fallback restore. Skips
 * if an identical alert was sent less than STALE_ALERT_THROTTLE_MS ago.
 */
export async function alertStaleNews(
  env: Env,
  opts: {
    ageMinutes: number;
    lastUpdated: string | null;
    restored: boolean;
    snapshotTimestamp: string | null;
  },
): Promise<'sent' | 'throttled' | 'skipped'> {
  const state = await getAlertState(env);
  const now = Date.now();

  if (state.lastStaleAlertAt) {
    const elapsed = now - Date.parse(state.lastStaleAlertAt);
    if (elapsed < STALE_ALERT_THROTTLE_MS) {
      console.log(`stale alert throttled (${Math.round(elapsed / 60_000)}m since last)`);
      return 'throttled';
    }
  }

  const subject = opts.restored
    ? `[TensorFeed] News feed stale, restored from snapshot`
    : `[TensorFeed] News feed stale, no snapshot available`;

  const ageDisplay = Number.isFinite(opts.ageMinutes)
    ? `${opts.ageMinutes} minutes`
    : 'unknown (no meta)';

  const lastDisplay = opts.lastUpdated || 'never';
  const snapDisplay = opts.snapshotTimestamp || 'none';

  const html = `
    <h2 style="color:#ef4444;margin:0 0 12px">TensorFeed news feed stale</h2>
    <p>The main RSS aggregation pipeline has not updated in <strong>${ageDisplay}</strong>.</p>
    <table style="border-collapse:collapse;font-family:ui-monospace,Menlo,monospace;font-size:13px">
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Last live update</td><td>${lastDisplay}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Fallback action</td><td>${opts.restored ? 'Restored from snapshot' : 'No snapshot to restore'}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Snapshot timestamp</td><td>${snapDisplay}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#64748b">Alert sent at</td><td>${new Date().toISOString()}</td></tr>
    </table>
    <p style="margin-top:16px">
      Debug: <a href="https://tensorfeed.ai/api/cron-status">/api/cron-status</a> |
      <a href="https://tensorfeed.ai/api/health">/api/health</a> |
      <a href="https://tensorfeed.ai/api/snapshots">/api/snapshots</a>
    </p>
    <p style="color:#94a3b8;font-size:12px">Throttled: at most one alert per hour. Daily summary still sends at 08:30 UTC.</p>
  `;

  const text = [
    `TensorFeed news feed stale`,
    ``,
    `Age: ${ageDisplay}`,
    `Last live update: ${lastDisplay}`,
    `Fallback: ${opts.restored ? 'Restored from snapshot' : 'No snapshot to restore'}`,
    `Snapshot timestamp: ${snapDisplay}`,
    `Alert sent at: ${new Date().toISOString()}`,
    ``,
    `Debug: https://tensorfeed.ai/api/cron-status`,
  ].join('\n');

  const ok = await sendEmail(env, subject, html, text);
  if (ok) {
    await setAlertState(env, { ...state, lastStaleAlertAt: new Date().toISOString() });
    return 'sent';
  }
  return 'skipped';
}

interface SourceAggregate {
  id: string;
  name: string;
  total: number;
  ok: number;
  failed: number;
  empty: number;
  lastSuccess: string | null;
  lastError: string | null;
}

/**
 * Walk the rolling 24 hour source history and compute per-source success
 * rates. Returns only sources that had at least one failure (ok=false or
 * empty) so the daily email can show only what matters.
 */
async function computeDailyFailureSummary(env: Env): Promise<SourceAggregate[]> {
  const entries = ((await env.TENSORFEED_CACHE.get(SOURCE_HISTORY_KEY, 'json')) as
    | HistoryEntry[]
    | null) || [];
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;

  const recent = entries.filter((e) => {
    const t = Date.parse(e.timestamp);
    return Number.isFinite(t) && t >= cutoff;
  });

  const byId = new Map<string, SourceAggregate>();

  for (const entry of recent) {
    for (const s of entry.sources) {
      let agg = byId.get(s.id);
      if (!agg) {
        agg = {
          id: s.id,
          name: s.name,
          total: 0,
          ok: 0,
          failed: 0,
          empty: 0,
          lastSuccess: null,
          lastError: null,
        };
        byId.set(s.id, agg);
      }
      agg.total += 1;
      if (s.status === 'ok') {
        agg.ok += 1;
        if (!agg.lastSuccess || agg.lastSuccess < entry.timestamp) {
          agg.lastSuccess = entry.timestamp;
        }
      } else if (s.status === 'empty') {
        agg.empty += 1;
      } else {
        agg.failed += 1;
        if (s.error) agg.lastError = s.error;
      }
    }
  }

  return [...byId.values()]
    .filter((agg) => agg.failed > 0 || agg.empty > 0)
    .sort((a, b) => {
      const aBad = a.failed + a.empty;
      const bBad = b.failed + b.empty;
      return bBad - aBad;
    });
}

function formatRate(ok: number, total: number): string {
  if (total === 0) return 'n/a';
  return `${Math.round((ok / total) * 100)}%`;
}

async function recentAnomalyEvents(env: Env, hoursBack: number = 24): Promise<import('./anomaly').AnomalyEvent[]> {
  const { listAnomalyEvents } = await import('./anomaly');
  const all = await listAnomalyEvents(env);
  const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
  return all
    .filter((e) => new Date(e.detected_at).getTime() >= cutoff)
    .sort((a, b) => b.detected_at.localeCompare(a.detected_at));
}

/**
 * Send a daily summary email covering RSS source health AND any
 * detected per-token spend anomalies in the last 24 hours. No-op only
 * when both buckets are empty. Called from the scheduled handler once
 * per day at 8:30 UTC.
 */
export async function sendDailySummary(env: Env): Promise<'sent' | 'clean' | 'skipped'> {
  const state = await getAlertState(env);
  const now = new Date();

  const [failures, anomalies] = await Promise.all([
    computeDailyFailureSummary(env),
    recentAnomalyEvents(env, 24),
  ]);

  if (failures.length === 0 && anomalies.length === 0) {
    console.log('daily summary: 24h clean (no RSS failures, no anomalies), no email sent');
    await setAlertState(env, { ...state, lastDailySummaryAt: now.toISOString() });
    return 'clean';
  }

  const failureRows = failures
    .map(
      (f) => `
        <tr>
          <td style="padding:6px 12px;border-top:1px solid #e2e8f0">${f.name}</td>
          <td style="padding:6px 12px;border-top:1px solid #e2e8f0;text-align:right">${formatRate(f.ok, f.total)}</td>
          <td style="padding:6px 12px;border-top:1px solid #e2e8f0;text-align:right">${f.failed + f.empty}</td>
          <td style="padding:6px 12px;border-top:1px solid #e2e8f0;font-family:ui-monospace,Menlo,monospace;font-size:12px">${f.lastSuccess || 'never'}</td>
        </tr>
      `,
    )
    .join('');

  const anomalyRows = anomalies
    .map((e) => {
      const sevColor = e.severity === 'critical' ? '#dc2626' : '#d97706';
      return `
        <tr>
          <td style="padding:6px 12px;border-top:1px solid #e2e8f0;font-family:ui-monospace,Menlo,monospace;font-size:12px">${e.detected_at.slice(11, 19)}Z</td>
          <td style="padding:6px 12px;border-top:1px solid #e2e8f0;font-family:ui-monospace,Menlo,monospace;font-size:12px">${e.token_short}</td>
          <td style="padding:6px 12px;border-top:1px solid #e2e8f0;text-align:center"><span style="color:${sevColor};font-weight:600;text-transform:uppercase;font-size:11px">${e.severity}</span></td>
          <td style="padding:6px 12px;border-top:1px solid #e2e8f0;text-align:right">${e.current_credits}</td>
          <td style="padding:6px 12px;border-top:1px solid #e2e8f0;text-align:right">${e.baseline_median.toFixed(1)}</td>
          <td style="padding:6px 12px;border-top:1px solid #e2e8f0;text-align:right">${e.multiplier_observed.toFixed(1)}x</td>
        </tr>
      `;
    })
    .join('');

  const failureSection = failures.length === 0 ? '' : `
    <h3 style="margin:24px 0 8px">RSS source health</h3>
    <p><strong>${failures.length}</strong> source(s) had failures in the last 24 hours.</p>
    <table style="border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 12px;text-align:left">Source</th>
          <th style="padding:8px 12px;text-align:right">Success rate</th>
          <th style="padding:8px 12px;text-align:right">Failed fetches</th>
          <th style="padding:8px 12px;text-align:left">Last success</th>
        </tr>
      </thead>
      <tbody>${failureRows}</tbody>
    </table>
  `;

  const anomalySection = anomalies.length === 0 ? '' : `
    <h3 style="margin:24px 0 8px">Token spend anomalies</h3>
    <p><strong>${anomalies.length}</strong> per-token anomaly event(s) flagged in the last 24 hours. Review at <a href="https://tensorfeed.ai/api/admin/anomalies">/api/admin/anomalies</a>.</p>
    <table style="border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:8px 12px;text-align:left">Time (UTC)</th>
          <th style="padding:8px 12px;text-align:left">Token</th>
          <th style="padding:8px 12px;text-align:center">Severity</th>
          <th style="padding:8px 12px;text-align:right">Credits this hr</th>
          <th style="padding:8px 12px;text-align:right">Baseline</th>
          <th style="padding:8px 12px;text-align:right">Multiplier</th>
        </tr>
      </thead>
      <tbody>${anomalyRows}</tbody>
    </table>
  `;

  const html = `
    <h2 style="margin:0 0 12px">TensorFeed daily ops summary</h2>
    <p>Window: last 24 hours ending ${now.toISOString()}</p>
    ${failureSection}
    ${anomalySection}
    <p style="margin-top:16px;color:#64748b;font-size:12px">
      Clean days (no RSS failures, no anomalies) produce no email. Stale-data alerts throttled to one per hour.
      Debug: <a href="https://tensorfeed.ai/api/cron-status">/api/cron-status</a>
    </p>
  `;

  const textFailureRows = failures
    .map(
      (f) =>
        `  ${f.name}: ${formatRate(f.ok, f.total)} success, ${f.failed + f.empty} failures, last ok ${f.lastSuccess || 'never'}`,
    )
    .join('\n');
  const textAnomalyRows = anomalies
    .map(
      (e) =>
        `  ${e.detected_at.slice(11, 19)}Z  ${e.token_short}  ${e.severity.toUpperCase()}  ${e.current_credits} credits / ${e.baseline_median.toFixed(1)} baseline = ${e.multiplier_observed.toFixed(1)}x`,
    )
    .join('\n');

  const textParts: string[] = [
    `TensorFeed daily ops summary`,
    `Window: last 24 hours ending ${now.toISOString()}`,
    ``,
  ];
  if (failures.length > 0) {
    textParts.push(`RSS source health: ${failures.length} source(s) had failures:`);
    textParts.push(textFailureRows);
    textParts.push(``);
  }
  if (anomalies.length > 0) {
    textParts.push(`Token spend anomalies: ${anomalies.length} event(s) flagged. Review /api/admin/anomalies`);
    textParts.push(textAnomalyRows);
  }
  const text = textParts.join('\n');

  const subjectParts: string[] = [];
  if (failures.length > 0) subjectParts.push(`${failures.length} RSS issue${failures.length === 1 ? '' : 's'}`);
  if (anomalies.length > 0) subjectParts.push(`${anomalies.length} anomal${anomalies.length === 1 ? 'y' : 'ies'}`);
  const subject = `[TensorFeed] Daily ops summary (${subjectParts.join(', ')})`;

  const ok = await sendEmail(env, subject, html, text);
  if (ok) {
    await setAlertState(env, { ...state, lastDailySummaryAt: now.toISOString() });
    return 'sent';
  }
  return 'skipped';
}

/**
 * Expose alert state for the debug endpoint.
 */
export async function getAlertsStatus(env: Env): Promise<{
  state: AlertState;
  recentFailures: SourceAggregate[];
  historyCount: number;
}> {
  const state = await getAlertState(env);
  const recentFailures = await computeDailyFailureSummary(env);
  const entries = ((await env.TENSORFEED_CACHE.get(SOURCE_HISTORY_KEY, 'json')) as
    | HistoryEntry[]
    | null) || [];
  return {
    state,
    recentFailures,
    historyCount: entries.length,
  };
}
