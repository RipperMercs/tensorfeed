import { Env, ServiceStatus, StatusPageResponse } from './types';
import { STATUS_PAGES, StatusPageConfig } from './sources';
import { dispatchStatusWatches, StatusTransition } from './watches';
import { recordPollCycle } from './status-counters';

function normalizeStatus(indicator: string): 'operational' | 'degraded' | 'down' | 'unknown' {
  switch (indicator?.toLowerCase()) {
    case 'none':
    case 'operational':
      return 'operational';
    case 'minor':
    case 'degraded_performance':
    case 'partial_outage':
      return 'degraded';
    case 'major':
    case 'major_outage':
    case 'critical':
      return 'down';
    default:
      return 'unknown';
  }
}

function normalizeComponentStatus(status: string): string {
  switch (status?.toLowerCase()) {
    case 'operational': return 'operational';
    case 'degraded_performance': return 'degraded';
    case 'partial_outage': return 'degraded';
    case 'major_outage': return 'down';
    case 'under_maintenance': return 'maintenance';
    default: return 'unknown';
  }
}

// Components considered peripheral to the question "can I call this provider's
// LLM/inference API right now?" Degradation in these surfaces should NOT bubble
// up to the headline status, since users hitting our /is-X-down pages and the
// homepage alert bar care about the inference path, not (e.g.) one ChatGPT
// workspace connector. Anything not matched by these patterns is treated as
// core (Chat Completions, Responses, Embeddings, Fine-tuning, Batch, etc).
const PERIPHERAL_COMPONENT_PATTERNS: RegExp[] = [
  /connector/i,
  /workspace/i,
  /\bapps?\b/i,
  /atlas/i,
  /\bgpts?\b/i,
  /codex web/i,
  /vs ?code/i,
  /\bcli\b/i,
  /fedramp/i,
  /compliance/i,
  /file upload/i,
  /^login/i,
  /^search$/i,
  /^agent$/i,
  /deep research/i,
  /^sora/i,
  /^conversations/i,
  /image generation/i,
  /voice mode/i,
  /dashboard/i,
  /console/i,
  /billing/i,
  /playground/i,
];

function isCoreComponent(name: string): boolean {
  return !PERIPHERAL_COMPONENT_PATTERNS.some((p) => p.test(name));
}

// Returns the worst status across core inference components, or null if the
// component list contains nothing identifiable as core (in which case callers
// should fall back to the umbrella status.indicator from Statuspage).
//
// When `explicitFilter` is supplied (e.g. GitHub's status page where we only
// care about Copilot components), every matching component is treated as core
// and the default peripheral filter is bypassed.
export function aggregateCoreStatus(
  components: { name: string; status: string }[],
  explicitFilter?: RegExp[],
): 'operational' | 'degraded' | 'down' | 'unknown' | null {
  const candidates = explicitFilter
    ? components.filter((c) => explicitFilter.some((p) => p.test(c.name)))
    : components.filter((c) => isCoreComponent(c.name));

  if (candidates.length === 0) return null;

  if (candidates.some((c) => c.status === 'down')) return 'down';
  if (candidates.some((c) => c.status === 'degraded')) return 'degraded';
  if (candidates.every((c) => c.status === 'operational' || c.status === 'maintenance')) {
    return 'operational';
  }
  return 'unknown';
}

// ── Instatus parser (Perplexity) ─────────────────────────────────────
// Instatus components use the same status vocabulary as Statuspage but the
// envelope differs and there's no umbrella indicator. We aggregate worst-of
// across the components array directly.
interface InstatusComponent {
  name: string;
  status: string; // OPERATIONAL | DEGRADEDPERFORMANCE | PARTIALOUTAGE | MAJOROUTAGE | UNDERMAINTENANCE
}
interface InstatusResponse {
  page?: { status?: string };
  components?: InstatusComponent[];
}

function normalizeInstatusComponentStatus(s: string): string {
  switch (s?.toUpperCase()) {
    case 'OPERATIONAL': return 'operational';
    case 'DEGRADEDPERFORMANCE': return 'degraded';
    case 'PARTIALOUTAGE': return 'degraded';
    case 'MAJOROUTAGE': return 'down';
    case 'UNDERMAINTENANCE': return 'maintenance';
    default: return 'unknown';
  }
}

function normalizeInstatusPageStatus(s: string): 'operational' | 'degraded' | 'down' | 'unknown' {
  switch (s?.toUpperCase()) {
    case 'UP':
    case 'OPERATIONAL': return 'operational';
    case 'HASISSUES':
    case 'DEGRADED': return 'degraded';
    case 'DOWN':
    case 'MAJOROUTAGE': return 'down';
    default: return 'unknown';
  }
}

