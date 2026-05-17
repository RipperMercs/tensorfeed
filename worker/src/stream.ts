import { Env } from './types';

/**
 * Agent-subscribable event stream: the event log.
 *
 * Pull-based companion to the push webhook watches. Agents that cannot
 * host a public HTTPS callback (sandboxed, ephemeral, behind NAT) cannot
 * use watches at all; they consume this instead. Same event substrate,
 * two transports.
 *
 * v1 design (decisions locked 2026-05-17, see
 * tensorfeed-work/sse-signal-stream/DESIGN.md):
 *
 *   - One bounded ring (~500 events, ~25h TTL) under a single KV key.
 *   - appendStreamEvents() is called ONCE at the end of each existing
 *     run*WatchCycle (price/status/leaderboard/macro) plus a synthetic
 *     digest event, independent of whether any watch is registered. One
 *     KV write per cron tick per type, NEVER per subscriber. That
 *     per-cron (not per-request) write is the load-bearing property
 *     that keeps this inside the 100k/day KV budget.
 *   - Reads are cursor-based (monotonic seq) so the SSE endpoint can
 *     replay from Last-Event-ID and EventSource can auto-reconnect.
 *   - Free tail = the most recent ~25; the full ring + spec filtering is
 *     the strict-premium replay endpoint.
 *
 * This module is intentionally self-contained: nothing calls
 * appendStreamEvents yet. Wiring it into the watches.ts cron cycles is a
 * separate, slow+verify pass so a behavior-preserving change to the
 * sensitive watch path is never made under time pressure.
 *
 * No `any`: event payloads are Record<string, unknown>, mirroring the
 * existing webhook FirePayload `match` shape so a consumer parses a
 * stream event and a webhook fire identically.
 */

export type StreamEventType = 'price' | 'status' | 'leaderboard' | 'macro' | 'digest';

export const STREAM_EVENT_TYPES: StreamEventType[] = [
  'price',
  'status',
  'leaderboard',
  'macro',
  'digest',
];

export interface StreamEvent {
  /** Monotonic, gap-free within the log. Doubles as the SSE event id. */
  seq: number;
  type: StreamEventType;
  /** ISO 8601 append time. */
  at: string;
  /** Same shape as the webhook fire `match` record. */
  data: Record<string, unknown>;
}

interface StreamLog {
  /** Last assigned seq. */
  seq: number;
  /** Newest last. Bounded to STREAM_MAX_EVENTS. */
  events: StreamEvent[];
}

const STREAM_LOG_KEY = 'stream:log';
const STREAM_MAX_EVENTS = 500;
const STREAM_TTL_SECONDS = 25 * 60 * 60; // ~25h ring
export const STREAM_FREE_TAIL_DEFAULT = 25;
export const STREAM_FREE_TAIL_MAX = 25;

async function readLog(env: Env): Promise<StreamLog> {
  const v = (await env.TENSORFEED_CACHE.get(STREAM_LOG_KEY, 'json')) as StreamLog | null;
  if (v && typeof v.seq === 'number' && Array.isArray(v.events)) return v;
  return { seq: 0, events: [] };
}

/**
 * Append events of one type to the ring. Best-effort: it must NEVER
 * throw into a cron cycle, so the whole body is guarded the same way
 * logPremiumUsage and the watch dispatchers are. Last-write-wins under
 * concurrent same-tick appends from different cycles is accepted at MVP
 * scale, identical to the pay:rollup posture; revisit with a Durable
 * Object only if it ever matters.
 */
export async function appendStreamEvents(
  env: Env,
  type: StreamEventType,
  items: Record<string, unknown>[],
): Promise<void> {
  try {
    if (!items || items.length === 0) return;
    const log = await readLog(env);
    const at = new Date().toISOString();
    for (const data of items) {
      log.seq += 1;
      log.events.push({ seq: log.seq, type, at, data });
    }
    if (log.events.length > STREAM_MAX_EVENTS) {
      log.events = log.events.slice(-STREAM_MAX_EVENTS);
    }
    await env.TENSORFEED_CACHE.put(STREAM_LOG_KEY, JSON.stringify(log), {
      expirationTtl: STREAM_TTL_SECONDS,
    });
  } catch (e) {
    console.error('appendStreamEvents failed:', e);
  }
}

export interface ReadStreamOptions {
  /** Return only events with seq strictly greater than this. */
  since?: number;
  /** Restrict to these event types. */
  types?: StreamEventType[];
  /** Free-tier cap (clamped to STREAM_FREE_TAIL_MAX). Ignored when full. */
  limit?: number;
  /** Premium: return the full ring (up to STREAM_MAX_EVENTS), not the tail. */
  full?: boolean;
}

export interface ReadStreamResult {
  events: StreamEvent[];
  /** Cursor to pass as `since` on the next poll / Last-Event-ID. */
  next_cursor: number;
  /** Highest seq in the log right now (lets a client gauge backlog). */
  latest_cursor: number;
}

/**
 * Cursor read over the ring. Filters by since + types, then applies the
 * free tail cap unless `full` (premium). next_cursor is the last
 * returned seq, or the caller's cursor (or latest) when nothing matched,
 * so a polling client never rewinds.
 */
export async function readStreamEvents(
  env: Env,
  opts: ReadStreamOptions = {},
): Promise<ReadStreamResult> {
  const log = await readLog(env);
  const since = typeof opts.since === 'number' && opts.since >= 0 ? opts.since : 0;

  let evs = log.events.filter((e) => e.seq > since);
  if (opts.types && opts.types.length > 0) {
    const set = new Set<StreamEventType>(opts.types);
    evs = evs.filter((e) => set.has(e.type));
  }

  const cap = opts.full
    ? STREAM_MAX_EVENTS
    : Math.min(
        typeof opts.limit === 'number' && opts.limit > 0
          ? opts.limit
          : STREAM_FREE_TAIL_DEFAULT,
        STREAM_FREE_TAIL_MAX,
      );
  if (evs.length > cap) evs = evs.slice(-cap);

  const next_cursor = evs.length > 0 ? evs[evs.length - 1].seq : since || log.seq;
  return { events: evs, next_cursor, latest_cursor: log.seq };
}

/**
 * Parse a `types=` CSV into a validated subset. Returns undefined when
 * absent or nothing valid, meaning "all types" to readStreamEvents.
 */
export function parseStreamTypes(csv: string | null): StreamEventType[] | undefined {
  if (!csv) return undefined;
  const valid = new Set<string>(STREAM_EVENT_TYPES);
  const picked = csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => valid.has(s)) as StreamEventType[];
  return picked.length > 0 ? picked : undefined;
}
