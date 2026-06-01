// Pure, framework-free decision logic for the top alert bar. Tested under the
// root vitest (node env). The React rendering lives in TopAlertBar.tsx.

export interface StatusAlertBarService {
  name: string;
  status: string;
}

export interface BreakingAlert {
  id: string;
  headline: string;
  href: string;
  published_at: string;
  expires_at: string;
}

export function classifySeverity(services: StatusAlertBarService[]): 'down' | 'degraded' | 'ok' {
  let worst: 'ok' | 'degraded' | 'down' = 'ok';
  for (const s of services) {
    const v = (s.status || '').toLowerCase();
    if (v === 'down' || v === 'outage' || v === 'major') return 'down';
    if (v === 'degraded' || v === 'partial' || v === 'warn') worst = 'degraded';
  }
  return worst;
}

export function affectedNames(services: StatusAlertBarService[]): string[] {
  return services
    .filter((s) => {
      const v = (s.status || '').toLowerCase();
      return v !== 'operational' && v !== 'ok' && v !== '';
    })
    .map((s) => s.name);
}

/** href is safe to render as a link only if it is a same-origin relative path. */
export function isSafeHref(href: string): boolean {
  return /^\/[^/]/.test(href) && !href.includes('\\');
}

/**
 * Single-bar priority: incident > breaking > green. Returns which bar to render.
 * `breaking` is the already-active (server-filtered) alert or null; `dismissed`
 * is whether the user dismissed THIS alert id.
 */
export function chooseBar(args: {
  services: StatusAlertBarService[];
  breaking: BreakingAlert | null;
  dismissed: boolean;
}): 'incident' | 'breaking' | 'status' {
  if (classifySeverity(args.services) !== 'ok') return 'incident';
  if (args.breaking && !args.dismissed) return 'breaking';
  return 'status';
}
