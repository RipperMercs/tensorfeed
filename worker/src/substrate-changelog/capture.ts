import type { Env } from '../types';
import { MODEL_DEPRECATIONS } from '../model-deprecations';
import {
  KV_CURSOR,
  KV_RECENT,
  KV_MODELS_SNAP,
  KV_DEPRECATIONS_SNAP,
  KV_SPECS_SNAP,
  KV_FRAMEWORKS_SNAP,
  kvDay,
  RECENT_CAP,
  SPEC_REPOS,
  FRAMEWORK_REPOS,
} from './constants';
import type {
  ModelSnapshot,
  DeprecationSnapshot,
  SpecSnapshot,
  FrameworkSnapshot,
  SubstrateEvent,
} from './types';

// slug -> owner/repo, so the diff can build the canonical releases-page URL for
// a framework_release without threading per-slug source URLs through the snapshot.
const FRAMEWORK_REPO_BY_SLUG: Record<string, string> = Object.fromEntries(
  FRAMEWORK_REPOS.map((f) => [f.slug, f.repo]),
);

// ===========================================================================
// Source shape for the KV `models` payload (the same data /api/models serves).
// Mirrors the ModelPricing / ProviderPricing / PricingPayload interfaces that
// compare-models.ts, routing.ts, and watches.ts already declare against this
// exact KV key, so the flatten here stays in lockstep with the public model
// feed. Only the four fields the diff needs are typed; the rest are ignored.
// ===========================================================================
interface SourceModel {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
}
interface SourceProvider {
  id: string;
  name: string;
  models: SourceModel[];
}
interface PricingPayload {
  lastUpdated?: string;
  providers: SourceProvider[];
}

// ===========================================================================
// Pure diff. A null prior for a dimension means "first run for that dimension":
// seed silently (skip it, emit nothing for it) so day one does not flood the
// log with an "everything added" burst. The forward-only clock starts the next
// run, once a baseline exists.
//
// Every `id` is `${type}:${subject}:${detailKey}` where detailKey is the NEW
// value (the new price pair, the new status, the new version). It carries no
// timestamp, so re-running the same change (a double-fired cron, a retried
// tick) yields the same id and the recent ring dedups on it. `at` is the
// detection day and is intentionally NOT part of the id.
//
// Every detail string is plain ASCII: no em dashes, no en dashes, no double
// hyphens. Price transitions are written with the word " to " ("input 3 to 2.5,
// output 15 to 12") so they read unambiguously and stay dash-free.
// ===========================================================================
export function diffSnapshots(
  prevModels: ModelSnapshot | null,
  currModels: ModelSnapshot,
  prevDeprecations: DeprecationSnapshot | null,
  currDeprecations: DeprecationSnapshot,
  prevSpecs: SpecSnapshot | null,
  currSpecs: SpecSnapshot,
  prevFrameworks: FrameworkSnapshot | null,
  currFrameworks: FrameworkSnapshot,
  today: string,
): SubstrateEvent[] {
  const events: SubstrateEvent[] = [];

  // === Models: added / removed / repriced ===
  if (prevModels !== null) {
    for (const [key, cur] of Object.entries(currModels)) {
      const prior = prevModels[key];
      if (!prior) {
        const detailKey = `${cur.input}/${cur.output}`;
        events.push({
          id: `model_added:${key}:${detailKey}`,
          type: 'model_added',
          at: today,
          subject: key,
          provider: cur.provider,
          detail: `added ${cur.name} at input ${cur.input}, output ${cur.output}`,
          version: null,
          source_url: null,
        });
        continue;
      }
      if (prior.input !== cur.input || prior.output !== cur.output) {
        const detailKey = `${cur.input}/${cur.output}`;
        events.push({
          id: `model_repriced:${key}:${detailKey}`,
          type: 'model_repriced',
          at: today,
          subject: key,
          provider: cur.provider,
          detail: `input ${prior.input} to ${cur.input}, output ${prior.output} to ${cur.output}`,
          version: null,
          source_url: null,
        });
      }
    }
    for (const [key, prior] of Object.entries(prevModels)) {
      if (!currModels[key]) {
        events.push({
          id: `model_removed:${key}:removed`,
          type: 'model_removed',
          at: today,
          subject: key,
          provider: prior.provider,
          detail: `removed ${prior.name} from the catalog`,
          version: null,
          source_url: null,
        });
      }
    }
  }

  // === Deprecations: new id or changed status ===
  if (prevDeprecations !== null) {
    const meta = new Map(MODEL_DEPRECATIONS.map((d) => [d.id, d]));
    for (const [id, status] of Object.entries(currDeprecations)) {
      const prior = prevDeprecations[id];
      if (prior === status) continue;
      const d = meta.get(id);
      const replacement = d?.replacement ? `, replacement ${d.replacement}` : '';
      events.push({
        id: `model_deprecated:${id}:${status}`,
        type: 'model_deprecated',
        at: today,
        subject: id,
        provider: d?.provider ?? null,
        detail: `${status}${replacement}`,
        version: null,
        source_url: d?.sourceUrl ?? null,
      });
    }
  }

  // === Specs: per-repo version change ===
  if (prevSpecs !== null) {
    const repos: Array<'mcp' | 'x402' | 'a2a'> = ['mcp', 'x402', 'a2a'];
    for (const repo of repos) {
      const prior = prevSpecs[repo];
      const cur = currSpecs[repo];
      if (cur === null) continue;
      if (prior === cur) continue;
      events.push({
        id: `spec_version:${repo}:${cur}`,
        type: 'spec_version',
        at: today,
        subject: repo,
        provider: null,
        detail: `${repo} spec version ${cur}`,
        version: cur,
        source_url: currSpecs.sources[repo],
      });
    }
  }

  // === Frameworks: per-repo GitHub release (new slug or changed tag) ===
  if (prevFrameworks !== null) {
    for (const [slug, tag] of Object.entries(currFrameworks)) {
      const prior = prevFrameworks[slug];
      if (prior === tag) continue;
      const repo = FRAMEWORK_REPO_BY_SLUG[slug];
      events.push({
        id: `framework_release:${slug}:${tag}`,
        type: 'framework_release',
        at: today,
        subject: slug,
        provider: null,
        detail: `${slug} released ${tag}`,
        version: tag,
        source_url: repo ? `https://github.com/${repo}/releases/tag/${tag}` : null,
      });
    }
  }

  return events;
}