// ── Google Cloud incidents.json parser (Vertex/Gemini) ───────────────
// GCP doesn't publish a Statuspage-style summary. We pull the incidents
// feed and look for any incident that (a) is currently active and (b)
// affects one of the configured product IDs (e.g. Vertex Gemini API).
interface GcpIncident {
  id: string;
  begin: string;
  end?: string | null;
  severity: string; // "low" | "medium" | "high"
  affected_products?: { id: string; title: string }[];
  most_recent_update?: { status?: string };
}

function aggregateGcpStatus(
  incidents: GcpIncident[],
  productIds: string[],
): { status: 'operational' | 'degraded' | 'down' | 'unknown'; affected: { name: string; status: string }[] } {
  const productSet = new Set(productIds);
  const active = incidents.filter((inc) => {
    if (inc.end) return false; // resolved
    return (inc.affected_products || []).some((p) => productSet.has(p.id));
  });

  if (active.length === 0) {
    return { status: 'operational', affected: [] };
  }

  const hasHigh = active.some((inc) => inc.severity?.toLowerCase() === 'high');
  const headline: 'down' | 'degraded' = hasHigh ? 'down' : 'degraded';

  const affected: { name: string; status: string }[] = [];
  for (const inc of active) {
    for (const p of inc.affected_products || []) {
      if (productSet.has(p.id)) {
        affected.push({
          name: p.title,
          status: inc.severity?.toLowerCase() === 'high' ? 'down' : 'degraded',
        });
      }
    }
  }
  return { status: headline, affected };
}

// ── AWS Health currentevents.json parser (Bedrock) ───────────────────
// AWS doesn't publish per-service status pages; instead currentevents.json
// is a single stream of all active events across every AWS service and
// region. We filter to events matching our service substring (e.g. "bedrock"
// against event.service / event.service_name / impacted_services keys),
// then take the worst severity. Conservative default: any matching event
// in currentevents is treated as active, since AWS removes resolved events
// from the stream after a window. Severity is derived from event text
// since AWS doesn't expose a numeric severity we can rely on.
interface AwsEvent {
  date?: string;
  region_name?: string;
  status?: string;
  service?: string;
  service_name?: string;
  summary?: string;
  event_log?: { date?: string; status?: string; summary?: string }[];
  impacted_services?: Record<string, unknown>;
}

function awsEventAffectsService(event: AwsEvent, match: string): boolean {
  const m = match.toLowerCase();
  if ((event.service || '').toLowerCase().includes(m)) return true;
  if ((event.service_name || '').toLowerCase().includes(m)) return true;
  for (const key of Object.keys(event.impacted_services || {})) {
    if (key.toLowerCase().includes(m)) return true;
  }
  return false;
}

function awsEventSeverity(event: AwsEvent): 'down' | 'degraded' {
  // AWS rarely calls things outright "down" in titles; words like
  // "unavailable", "service disruption", "outage", "major" are the
  // strong signals. Anything softer (errors, latency, increased) is
  // graded as degraded. Default biases toward degraded since AWS often
  // ships partial-region issues that don't merit a full down headline.
  const haystack = `${event.summary || ''} ${(event.event_log || [])
    .map((l) => l?.summary || '')
    .join(' ')}`.toLowerCase();
  if (
    haystack.includes('unavailable') ||
    haystack.includes('outage') ||
    haystack.includes('service disruption') ||
    haystack.includes('major')
  ) {
    return 'down';
  }
  return 'degraded';
}

export function aggregateAwsStatus(
  events: AwsEvent[],
  serviceMatch: string,
): { status: 'operational' | 'degraded' | 'down' | 'unknown'; affected: { name: string; status: string }[] } {
  const matching = events.filter((e) => awsEventAffectsService(e, serviceMatch));
  if (matching.length === 0) {
    return { status: 'operational', affected: [] };
  }

  const hasDown = matching.some((e) => awsEventSeverity(e) === 'down');
  const headline: 'down' | 'degraded' = hasDown ? 'down' : 'degraded';

  const affected = matching.map((e) => ({
    name: `${e.service_name || e.service || 'AWS'} (${e.region_name || 'global'})`,
    status: awsEventSeverity(e),
  }));
  return { status: headline, affected };
}

// Exported only for unit tests.
export const _internal = {
  normalizeInstatusComponentStatus,
  normalizeInstatusPageStatus,
  aggregateGcpStatus,
  aggregateAwsStatus,
  awsEventAffectsService,
  awsEventSeverity,
};

function parseHtmlStatus(html: string): 'operational' | 'degraded' | 'down' | 'unknown' {
  const lower = html.toLowerCase();
  // Check for clear positive banner text first (most reliable)
  if (lower.includes('all systems operational') || lower.includes('all services are online') || lower.includes('fully operational') || lower.includes('all monitors are up')) {
    return 'operational';
  }
  // Check for active incident banners (not historical logs)
  if (lower.includes('active incident') || lower.includes('ongoing incident') || lower.includes('service disruption')) {
    if (lower.includes('major') || lower.includes('critical')) return 'down';
    return 'degraded';
  }
  // If the page loaded successfully and has status content, assume operational
  // (pages with real issues prominently display incident banners)
  if (html.length > 1000) {
    return 'operational';
  }
  return 'unknown';
}

