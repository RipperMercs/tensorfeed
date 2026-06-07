/**
 * Anti-drift health audit.
 *
 * A daily cron checks the LIVE deployed site for drift: broken page URLs
 * (the model-page 404 class, dead originals, missing feeds) and stale
 * datasets (model/benchmark/harness data past SLA or predating the newest
 * flagship). It consolidates the result into one report served at
 * /api/health/drift (public redacted view) and emails an alert ONLY when
 * health flips to red or a new failure appears, so silent drift gets caught
 * automatically instead of by accident.
 *
 * The pure functions (buildDriftReport, publicView, shouldAlert,
 * formatAlertBody) carry the logic and the test coverage. runDriftAudit does
 * the I/O (fetch the URL set, HEAD-check each, fold in data-freshness, read
 * and write the previous report, send the alert) and stays resilient: a
 * single URL fetch failure becomes a failed check, never a thrown audit.
 */
import type { Env } from './types';
import { sendEmail } from './alerts';
import { safePut } from './kill-switch';

export interface UrlCheck {
  url: string;
  status_code: number;
  ok: boolean;
  critical: boolean;
}

export type DriftStatus = 'ok' | 'degraded' | 'down';

export interface UrlFailure {
  url: string;
  status_code: number;
  critical: boolean;
}

export interface DriftReport {
  status: DriftStatus;
  run_at: string;
  summary: { passed: number; total: number; failed: number };
  categories: {
    live_urls: { passed: number; total: number; failures: UrlFailure[] };
    data_freshness: { stale: string[]; total: number };
  };
  changed: boolean;
  previous_status: DriftStatus | null;
}

export interface PublicDriftReport {
  status: DriftStatus;
  run_at: string;
  changed: boolean;
  categories: {
    live_urls: { passed: number; total: number };
    data_freshness: { stale_count: number; total: number };
  };
}

const STATUS_RANK: Record<DriftStatus, number> = { ok: 0, degraded: 1, down: 2 };

/**
 * Pure: assemble the consolidated drift report from already-collected URL
 * checks and the list of stale dataset names. Computes status, summary
 * counts, failure list, and change detection against the previous report.
 */
export function buildDriftReport(
  urlChecks: UrlCheck[],
  staleDatasets: string[],
  freshnessTotal: number,
  runAt: string,
  previous: DriftReport | null,
): DriftReport {
  const failedChecks = urlChecks.filter((c) => !c.ok);
  const passed = urlChecks.length - failedChecks.length;
  const anyCriticalFailed = failedChecks.some((c) => c.critical);
  const anyStale = staleDatasets.length > 0;

  let status: DriftStatus;
  if (anyCriticalFailed) {
    status = 'down';
  } else if (failedChecks.length > 0 || anyStale) {
    status = 'degraded';
  } else {
    status = 'ok';
  }

  const failures: UrlFailure[] = failedChecks.map((c) => ({
    url: c.url,
    status_code: c.status_code,
    critical: c.critical,
  }));

  const prevFailureUrls = new Set(
    (previous?.categories.live_urls.failures ?? []).map((f) => f.url),
  );
  const hasNewFailure = failures.some((f) => !prevFailureUrls.has(f.url));

  let changed: boolean;
  if (previous === null) {
    changed = status !== 'ok';
  } else if (status !== previous.status) {
    changed = true;
  } else if (hasNewFailure) {
    changed = true;
  } else {
    changed = false;
  }

  return {
    status,
    run_at: runAt,
    summary: { passed, total: urlChecks.length, failed: failedChecks.length },
    categories: {
      live_urls: { passed, total: urlChecks.length, failures },
      data_freshness: { stale: staleDatasets, total: freshnessTotal },
    },
    changed,
    previous_status: previous?.status ?? null,
  };
}

/**
 * Pure: redact the report for public consumption. Strips every failing-URL
 * detail; returns only status, run_at, changed, and the counts. Failing
 * URLs go to the alert email, never to the open endpoint.
 */
export function publicView(report: DriftReport): PublicDriftReport {
  return {
    status: report.status,
    run_at: report.run_at,
    changed: report.changed,
    categories: {
      live_urls: {
        passed: report.categories.live_urls.passed,
        total: report.categories.live_urls.total,
      },
      data_freshness: {
        stale_count: report.categories.data_freshness.stale.length,
        total: report.categories.data_freshness.total,
      },
    },
  };
}

