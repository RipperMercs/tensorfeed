import { Env, ServiceStatus, StatusPageResponse } from './types';
import { STATUS_PAGES } from './sources';
import { dispatchStatusWatches, StatusTransition } from './watches';

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

async function fetchServiceStatus(
  service: typeof STATUS_PAGES[number]
): Promise<ServiceStatus> {
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

    // Atlassian Statuspage JSON API
    const data: StatusPageResponse = await response.json();

    const components = (data.components || [])
      .filter((c: { name: string }) => !c.name.toLowerCase().includes('visit'))
      .slice(0, 6)
      .map((c: { name: string; status: string }) => ({
        name: c.name,
        status: normalizeComponentStatus(c.status),
      }));

    return {
      name: service.name,
      provider: service.provider,
      status: normalizeStatus(data.status?.indicator),
      statusPageUrl: service.statusPageUrl,
      components,
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
