# TensorFeed Phase 0: Daily Data Snapshots

## What This Is

A self-contained spec for adding daily data snapshots to the TensorFeed Worker. No payment infrastructure, no premium endpoints. Just start capturing historical data every day so it exists when the premium tier launches.

The historical dataset is the moat. It cannot be backfilled. Every day without snapshots is a day of pricing/status/benchmark history lost forever.

## Scope

1. New Worker module: `worker/src/snapshots-daily.ts`
2. New cron trigger: runs once daily at 7:05 AM UTC (5 min after existing catalog update)
3. New API endpoints: `/api/snapshots` and `/api/snapshots/:date/:type`
4. KV storage in existing `TENSORFEED_CACHE` namespace
5. Add to `/developers` docs and `/api/meta` endpoint discovery

## Important: Do NOT Touch the Existing `snapshots.ts`

There is already a module at `worker/src/snapshots.ts`. That module handles **fallback restoration** (restoring last known-good payloads when live polls fail). It is unrelated to historical snapshotting. The new module here is `worker/src/snapshots-daily.ts`, a separate file. Do not merge them, do not modify the existing one, do not import the existing one.

## What Gets Snapshotted

Four data types, captured daily:

### 1. Pricing (`snapshot:{date}:pricing`)
Full contents of the `models` key from `TENSORFEED_NEWS` KV (same data that powers `/api/models`). Contains all providers, models, input/output pricing, context windows.

### 2. Benchmarks (`snapshot:{date}:benchmarks`)
Full contents of the `benchmarks` key from `TENSORFEED_NEWS` KV (same data that powers `/api/benchmarks`). Contains all model scores across MMLU-Pro, HumanEval, GPQA Diamond, MATH, SWE-bench.

### 3. Status Summary (`snapshot:{date}:status`)
For each tracked provider, capture: provider name, status (operational/degraded/down), number of components reporting issues, and the last-checked timestamp. This is a summary, not the full component tree.

### 4. Agent Activity (`snapshot:{date}:activity`)
Daily agent traffic summary: total bot hits for the day, breakdown by bot name (ClaudeBot, GPTBot, PerplexityBot, etc.), and top 10 endpoints hit. Pull from the existing `agent-counter-daily` and `agent-activity` keys in `TENSORFEED_CACHE`.

## Worker Module: `worker/src/snapshots-daily.ts`