/**
 * Pure: decide whether to alert, and in which direction.
 *
 * 'red' when health is not ok AND this is a genuinely new or worsened
 * situation (no prior, prior was ok, a new failing URL appeared, or the
 * status got worse). A standing failure that already alerted stays silent.
 * 'clear' when health returns to ok after a prior non-ok state. Otherwise
 * null.
 */
export function shouldAlert(
  previous: DriftReport | null,
  next: DriftReport,
): 'red' | 'clear' | null {
  if (next.status !== 'ok') {
    const prevOk = previous === null || previous.status === 'ok';
    const prevFailureUrls = new Set(
      (previous?.categories.live_urls.failures ?? []).map((f) => f.url),
    );
    const hasNewFailure = next.categories.live_urls.failures.some(
      (f) => !prevFailureUrls.has(f.url),
    );
    const worse =
      previous !== null && STATUS_RANK[next.status] > STATUS_RANK[previous.status];
    if (prevOk || hasNewFailure || worse) {
      return 'red';
    }
    return null;
  }
  // next.status === 'ok'
  if (previous && previous.status !== 'ok') {
    return 'clear';
  }
  return null;
}

/**
 * Pure: a plain-text, actionable consolidated summary for the alert email.
 * Lists the status, the failing URLs with status codes (critical ones
 * first), and the stale datasets. No HTML, no em dashes, no double hyphens.
 */
export function formatAlertBody(report: DriftReport): string {
  const lines: string[] = [];
  lines.push(`TensorFeed drift audit: ${report.status.toUpperCase()}`);
  lines.push(`Run at: ${report.run_at}`);
  lines.push(
    `URLs: ${report.summary.passed} of ${report.summary.total} healthy, ${report.summary.failed} failing.`,
  );
  lines.push('');

  const failures = report.categories.live_urls.failures;
  if (failures.length > 0) {
    lines.push('Failing URLs (critical first):');
    const ordered = [...failures].sort((a, b) => {
      if (a.critical !== b.critical) return a.critical ? -1 : 1;
      return a.url.localeCompare(b.url);
    });
    for (const f of ordered) {
      const tag = f.critical ? ' [CRITICAL]' : '';
      lines.push(`  ${f.url}  ${f.status_code}${tag}`);
    }
    lines.push('');
  }

  const stale = report.categories.data_freshness.stale;
  if (stale.length > 0) {
    lines.push(`Stale datasets (${stale.length} of ${report.categories.data_freshness.total}):`);
    for (const name of stale) {
      lines.push(`  ${name}`);
    }
    lines.push('');
  }

  lines.push('Full status: https://tensorfeed.ai/api/health/drift');
  return lines.join('\n');
}

/**
 * Curated set of paths whose failure is critical (a down site, not just
 * drift). Everything discovered from the sitemap and llms.txt is treated as
 * non-critical by default.
 */
const CRITICAL_PATHS = [
  'https://tensorfeed.ai/',
  'https://tensorfeed.ai/developers',
  'https://tensorfeed.ai/originals',
  'https://tensorfeed.ai/sitemap.xml',
  'https://tensorfeed.ai/llms.txt',
  'https://tensorfeed.ai/api/meta',
  'https://tensorfeed.ai/api/today',
];

const MAX_URLS = 90;
const FETCH_CONCURRENCY = 10;
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Pull the URL set to check from the live sitemap and llms.txt. Resilient:
 * a failed fetch of either source just contributes fewer URLs. The curated
 * critical set is always present even if both sources fail.
 */
