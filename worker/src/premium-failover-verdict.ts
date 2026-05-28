/**
 * Premium Failover Verdict.
 *
 * The infra/router persona's highest-stakes call: "provider A just
 * degraded, which operational provider do I fail over to for this task
 * right now?" It reads the live incident-triage feed to confirm A's
 * trouble, then runs the Route Verdict fusion with A (and any other
 * provider currently flagged failover_now) excluded, so the answer is the
 * best OPERATIONAL alternative, capability-first, with measured latency
 * and price as tiebreakers. One signed call instead of: read incidents,
 * pick a destination, re-score it.
 *
 * Reuses premium-route-verdict.ts wholesale (loadRouteVerdictInputs +
 * buildRouteVerdict with excludeProviders), so there is one fusion engine,
 * not two. Free preview gives the destination + the incident reason;
 * premium adds the full alternative ranking and an AFTA-signed receipt.
 * 1 credit, strict-premium.
 */

import type { Env } from './types';
import { safePut } from './kill-switch';
import type { RoutingTask } from './routing';
import {
  loadRouteVerdictInputs,
  buildRouteVerdict,
  type RouteVerdictInputs,
  type RouteVerdictResult,
  type VerdictCandidate,
} from './premium-route-verdict';

const TASKS: RoutingTask[] = ['code', 'reasoning', 'creative', 'general'];

export interface FailoverOptions {
  from: string; // the degraded provider to fail OVER from (required)
  task?: RoutingTask;
  model?: string;
}

export interface FromIncident {
  title: string;
  service: string;
  impact_classification: string;
  recommended_action: string;
  started_at: string;
  triage_summary: string;
}

export interface FailoverVerdictResult {
  ok: true;
  from: {
    provider: string;
    in_incident: boolean;
    incident: FromIncident | null;
  };
  query: { task: RoutingTask | null; model: string | null };
  capturedAt: string | null;
  excluded_providers: string[];
  failover_to: VerdictCandidate | null;
  alternatives: VerdictCandidate[];
  trust: RouteVerdictResult['trust'];
  why: string;
  claim: string;
  notes: string[];
  source_attribution: string;
}

function providerMatch(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x === y || x.includes(y) || y.includes(x);
}

/**
 * Pure failover builder. Inputs are the shared Route Verdict inputs (which
 * include the incident-triage snapshot).
 */
export function buildFailoverVerdict(
  inputs: RouteVerdictInputs,
  options: FailoverOptions,
  now: Date,
): FailoverVerdictResult {
  const from = options.from.toLowerCase().trim();
  const task: RoutingTask | null = options.task && TASKS.includes(options.task) ? options.task : null;

  // Find the most-relevant ongoing incident for the `from` provider, and
  // collect every provider currently flagged failover_now so we never
  // route to another failing provider.
  let fromIncident: FromIncident | null = null;
  const failoverProviders = new Set<string>();
  if (inputs.triage) {
    for (const card of inputs.triage.cards) {
      if (!card.ongoing) continue;
      if (card.recommended_action === 'failover_now') {
        failoverProviders.add(card.provider.toLowerCase());
      }
      if (providerMatch(card.provider, from)) {
        // Prefer the most actionable card: failover_now, then critical impact.
        const better =
          fromIncident === null ||
          card.recommended_action === 'failover_now' ||
          card.impact_classification === 'critical';
        if (better) {
          fromIncident = {
            title: card.title,
            service: card.service,
            impact_classification: card.impact_classification,
            recommended_action: card.recommended_action,
            started_at: card.started_at,
            triage_summary: card.triage_summary,
          };
        }
      }
    }
  }

  const excluded = Array.from(new Set<string>([from, ...failoverProviders]));

  // Run the route fusion, excluding the degraded + failing providers, and
  // require operational candidates (a failover target must be up).
  const route = buildRouteVerdict(
    inputs,
    { task: options.task, model: options.model, excludeProviders: excluded, requireOperational: true },
    now,
  );

  const failoverTo = route.verdict;
  const notes = [...route.notes];
  notes.push('Failover excludes the degraded provider and every provider currently flagged failover_now, then ranks the operational remainder capability-first.');

  let why: string;
  const taskLabel = task ?? 'general';
  if (fromIncident) {
    const dest = failoverTo ? `${failoverTo.model.name} (${failoverTo.model.provider})` : 'no operational alternative found';
    why = `${from} has an ongoing ${fromIncident.impact_classification} incident (${fromIncident.recommended_action}): ${fromIncident.title}. For ${taskLabel}, fail over to ${dest}.`;
  } else if (failoverTo) {
    why = `No ongoing incident found for ${from} in the current triage feed. The best operational ${taskLabel} alternative excluding ${from} is ${failoverTo.model.name} (${failoverTo.model.provider}).`;
  } else {
    why = `No operational alternative for ${taskLabel} could be found after excluding ${excluded.join(', ')}.`;
  }

  return {
    ok: true,
    from: { provider: from, in_incident: fromIncident !== null, incident: fromIncident },
    query: { task, model: options.model ?? null },
    capturedAt: route.capturedAt,
    excluded_providers: excluded,
    failover_to: failoverTo,
    alternatives: route.runners_up,
    trust: route.trust,
    why,
    claim:
      'TensorFeed confirms the named provider against the live incident-triage feed, then recommends the best operational failover target by the capability-first route verdict (excluding the degraded provider and any provider flagged failover_now), with an AFTA-signed receipt over the inputs. Not a guarantee of any provider SLA.',
    notes,
    source_attribution: 'TensorFeed status + Haiku incident triage + the route verdict fusion (pricing, benchmarks, usage, measured latency)',
  };
}

export async function computeFailoverVerdict(env: Env, options: FailoverOptions): Promise<FailoverVerdictResult> {
  const inputs = await loadRouteVerdictInputs(env);
  return buildFailoverVerdict(inputs, options, new Date());
}

/** IP-based daily rate limit for the free /api/preview/failover-verdict preview. */
export async function checkFailoverPreviewRateLimit(
  env: Env,
  ip: string,
  max = 10,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const date = new Date().toISOString().slice(0, 10);
  const key = `rate:failover-verdict-preview:${date}:${ip}`;
  const current = (await env.TENSORFEED_CACHE.get(key, 'json')) as { count: number } | null;
  const count = current?.count ?? 0;
  if (count >= max) return { allowed: false, remaining: 0, limit: max };
  await safePut(env, env.TENSORFEED_CACHE, key, JSON.stringify({ count: count + 1 }), { expirationTtl: 60 * 60 * 48 });
  return { allowed: true, remaining: max - count - 1, limit: max };
}