async function fetchServiceStatus(service: StatusPageConfig): Promise<ServiceStatus> {
  try {
    const response = await fetch(service.url, {
      headers: { 'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        name: service.name,
        provider: service.provider,
        status: 'unknown',
        statusPageUrl: service.statusPageUrl,
        components: [],
        lastChecked: new Date().toISOString(),
      };
    }

    // HTML-based status pages (Better Stack, Checkly, etc.)
    if (service.type === 'html') {
      const html = await response.text();
      return {
        name: service.name,
        provider: service.provider,
        status: parseHtmlStatus(html),
        statusPageUrl: service.statusPageUrl,
        components: [],
        lastChecked: new Date().toISOString(),
      };
    }

    // Instatus (Perplexity)
    if (service.type === 'instatus') {
      const data: InstatusResponse = await response.json();
      const allComponents = (data.components || []).map((c) => ({
        name: c.name,
        status: normalizeInstatusComponentStatus(c.status),
      }));
      const componentDerived = aggregateCoreStatus(allComponents, service.componentFilter);
      const headlineStatus =
        componentDerived ?? normalizeInstatusPageStatus(data.page?.status || '');
      return {
        name: service.name,
        provider: service.provider,
        status: headlineStatus,
        statusPageUrl: service.statusPageUrl,
        components: allComponents.slice(0, 6),
        lastChecked: new Date().toISOString(),
      };
    }

    // Google Cloud incidents.json (Vertex Gemini API et al)
    if (service.type === 'gcp-incidents') {
      const incidents: GcpIncident[] = await response.json();
      const productIds = service.gcpProductIds || [];
      const { status: headlineStatus, affected } = aggregateGcpStatus(incidents, productIds);
      return {
        name: service.name,
        provider: service.provider,
        status: headlineStatus,
        statusPageUrl: service.statusPageUrl,
        components: affected.slice(0, 6),
        lastChecked: new Date().toISOString(),
      };
    }

    // AWS Health currentevents.json (Bedrock)
    if (service.type === 'aws-events') {
      const events: AwsEvent[] = await response.json();
      const match = service.awsServiceMatch || '';
      const { status: headlineStatus, affected } = aggregateAwsStatus(events, match);
      return {
        name: service.name,
        provider: service.provider,
        status: headlineStatus,
        statusPageUrl: service.statusPageUrl,
        components: affected.slice(0, 6),
        lastChecked: new Date().toISOString(),
      };
    }

    // Atlassian Statuspage JSON API (default)
    const data: StatusPageResponse = await response.json();

    const allComponents = (data.components || [])
      .filter((c: { name: string }) => !c.name.toLowerCase().includes('visit'))
      .map((c: { name: string; status: string }) => ({
        name: c.name,
        status: normalizeComponentStatus(c.status),
      }));

    // Prefer the worst-of core inference components for the headline status.
    // Statuspage's umbrella `indicator` flips to "minor" for any non-core
    // component (e.g. "Connectors/Apps"), producing false alarms on our /is-X-
    // down pages and homepage alert bar. Fall back to the umbrella only when
    // we can't identify any core components (e.g. an oddly-named status page).
    //
    // When the service config supplies an explicit componentFilter (e.g.
    // GitHub's status page where we only care about Copilot rows), we ignore
    // the umbrella entirely since it covers far more than our service.
    const componentDerived = aggregateCoreStatus(allComponents, service.componentFilter);
    const headlineStatus = service.componentFilter
      ? componentDerived ?? 'unknown'
      : componentDerived ?? normalizeStatus(data.status?.indicator);

    // Surface in-scope components first so the truncated display shows the
    // parts that matter (Chat Completions, Embeddings, Copilot, etc) before
    // peripheral ones.
    const inScope = (c: { name: string }) =>
      service.componentFilter
        ? service.componentFilter.some((p) => p.test(c.name))
        : isCoreComponent(c.name);
    const sortedComponents = [
      ...allComponents.filter(inScope),
      ...allComponents.filter((c) => !inScope(c)),
    ].slice(0, 6);

    return {
      name: service.name,
      provider: service.provider,
      status: headlineStatus,
      statusPageUrl: service.statusPageUrl,
      components: sortedComponents,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    console.warn(`Status check failed for ${service.name}:`, error);
    return {
      name: service.name,
      provider: service.provider,
      status: 'unknown',
      statusPageUrl: service.statusPageUrl,
      components: [],
      lastChecked: new Date().toISOString(),
    };
  }
}

export async function pollStatusPages(env: Env): Promise<void> {
  console.log(`Status poll starting - ${STATUS_PAGES.length} services`);

  const results = await Promise.allSettled(STATUS_PAGES.map(fetchServiceStatus));

  const statuses: ServiceStatus[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      statuses.push(result.value);
    }
  }

  await env.TENSORFEED_STATUS.put('services', JSON.stringify(statuses), {
    metadata: { count: statuses.length, updatedAt: new Date().toISOString() },
  });

  // Store a summary for quick widget reads
  const summary = statuses.map(s => ({
    name: s.name,
    status: s.status,
    provider: s.provider,
  }));
  await env.TENSORFEED_STATUS.put('summary', JSON.stringify(summary));

  // ── Incident detection ──────────────────────────────────────────────
  const previousRaw = await env.TENSORFEED_STATUS.get('previous-status', 'json') as
    { name: string; status: string; provider: string }[] | null;

  const watchTransitions: StatusTransition[] = [];
  if (previousRaw) {
    const prevMap = new Map(previousRaw.map(s => [s.name, s]));
    const incidentsRaw = await env.TENSORFEED_STATUS.get('incidents', 'json') as Incident[] | null;
    const incidents: Incident[] = incidentsRaw || [];
    const now = new Date().toISOString();

    for (const current of statuses) {
      const prev = prevMap.get(current.name);
      if (!prev) continue;

      const prevStatus = prev.status;
      const curStatus = current.status;

      if (prevStatus === curStatus) continue;
      if (curStatus === 'unknown' || prevStatus === 'unknown') continue;

      // Collect for premium watch dispatch (fires only on real transitions,
      // matching the same edge filter the incident detector uses).
      watchTransitions.push({
        provider: current.provider,
        name: current.name,
        from: prevStatus as StatusTransition['from'],
        to: curStatus as StatusTransition['to'],
      });

      // Service went from operational to degraded/down
      if (prevStatus === 'operational' && (curStatus === 'degraded' || curStatus === 'down')) {
        const incident: Incident = {
          id: `${current.name}-${Date.now()}`,
          service: current.name,
          provider: current.provider,
          severity: curStatus === 'down' ? 'major' : 'minor',
          title: `${current.name} ${curStatus === 'down' ? 'outage' : 'degraded performance'}`,
          startedAt: now,
          resolvedAt: null,
          durationMinutes: null,
        };
        incidents.push(incident);
      }

      // Service recovered to operational
      if (curStatus === 'operational' && (prevStatus === 'degraded' || prevStatus === 'down')) {
        // Resolve the most recent open incident for this service
        for (let i = incidents.length - 1; i >= 0; i--) {
          if (incidents[i].service === current.name && incidents[i].resolvedAt === null) {
            incidents[i].resolvedAt = now;
            const start = new Date(incidents[i].startedAt).getTime();
            incidents[i].durationMinutes = Math.round((Date.now() - start) / 60000);
            break;
          }
        }
      }
    }

    // Prune incidents older than 90 days
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const pruned = incidents.filter(i => new Date(i.startedAt).getTime() > cutoff);

    await env.TENSORFEED_STATUS.put('incidents', JSON.stringify(pruned));
  }

  // Save current status snapshot for next comparison
  const snapshot = statuses.map(s => ({ name: s.name, status: s.status, provider: s.provider }));
  await env.TENSORFEED_STATUS.put('previous-status', JSON.stringify(snapshot));

  // Record minute-resolution counters for the uptime leaderboard. One read +
  // one write per cycle, ~1440 KV ops/day total. Powers /api/status/leaderboard
  // and the premium /api/premium/status/leaderboard endpoint.
  try {
    await recordPollCycle(env, statuses.map(s => ({ name: s.name, status: s.status })));
  } catch (e) {
    console.error('recordPollCycle failed:', e instanceof Error ? e.message : e);
  }

  const operational = statuses.filter(s => s.status === 'operational').length;
  const degraded = statuses.filter(s => s.status === 'degraded').length;
  const down = statuses.filter(s => s.status === 'down').length;

  console.log(`Status poll complete - ${operational} operational, ${degraded} degraded, ${down} down`);

  // Premium watch dispatch (no-op when no watches are subscribed)
  if (watchTransitions.length > 0) {
    try {
      const summary = await dispatchStatusWatches(env, watchTransitions);
      if (summary.watches_fired > 0) {
        console.log(
          `status watches fired: ${summary.watches_fired} of ${summary.watches_evaluated} (failures: ${summary.delivery_failures})`,
        );
      }
    } catch (e) {
      console.error('dispatchStatusWatches failed:', e instanceof Error ? e.message : e);
    }
  }
}

export interface Incident {
  id: string;
  service: string;
  provider: string;
  severity: string;
  title: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMinutes: number | null;
}