async function collectUrls(): Promise<UrlCheck[]> {
  const critical = new Set(CRITICAL_PATHS);
  const pageUrls: string[] = [];
  const originalUrls: string[] = [];

  // Sitemap: all non-originals page URLs, plus the newest 10 originals.
  try {
    const res = await fetch('https://tensorfeed.ai/sitemap.xml', {
      headers: { 'User-Agent': 'tensorfeed-drift-audit' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      const xml = await res.text();
      const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
      for (const loc of locs) {
        if (!loc.startsWith('https://tensorfeed.ai/')) continue;
        if (loc.includes('/originals/')) {
          originalUrls.push(loc);
        } else {
          pageUrls.push(loc);
        }
      }
    }
  } catch {
    // sitemap unavailable; rely on llms.txt + critical set
  }

  // Sitemap is generally newest-last for originals; take the last 10.
  const newestOriginals = originalUrls.slice(-10);

  // llms.txt: first 15 internal links pointing at the model/compare/provider/
  // originals page classes (catches the model-page 404 class specifically).
  const llmsUrls: string[] = [];
  try {
    const res = await fetch('https://tensorfeed.ai/llms.txt', {
      headers: { 'User-Agent': 'tensorfeed-drift-audit' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      const text = await res.text();
      const links = [...text.matchAll(/https:\/\/tensorfeed\.ai\/[^\s)\]"'<>]+/g)].map(
        (m) => m[0].replace(/[.,;]+$/, ''),
      );
      for (const link of links) {
        if (
          link.includes('/models/') ||
          link.includes('/compare/') ||
          link.includes('/providers/') ||
          link.includes('/originals/')
        ) {
          llmsUrls.push(link);
          if (llmsUrls.length >= 15) break;
        }
      }
    }
  } catch {
    // llms.txt unavailable; rely on sitemap + critical set
  }

  // De-dupe by URL, critical set first so those keep their critical flag.
  const seen = new Set<string>();
  const checks: UrlCheck[] = [];
  const pushUrl = (url: string) => {
    if (seen.has(url)) return;
    seen.add(url);
    checks.push({ url, status_code: 0, ok: false, critical: critical.has(url) });
  };

  for (const url of CRITICAL_PATHS) pushUrl(url);
  for (const url of pageUrls) pushUrl(url);
  for (const url of newestOriginals) pushUrl(url);
  for (const url of llmsUrls) pushUrl(url);

  return checks.slice(0, MAX_URLS);
}

/**
 * HEAD-check one URL. Retries once with GET if HEAD throws or returns 405.
 * Any failure resolves to a failed check, never a thrown error.
 */
async function checkUrl(entry: UrlCheck): Promise<UrlCheck> {
  const attempt = async (method: 'HEAD' | 'GET'): Promise<number> => {
    const res = await fetch(entry.url, {
      method,
      headers: { 'User-Agent': 'tensorfeed-drift-audit' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'manual',
    });
    return res.status;
  };

  let status = 0;
  try {
    status = await attempt('HEAD');
    if (status === 405) {
      status = await attempt('GET');
    }
  } catch {
    try {
      status = await attempt('GET');
    } catch {
      status = 0;
    }
  }

  // 3xx from redirect:'manual' is a healthy redirect (canonical / trailing
  // slash). Treat 2xx and 3xx as ok.
  const ok = status >= 200 && status < 400;
  return { url: entry.url, status_code: status, ok, critical: entry.critical };
}

/**
 * Orchestrator: run the full audit. Collects the live URL set, HEAD-checks
 * each in bounded-concurrency chunks, folds in the catalog data-freshness
 * check, builds the report, alerts on change, persists it, and returns it.
 */
export async function runDriftAudit(env: Env): Promise<DriftReport> {
  const entries = await collectUrls();

  // Check in chunks of FETCH_CONCURRENCY to bound concurrent fetches.
  const urlChecks: UrlCheck[] = [];
  for (let i = 0; i < entries.length; i += FETCH_CONCURRENCY) {
    const chunk = entries.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(chunk.map((e) => checkUrl(e)));
    urlChecks.push(...results);
  }

  // Data freshness. A hiccup here must not fail the whole audit.
  let staleDatasets: string[] = [];
  let freshnessTotal = 0;
  try {
    const { checkDataFreshness } = await import('./data-freshness');
    const reports = await checkDataFreshness(env, new Date().toISOString());
    staleDatasets = reports.filter((r) => r.stale).map((r) => r.dataset);
    freshnessTotal = reports.length;
  } catch (err) {
    console.error('drift-audit freshness check failed (non-fatal):', err);
    staleDatasets = [];
    freshnessTotal = 0;
  }

  const previous = (await env.TENSORFEED_CACHE.get('drift:last', 'json')) as DriftReport | null;
  const report = buildDriftReport(
    urlChecks,
    staleDatasets,
    freshnessTotal,
    new Date().toISOString(),
    previous,
  );

  const action = shouldAlert(previous, report);
  if (action === 'red') {
    const body = formatAlertBody(report);
    await sendEmail(
      env,
      `TensorFeed drift: ${report.status}`,
      `<pre>${body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
      body,
    );
  } else if (action === 'clear') {
    const body = [
      'TensorFeed drift audit: all clear.',
      `Run at: ${report.run_at}`,
      `URLs: ${report.summary.passed} of ${report.summary.total} healthy.`,
      'Full status: https://tensorfeed.ai/api/health/drift',
    ].join('\n');
    await sendEmail(
      env,
      'TensorFeed drift: ok',
      `<pre>${body}</pre>`,
      body,
    );
  }

  await safePut(env, env.TENSORFEED_CACHE, 'drift:last', JSON.stringify(report));
  return report;
}
