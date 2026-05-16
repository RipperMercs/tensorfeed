/**
 * TensorFeed Jobs: daily morning digest.
 *
 * Server-side replacement for the originally-scoped Cowork routine. The
 * remote-routine path could not send mail (no attachable send-capable
 * Gmail connector exposed to the routines system), so the digest lives
 * here and reuses the Worker's existing Resend sender. Fired once per
 * day from the scheduled handler on the "0 15 * * *" cron, which is
 * 08:00 America/Los_Angeles during PDT (07:00 during PST).
 *
 * Discipline mirrors jobs.ts: selection and body building are pure and
 * caller-passes-now, fully covered by jobs-digest.test.ts. The single
 * impure orchestrator does the KV read plus one Resend send and never
 * throws (sendEmail swallows its own failures).
 *
 * Content rule: no em dashes, no double hyphens anywhere in the subject
 * or body. Plain and factual, no marketing language. The plain() guard
 * scrubs poster free-text so the digest cannot violate the rule even if
 * a poster does.
 */

import type { Env } from './types';
import type { GigRecord } from './jobs';
import { listGigs } from './jobs-store';
import { sendEmail } from './alerts';

export const DIGEST_WINDOW_SEC = 24 * 60 * 60;
// Soft cap so a burst day cannot produce an unbounded email. The board
// is low volume; this is a guard, not an expected ceiling.
export const DIGEST_MAX_SHOWN = 25;
// KV scan headroom above the cap so window filtering is not starved.
const LIST_LIMIT = 60;

/**
 * Select gigs created within `windowSec` of `nowSec`, newest first.
 * Pure: caller passes now (epoch seconds) and the candidate list.
 * created_at is epoch seconds (assembleGigRecord writes nowSec).
 */
export function selectNewGigs(
  gigs: GigRecord[],
  nowSec: number,
  windowSec: number = DIGEST_WINDOW_SEC,
): GigRecord[] {
  const cutoff = nowSec - windowSec;
  return gigs
    .filter((g) => typeof g.created_at === 'number' && g.created_at >= cutoff)
    .sort((a, b) => b.created_at - a.created_at);
}

/**
 * Scrub any long dash or run of hyphens out of poster free-text so the
 * digest body itself never violates the content rule. Single hyphens
 * (vocab categories like "data-entry") are preserved.
 */
function plain(s: string): string {
  return s
    .replace(/[‒–—―−]/g, ', ')
    .replace(/-{2,}/g, ', ')
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface DigestEmail {
  subject: string;
  text: string;
  html: string;
}

/**
 * Build the digest email from already-selected new gigs. Pure. Caps the
 * rendered list at `maxShown` with an overflow line.
 */
export function buildJobsDigest(
  gigs: GigRecord[],
  maxShown: number = DIGEST_MAX_SHOWN,
): DigestEmail {
  const n = gigs.length;
  const shown = gigs.slice(0, Math.max(0, maxShown));
  const overflow = n - shown.length;

  const subject = `TensorFeed Jobs: ${n} new listing${n === 1 ? '' : 's'}`;
  const intro = `${n} new gig listing${n === 1 ? '' : 's'} posted to the TensorFeed jobs board in the last 24 hours.`;

  const budgetOf = (g: GigRecord) =>
    g.budget_note && g.budget_note.trim() ? plain(g.budget_note) : 'none';

  const text = [
    intro,
    '',
    shown
      .map((g) =>
        [
          `Title: ${plain(g.title)}`,
          `Category: ${plain(g.category)}`,
          `Budget note: ${budgetOf(g)}`,
          `Poster: ${g.poster_addr}`,
          `Link: https://tensorfeed.ai/api/jobs/${g.id}`,
        ].join('\n'),
      )
      .join('\n\n'),
    ...(overflow > 0
      ? ['', `Plus ${overflow} more not shown. See https://tensorfeed.ai/api/jobs`]
      : []),
  ].join('\n');

  const htmlBlocks = shown
    .map(
      (g) =>
        `<p style="margin:0 0 14px;font-family:ui-monospace,Menlo,monospace;font-size:13px">` +
        `<strong>${escapeHtml(plain(g.title))}</strong><br>` +
        `Category: ${escapeHtml(plain(g.category))}<br>` +
        `Budget note: ${escapeHtml(budgetOf(g))}<br>` +
        `Poster: ${escapeHtml(g.poster_addr)}<br>` +
        `<a href="https://tensorfeed.ai/api/jobs/${escapeHtml(g.id)}">https://tensorfeed.ai/api/jobs/${escapeHtml(g.id)}</a>` +
        `</p>`,
    )
    .join('');
  const overflowHtml =
    overflow > 0
      ? `<p style="font-size:12px;color:#64748b">Plus ${overflow} more not shown. See <a href="https://tensorfeed.ai/api/jobs">/api/jobs</a></p>`
      : '';
  const html =
    `<h2 style="margin:0 0 12px">TensorFeed jobs board</h2>` +
    `<p>${escapeHtml(intro)}</p>` +
    htmlBlocks +
    overflowHtml;

  return { subject, text, html };
}

/**
 * Daily orchestrator. Lists active gigs, selects those created in the
 * last 24h, and emails one digest if there are any. Zero new gigs sends
 * no email (the cron-status log is the heartbeat). Never throws.
 */
export async function sendJobsMorningDigest(
  env: Env,
): Promise<'sent' | 'clean' | 'skipped'> {
  const nowSec = Math.floor(Date.now() / 1000);
  const gigs = await listGigs(env, { now: nowSec, limit: LIST_LIMIT });
  const fresh = selectNewGigs(gigs, nowSec);

  if (fresh.length === 0) {
    console.log('jobs morning digest: 0 new listings in last 24h, no email sent');
    return 'clean';
  }

  const { subject, text, html } = buildJobsDigest(fresh);
  const ok = await sendEmail(env, subject, html, text);
  console.log(
    JSON.stringify({
      event: 'jobs_morning_digest',
      new_count: fresh.length,
      emailed: ok,
    }),
  );
  return ok ? 'sent' : 'skipped';
}
