import { Env, ServiceStatus, StatusPageResponse } from './types';
import { STATUS_PAGES } from './sources';

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

async function fetchServiceStatus(
  service: typeof STATUS_PAGES[number]
): Promise<ServiceStatus> {
  try {
    const response = await fetch(service.url, {
      headers: { 'User-Agent': 'TensorFeed/1.0 (https://tensorfeed.ai)' },
      signal: AbortSignal.timeout(8000),
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

  const operational = statuses.filter(s => s.status === 'operational').length;
  const degraded = statuses.filter(s => s.status === 'degraded').length;
  const down = statuses.filter(s => s.status === 'down').length;

  console.log(`Status poll complete - ${operational} operational, ${degraded} degraded, ${down} down`);
}
