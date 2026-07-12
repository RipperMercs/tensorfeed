import { detectBot } from './_bot-detection';
import { classifyRequest, refererHost } from './_classification';

/**
 * Cloudflare Pages Functions middleware that runs on every request to the
 * static site. Two independent, best-effort jobs, neither of which may ever
 * affect the page response:
 *
 * 1. Bot activity ping (unchanged): detects bot user agents and forwards a
 *    fire-and-forget {bot, path} ping to the Worker's /api/internal/track-bot
 *    route, where it lands in the same in-memory buffer that powers
 *    /api/agents/activity and the /agent-traffic dashboard.
 *
 * 2. Signal telemetry (added): classifies every page-side request with the
 *    shared classifier and writes ONE Analytics Engine data point to the
 *    tf_signal dataset, which /api/signal/ai-stats queries for the private
 *    Signal console (the live-vs-crawl AI intent split, referrals, geo, cache).
 *    Human static-asset requests are skipped so the dataset stays lean; every
 *    bot and every human pageview is recorded.
 *
 * This closes the coverage gap where editorial / SEO Pages routes
 * (/originals/*, /api-reference/*, /for-ai-agents, /models/*, etc) were
 * invisible to bot tracking because Cloudflare Pages serves them, not
 * the Worker.
 *
 * Setup:
 *  - PAGES_TRACK_SECRET (Pages env var, encrypted): same value as the Worker's
 *    PAGES_TRACK_SECRET. Without it the bot ping no-ops and pages serve normally.
 *  - SIGNAL_AE (Pages Analytics Engine binding -> dataset "tf_signal"): without
 *    it the telemetry write no-ops and pages serve normally.
 *
 * Cost: zero KV ops. One internal edge-to-edge fetch per detected bot hit, and
 * one Analytics Engine data point per pageview/bot (AE writes are unmetered
 * against the KV budget). Both are best-effort and wrapped so a failure can
 * never delay or break the served page.
 */

interface Env {
  PAGES_TRACK_SECRET?: string;
  SIGNAL_AE?: AnalyticsEngineDataset;
}

const TRACK_URL = 'https://tensorfeed.ai/api/internal/track-bot';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;

  let trackingStatus = 'no-bot';

  try {
    const ua = request.headers.get('user-agent') || '';
    const bot = detectBot(ua);

    if (bot) {
      trackingStatus = `bot:${bot}`;
      if (!env.PAGES_TRACK_SECRET) {
        trackingStatus = `bot:${bot}:no-secret`;
      } else {
        const url = new URL(request.url);
        const pathname = url.pathname;
        const isWorkerPath =
          pathname.startsWith('/api/') ||
          pathname.startsWith('/feed.') ||
          pathname.startsWith('/feed/') ||
          pathname === '/llms.txt' ||
          pathname === '/llms-full.txt';

        if (isWorkerPath) {
          trackingStatus = `bot:${bot}:skipped-worker-path`;
        } else {
          // Diagnostic mode: AWAIT the fetch so we can capture the
          // status code into the response header. Will revert to
          // waitUntil (fire-and-forget) once verified.
          try {
            const r = await fetch(TRACK_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Internal-Auth': env.PAGES_TRACK_SECRET,
                'User-Agent': 'TensorFeed-Pages-Track/1.0',
              },
              body: JSON.stringify({ bot, path: pathname }),
            });
            trackingStatus = `bot:${bot}:fetch:${r.status}`;
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'unknown';
            trackingStatus = `bot:${bot}:fetch-err:${msg.slice(0, 40)}`;
          }
        }
      }
    }
  } catch {
    trackingStatus = 'middleware-error';
  }

  const t0 = Date.now();
  const response = await next();
  const rtMs = Date.now() - t0;

  // Signal telemetry: one Analytics Engine data point per pageview/bot. Wrapped
  // so it can never affect the served page. Keep this blob/double layout in
  // lockstep with the SELECTs in the Worker's /api/signal/ai-stats handler:
  // those positions are the contract between the write here and the read there.
  try {
    if (env.SIGNAL_AE) {
      const url = new URL(request.url);
      const rawPath = url.pathname + url.search;
      const ua = request.headers.get('user-agent') || '';
      const referer = request.headers.get('referer') || '';
      const c = classifyRequest(ua, rawPath, referer);

      // Skip human static-asset noise (js/css/images/etc); keep every bot and
      // every human pageview so the dataset stays lean but complete for the
      // intent split, referrals, top pages, and page-like 404s.
      if (c.kind !== 'human' || c.isPage) {
        const country = (request.cf?.country as string | undefined) || '';
        const cacheStatus = response.headers.get('cf-cache-status') || '';
        const bytes = Number(response.headers.get('content-length') || 0);
        const hourUtc = new Date().getUTCHours();

        env.SIGNAL_AE.writeDataPoint({
          // blob1 kind | blob2 botName | blob3 vendor | blob4 mode | blob5 path
          // blob6 country | blob7 cacheStatus | blob8 referralSource | blob9 refererHost
          blobs: [
            c.kind,
            c.botName,
            c.vendor,
            c.mode,
            url.pathname, // path without query keeps cardinality sane
            country,
            cacheStatus,
            c.referralSource,
            refererHost(referer) || '(direct)',
          ],
          // double1 status | double2 bytes | double3 rtMs | double4 isPage
          // double5 isPageLike404 | double6 hourUtc
          doubles: [
            response.status,
            Number.isFinite(bytes) ? bytes : 0,
            rtMs,
            c.isPage ? 1 : 0,
            c.isPageLike404Path ? 1 : 0,
            hourUtc,
          ],
          // index1: low-cardinality grouping key for good sampling (<= 96 bytes).
          indexes: [(c.botName || c.kind).slice(0, 96)],
        });
      }
    }
  } catch {
    // Never let telemetry break a page response. Swallow and move on.
  }

  response.headers.set('X-Pages-Middleware', 'active');
  response.headers.set('X-Pages-Track', trackingStatus);
  return response;
};