```typescript
import { Env } from './types';

interface SnapshotMeta {
  date: string;
  type: string;
  capturedAt: string;
  sizeBytes: number;
}

const SNAPSHOT_TYPES = ['pricing', 'benchmarks', 'status', 'activity'] as const;
type SnapshotType = typeof SNAPSHOT_TYPES[number];

/**
 * Capture daily snapshots of all data types.
 * Called by the daily cron (7:05 AM UTC, after catalog update finishes).
 */
export async function captureDailySnapshots(env: Env): Promise<void> {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const captures: { type: SnapshotType; fetch: () => Promise<unknown> }[] = [
    {
      type: 'pricing',
      fetch: async () => {
        const raw = await env.TENSORFEED_NEWS.get('models', 'json');
        return raw || null;
      },
    },
    {
      type: 'benchmarks',
      fetch: async () => {
        const raw = await env.TENSORFEED_NEWS.get('benchmarks', 'json');
        return raw || null;
      },
    },
    {
      type: 'status',
      fetch: async () => {
        // Build summary from individual provider status keys
        const statusRaw = await env.TENSORFEED_STATUS.get('all-statuses', 'json');
        if (!statusRaw || !Array.isArray(statusRaw)) return null;
        return (statusRaw as Array<{
          name: string;
          provider: string;
          status: string;
          lastChecked: string;
          components?: Array<{ name: string; status: string }>;
        }>).map(s => ({
          name: s.name,
          provider: s.provider,
          status: s.status,
          lastChecked: s.lastChecked,
          degradedComponents: (s.components || []).filter(
            c => c.status !== 'operational'
          ).length,
        }));
      },
    },
    {
      type: 'activity',
      fetch: async () => {
        const [counter, recent] = await Promise.all([
          env.TENSORFEED_CACHE.get('agent-counter-daily', 'json'),
          env.TENSORFEED_CACHE.get('agent-activity', 'json'),
        ]);
        // Aggregate bot hits by name
        const botCounts: Record<string, number> = {};
        const endpointCounts: Record<string, number> = {};
        if (Array.isArray(recent)) {
          for (const hit of recent as Array<{ bot: string; endpoint: string }>) {
            botCounts[hit.bot] = (botCounts[hit.bot] || 0) + 1;
            endpointCounts[hit.endpoint] = (endpointCounts[hit.endpoint] || 0) + 1;
          }
        }
        return {
          date,
          totalHits: (counter as { count: number } | null)?.count || 0,
          byBot: botCounts,
          topEndpoints: Object.entries(endpointCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([endpoint, count]) => ({ endpoint, count })),
        };
      },
    },
  ];

  const results: SnapshotMeta[] = [];

  for (const { type, fetch } of captures) {
    try {
      const data = await fetch();
      if (data === null) {
        console.warn(`Snapshot ${type}: no data available, skipping`);
        continue;
      }
      const json = JSON.stringify(data);
      const key = `snapshot:${date}:${type}`;

      // Check if already captured today (idempotent)
      const existing = await env.TENSORFEED_CACHE.get(key);
      if (existing) {
        console.log(`Snapshot ${type}: already captured for ${date}`);
        continue;
      }

      await env.TENSORFEED_CACHE.put(key, json);
      results.push({
        date,
        type,
        capturedAt: new Date().toISOString(),
        sizeBytes: json.length,
      });
      console.log(`Snapshot ${type}: captured ${json.length} bytes`);
    } catch (e) {
      console.error(`Snapshot ${type} failed:`, e);
    }
  }

  // Update the snapshot index (list of all captured dates)
  await updateSnapshotIndex(env, date);

  console.log(`Daily snapshots complete: ${results.length}/${captures.length} captured`);
}

/**
 * Maintain a rolling index of snapshot dates for the list endpoint.
 */
async function updateSnapshotIndex(env: Env, date: string): Promise<void> {
  const indexRaw = await env.TENSORFEED_CACHE.get('snapshot:index', 'json');
  const index = (indexRaw as string[] | null) || [];
  if (!index.includes(date)) {
    index.unshift(date); // newest first
    // Keep 365 days max
    if (index.length > 365) index.length = 365;
    await env.TENSORFEED_CACHE.put('snapshot:index', JSON.stringify(index));
  }
}

/**
 * List available snapshot dates.
 */
export async function listSnapshots(env: Env): Promise<{
  dates: string[];
  types: string[];
  count: number;
}> {
  const indexRaw = await env.TENSORFEED_CACHE.get('snapshot:index', 'json');
  const dates = (indexRaw as string[] | null) || [];
  return {
    dates,
    types: [...SNAPSHOT_TYPES],
    count: dates.length,
  };
}

/**
 * Read a specific snapshot.
 */
export async function getSnapshot(
  env: Env,
  date: string,
  type: string
): Promise<unknown | null> {
  if (!SNAPSHOT_TYPES.includes(type as SnapshotType)) return null;
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const key = `snapshot:${date}:${type}`;
  return env.TENSORFEED_CACHE.get(key, 'json');
}
```

## Cron Integration

In `worker/src/index.ts`, add to the `scheduled()` handler:

```typescript
import { captureDailySnapshots } from './snapshots-daily';

// Inside the scheduled() export, add a case for the 7:05 cron:
// The existing 7 AM cron handles catalog updates.
// Add a 5-minute offset cron "5 7 * * *" for snapshots.
// Or: append snapshot capture to the existing "0 7 * * *" handler
// after catalog update completes.
```

Option A (preferred): Add `5 7 * * *` to wrangler.toml crons and dispatch to `captureDailySnapshots`.
Option B: Call `captureDailySnapshots(env)` at the end of the existing `0 7 * * *` handler, after catalog update.

Either works. Option A is cleaner separation.

### wrangler.toml addition (if Option A)
```toml
[triggers]
crons = [
  "*/10 * * * *",
  "*/5 * * * *",
  "0 * * * *",
  "0 */2 * * *",
  "0 7 * * *",
  "5 7 * * *",    # <-- NEW: daily snapshots (5 min after catalog)
  "30 8 * * *",
  "30 14 * * *",
]
```

## API Endpoints

### `GET /api/snapshots`
Returns the list of available snapshot dates and types.