// ===========================================================================
// x402 tag filter. The coinbase/x402 tags list mixes the bare spec tags (v1,
// v2) with language-SDK release tags (npm-x402@v1.1.0, pypi-x402@v2.7.0). Only
// the bare `vN` form is a protocol-spec version; everything else is an SDK
// release we ignore. Tags come back newest-first, so the first bare match is
// the latest spec version. Returns null when none is present.
// ===========================================================================
export function pickX402SpecTag(tags: Array<{ name: string }>): string | null {
  for (const t of tags) {
    if (/^v\d+$/.test(t.name)) return t.name;
  }
  return null;
}

// ===========================================================================
// Spec polling. Each repo is fetched independently and wrapped so a non-200 or
// a thrown fetch error KEEPS the prior value and emits nothing for that repo
// (never throws). A `User-Agent` header is required by GitHub and keeps the
// Worker's shared Cloudflare egress polite. Returns { version, sourceUrl }.
// ===========================================================================
interface GithubRelease { tag_name?: string; html_url?: string }
interface GithubTag { name: string }

async function pollSpecRepo(
  fetchFn: typeof fetch,
  url: string,
  kind: 'releases' | 'tags',
  prior: string | null,
  priorSource: string | null,
): Promise<{ version: string | null; sourceUrl: string | null }> {
  try {
    const res = await fetchFn(url, {
      headers: {
        'User-Agent': 'tensorfeed-substrate-changelog',
        Accept: 'application/vnd.github+json',
      },
      // Bound every GitHub poll so one stalled socket cannot ride the
      // Promise.all fan-out to the cron's invocation deadline. An AbortError is
      // caught below and falls back to the prior value (keep-prior-on-failure).
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { version: prior, sourceUrl: priorSource };

    if (kind === 'releases') {
      const data = (await res.json()) as GithubRelease[];
      const latest = Array.isArray(data) ? data[0] : undefined;
      const version = latest?.tag_name ?? null;
      if (!version) return { version: prior, sourceUrl: priorSource };
      return { version, sourceUrl: latest?.html_url ?? priorSource };
    }

    const data = (await res.json()) as GithubTag[];
    const tags = Array.isArray(data) ? data : [];
    const version = pickX402SpecTag(tags);
    if (!version) return { version: prior, sourceUrl: priorSource };
    return { version, sourceUrl: `https://github.com/coinbase/x402/releases/tag/${version}` };
  } catch {
    return { version: prior, sourceUrl: priorSource };
  }
}

// ===========================================================================
// Cron-driven capture. Reads the prior snapshots from KV, computes the current
// state (models flattened from the KV `models` payload, deprecations from the
// MODEL_DEPRECATIONS registry, specs polled from the three GitHub repos), diffs
// against the priors, and on any events prepends them to the recent ring (cap
// RECENT_CAP) and writes the day rollup. It ALWAYS writes the three current
// snapshots and the cursor { last_run_at, last_ok_at } so the next run has a
// baseline and the freshness layer has a captured_at. The whole body is
// best-effort: a single try/catch keeps the cron green and returns { events: n }.
// ===========================================================================
export async function captureSubstrateChangelog(
  env: Env,
  fetchFn: typeof fetch = fetch,
): Promise<{ events: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  try {
    // === Current models from the KV `models` payload ===
    const pricing = (await env.TENSORFEED_CACHE.get('models', 'json')) as PricingPayload | null;
    const currModels: ModelSnapshot = {};
    if (pricing?.providers) {
      for (const provider of pricing.providers) {
        if (!provider?.models) continue;
        for (const model of provider.models) {
          currModels[`${provider.id}/${model.id}`] = {
            provider: provider.name,
            name: model.name,
            input: model.inputPrice,
            output: model.outputPrice,
          };
        }
      }
    }

    // === Current deprecations from the registry ===
    const currDeprecations: DeprecationSnapshot = {};
    for (const d of MODEL_DEPRECATIONS) {
      currDeprecations[d.id] = d.status;
    }

    // === Prior snapshots (null when absent: first run seeds silently) ===
    const [prevModels, prevDeprecations, prevSpecs, prevFrameworks] = await Promise.all([
      env.TENSORFEED_CACHE.get(KV_MODELS_SNAP, 'json') as Promise<ModelSnapshot | null>,
      env.TENSORFEED_CACHE.get(KV_DEPRECATIONS_SNAP, 'json') as Promise<DeprecationSnapshot | null>,
      env.TENSORFEED_CACHE.get(KV_SPECS_SNAP, 'json') as Promise<SpecSnapshot | null>,
      env.TENSORFEED_CACHE.get(KV_FRAMEWORKS_SNAP, 'json') as Promise<FrameworkSnapshot | null>,
    ]);

    // === Poll the 3 spec repos; each keeps its prior on any failure ===
    const [mcp, x402, a2a] = await Promise.all([
      pollSpecRepo(fetchFn, SPEC_REPOS.mcp.url, SPEC_REPOS.mcp.kind, prevSpecs?.mcp ?? null, prevSpecs?.sources.mcp ?? null),
      pollSpecRepo(fetchFn, SPEC_REPOS.x402.url, SPEC_REPOS.x402.kind, prevSpecs?.x402 ?? null, prevSpecs?.sources.x402 ?? null),
      pollSpecRepo(fetchFn, SPEC_REPOS.a2a.url, SPEC_REPOS.a2a.kind, prevSpecs?.a2a ?? null, prevSpecs?.sources.a2a ?? null),
    ]);
    const currSpecs: SpecSnapshot = {
      mcp: mcp.version,
      x402: x402.version,
      a2a: a2a.version,
      sources: { mcp: mcp.sourceUrl, x402: x402.sourceUrl, a2a: a2a.sourceUrl },
    };

    // === Poll the framework repos' latest GitHub release; each keeps its prior
    // tag on any failure (pollSpecRepo never throws). Only slugs that resolve to
    // a tag are recorded, so a slow repo never erases a known baseline. ===
    const frameworkPolls = await Promise.all(
      FRAMEWORK_REPOS.map((f) =>
        pollSpecRepo(
          fetchFn,
          `https://api.github.com/repos/${f.repo}/releases?per_page=1`,
          'releases',
          prevFrameworks?.[f.slug] ?? null,
          null,
        ).then((r) => ({ slug: f.slug, version: r.version })),
      ),
    );
    const currFrameworks: FrameworkSnapshot = {};
    for (const p of frameworkPolls) {
      if (p.version !== null) currFrameworks[p.slug] = p.version;
    }

    // === Diff ===
    const events = diffSnapshots(
      prevModels,
      currModels,
      prevDeprecations,
      currDeprecations,
      prevSpecs,
      currSpecs,
      prevFrameworks,
      currFrameworks,
      today,
    );

    // === On events: prepend to the recent ring (cap) + write the day rollup ===
    if (events.length > 0) {
      const recentRaw = (await env.TENSORFEED_CACHE.get(KV_RECENT, 'json')) as SubstrateEvent[] | null;
      const seen = new Set<string>();
      const recent: SubstrateEvent[] = [];
      // Newest first, deduped by stable id so a re-fired event never doubles.
      for (const e of [...events, ...(recentRaw ?? [])]) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        recent.push(e);
      }
      if (recent.length > RECENT_CAP) recent.length = RECENT_CAP;
      await env.TENSORFEED_CACHE.put(KV_RECENT, JSON.stringify(recent));
      await env.TENSORFEED_CACHE.put(kvDay(today), JSON.stringify({ date: today, events }));
    }

    // === ALWAYS write the 4 current snapshots + cursor ===
    await env.TENSORFEED_CACHE.put(KV_MODELS_SNAP, JSON.stringify(currModels));
    await env.TENSORFEED_CACHE.put(KV_DEPRECATIONS_SNAP, JSON.stringify(currDeprecations));
    await env.TENSORFEED_CACHE.put(KV_SPECS_SNAP, JSON.stringify(currSpecs));
    await env.TENSORFEED_CACHE.put(KV_FRAMEWORKS_SNAP, JSON.stringify(currFrameworks));
    await env.TENSORFEED_CACHE.put(KV_CURSOR, JSON.stringify({ last_run_at: nowIso, last_ok_at: nowIso }));

    return { events: events.length };
  } catch (err) {
    // Best-effort: surface in the cron log, never throw out of the capture.
    console.error('captureSubstrateChangelog failed', err);
    return { events: 0 };
  }
}