```json
{
  "ok": true,
  "dates": ["2026-04-26", "2026-04-25", "2026-04-24"],
  "types": ["pricing", "benchmarks", "status", "activity"],
  "count": 3
}
```

### `GET /api/snapshots/:date/:type`
Returns snapshot data for a specific date and type.

```
GET /api/snapshots/2026-04-26/pricing
```

Response: the raw pricing data as captured on that date.

404 if snapshot not found. 400 if date format invalid or type unknown.

### Route handling in `worker/src/index.ts`

```typescript
// Add to the route handler:
if (path === '/api/snapshots') {
  const data = await listSnapshots(env);
  return jsonResponse({ ok: true, ...data });
}

if (path.startsWith('/api/snapshots/')) {
  const parts = path.replace('/api/snapshots/', '').split('/');
  if (parts.length !== 2) {
    return jsonResponse({ ok: false, error: 'Use /api/snapshots/{date}/{type}' }, 400);
  }
  const [date, type] = parts;
  const data = await getSnapshot(env, date, type);
  if (!data) {
    return jsonResponse({ ok: false, error: 'Snapshot not found' }, 404);
  }
  return jsonResponse({ ok: true, date, type, data }, 200, 86400); // cache 24h, immutable
}
```

## Documentation Updates

### `/developers` page
Add a "Historical Snapshots" section:
```
## Historical Data Snapshots

TensorFeed captures daily snapshots of pricing, benchmarks, service status, and agent activity.
Use these to track trends, detect pricing changes, or build historical analysis.

GET /api/snapshots              List available dates
GET /api/snapshots/{date}/{type} Read a snapshot (pricing, benchmarks, status, activity)

Snapshots are captured daily at 7:05 AM UTC and retained for 365 days.
```

### `/api/meta` endpoint
Add snapshots endpoints to the discovery manifest.

### `public/llms.txt`
Add under Agent API Endpoints:
```
- [Snapshots API](https://tensorfeed.ai/api/snapshots): Historical daily snapshots of pricing, benchmarks, status, and agent activity
```

## KV Budget Impact

Each daily snapshot is roughly:
- Pricing: ~3KB
- Benchmarks: ~2KB
- Status: ~1KB
- Activity: ~1KB
- Index: ~2KB (grows slowly)

Total per day: ~9KB across 5 KV writes + 4 KV reads = 9 operations.
Annual: ~3,285 operations and ~3.2MB storage. Negligible impact on the 100K daily ops budget.

## Acceptance Criteria

1. `worker/src/snapshots-daily.ts` exists; `worker/src/snapshots.ts` is untouched.
2. `worker/wrangler.toml` includes the new `5 7 * * *` cron trigger.
3. Worker deploys clean with no TypeScript errors.
4. Manually triggering the cron (via `wrangler tail` + a forced dispatch, or the next 7:05 UTC) writes 4 snapshot keys to `TENSORFEED_CACHE`.
5. `GET /api/snapshots` returns today's date with the 4 types listed.
6. `GET /api/snapshots/{today}/pricing` returns valid JSON whose top-level shape matches what `/api/models` returns.
7. `GET /api/snapshots/{today}/benchmarks` returns data matching `/api/benchmarks`.
8. `GET /api/snapshots/2099-01-01/pricing` returns 404.
9. `GET /api/snapshots/today/garbage` returns 400.
10. Snapshots are idempotent: dispatching the cron twice on the same day does not duplicate writes (idempotent guard in `captureDailySnapshots`).
11. `/api/meta` includes both new endpoints.
12. `/developers` page documents the snapshot API.
13. `public/llms.txt` includes the snapshot endpoints.
14. `CLAUDE.md` "Worker Cron Schedule" section documents the new 07:05 UTC cron.
15. Zero regressions in existing endpoints (`/api/news`, `/api/status`, `/api/models`, `/api/benchmarks` smoke-tested after deploy).
16. `wrangler tail` shows clean log output during the next 07:05 UTC cron firing (no errors, ~4 KV writes).

## What This Does NOT Include

- Payment infrastructure (Phase 1)
- Premium/gated endpoints (Phase 1)
- Routing score computation (Phase 1)
- SDK (Phase 1)
- Any frontend changes beyond docs

This is intentionally minimal. Ship it, start the clock, move on to Phase 1.
