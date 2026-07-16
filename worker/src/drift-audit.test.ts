import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildDriftReport,
  publicView,
  shouldAlert,
  formatAlertBody,
  needsSelfFetch,
  checkUrl,
  type UrlCheck,
  type DriftReport,
} from './drift-audit';

const RUN_AT = '2026-06-07T06:41:00.000Z';

function check(url: string, status_code: number, critical = false): UrlCheck {
  return { url, status_code, ok: status_code >= 200 && status_code < 400, critical };
}

const EM_DASH = String.fromCharCode(0x2014);
const DOUBLE_HYPHEN = '-' + '-';

describe('buildDriftReport', () => {
  it('all urls ok, no stale datasets -> ok, changed false when previous also ok', () => {
    const checks = [check('https://tensorfeed.ai/', 200, true), check('https://tensorfeed.ai/models/x', 200)];
    const prev = buildDriftReport(checks, [], 3, RUN_AT, null);
    expect(prev.status).toBe('ok');
    const next = buildDriftReport(checks, [], 3, RUN_AT, prev);
    expect(next.status).toBe('ok');
    expect(next.changed).toBe(false);
    expect(next.summary).toEqual({ passed: 2, total: 2, failed: 0 });
  });

  it('a non-critical url fails -> degraded', () => {
    const checks = [check('https://tensorfeed.ai/', 200, true), check('https://tensorfeed.ai/models/x', 404)];
    const r = buildDriftReport(checks, [], 3, RUN_AT, null);
    expect(r.status).toBe('degraded');
    expect(r.summary).toEqual({ passed: 1, total: 2, failed: 1 });
    expect(r.categories.live_urls.failures).toEqual([
      { url: 'https://tensorfeed.ai/models/x', status_code: 404, critical: false },
    ]);
  });

  it('a critical url fails -> down', () => {
    const checks = [check('https://tensorfeed.ai/', 500, true), check('https://tensorfeed.ai/models/x', 200)];
    const r = buildDriftReport(checks, [], 3, RUN_AT, null);
    expect(r.status).toBe('down');
  });

  it('a stale dataset with all urls ok -> degraded', () => {
    const checks = [check('https://tensorfeed.ai/', 200, true)];
    const r = buildDriftReport(checks, ['benchmarks'], 3, RUN_AT, null);
    expect(r.status).toBe('degraded');
    expect(r.categories.data_freshness).toEqual({ stale: ['benchmarks'], total: 3 });
  });

  it('change detection: previous ok, next degraded -> changed true', () => {
    const okChecks = [check('https://tensorfeed.ai/', 200, true)];
    const prev = buildDriftReport(okChecks, [], 3, RUN_AT, null);
    const failChecks = [check('https://tensorfeed.ai/', 200, true), check('https://tensorfeed.ai/models/x', 404)];
    const next = buildDriftReport(failChecks, [], 3, RUN_AT, prev);
    expect(next.status).toBe('degraded');
    expect(next.changed).toBe(true);
    expect(next.previous_status).toBe('ok');
  });

  it('change detection: previous degraded same failure, next degraded same failure -> changed false', () => {
    const checks = [check('https://tensorfeed.ai/', 200, true), check('https://tensorfeed.ai/models/x', 404)];
    const prev = buildDriftReport(checks, [], 3, RUN_AT, null);
    expect(prev.changed).toBe(true); // first appearance
    const next = buildDriftReport(checks, [], 3, RUN_AT, prev);
    expect(next.status).toBe('degraded');
    expect(next.changed).toBe(false);
  });

  it('change detection: next has a NEW failing url -> changed true', () => {
    const checks1 = [check('https://tensorfeed.ai/', 200, true), check('https://tensorfeed.ai/models/x', 404)];
    const prev = buildDriftReport(checks1, [], 3, RUN_AT, null);
    const checks2 = [
      check('https://tensorfeed.ai/', 200, true),
      check('https://tensorfeed.ai/models/x', 404),
      check('https://tensorfeed.ai/compare/y', 404),
    ];
    const next = buildDriftReport(checks2, [], 3, RUN_AT, prev);
    expect(next.changed).toBe(true);
  });

  it('previous_status is null when previous is null', () => {
    const r = buildDriftReport([check('https://tensorfeed.ai/', 200, true)], [], 3, RUN_AT, null);
    expect(r.previous_status).toBeNull();
  });
});

describe('publicView', () => {
  it('strips all failing-URL detail', () => {
    const failingUrl = 'https://tensorfeed.ai/models/secret-broken-page';
    const checks = [check('https://tensorfeed.ai/', 200, true), check(failingUrl, 404)];
    const report = buildDriftReport(checks, ['benchmarks'], 3, RUN_AT, null);
    const pub = publicView(report);
    const json = JSON.stringify(pub);
    expect(json).not.toContain('failures');
    expect(json).not.toContain(failingUrl);
    expect(json).not.toContain('secret-broken-page');
    expect(pub.status).toBe('degraded');
    expect(pub.categories.live_urls).toEqual({ passed: 1, total: 2 });
    expect(pub.categories.data_freshness).toEqual({ stale_count: 1, total: 3 });
    expect(pub.run_at).toBe(RUN_AT);
  });
});

describe('shouldAlert', () => {
  it('ok -> ok returns null', () => {
    const checks = [check('https://tensorfeed.ai/', 200, true)];
    const prev = buildDriftReport(checks, [], 3, RUN_AT, null);
    const next = buildDriftReport(checks, [], 3, RUN_AT, prev);
    expect(shouldAlert(prev, next)).toBeNull();
  });

  it('ok -> degraded returns red', () => {
    const okChecks = [check('https://tensorfeed.ai/', 200, true)];
    const prev = buildDriftReport(okChecks, [], 3, RUN_AT, null);
    const failChecks = [check('https://tensorfeed.ai/', 200, true), check('https://tensorfeed.ai/models/x', 404)];
    const next = buildDriftReport(failChecks, [], 3, RUN_AT, prev);
    expect(shouldAlert(prev, next)).toBe('red');
  });

  it('degraded(same failure) -> degraded(same failure) returns null', () => {
    const checks = [check('https://tensorfeed.ai/', 200, true), check('https://tensorfeed.ai/models/x', 404)];
    const prev = buildDriftReport(checks, [], 3, RUN_AT, null);
    const next = buildDriftReport(checks, [], 3, RUN_AT, prev);
    expect(shouldAlert(prev, next)).toBeNull();
  });

  it('degraded -> down returns red', () => {
    const degChecks = [check('https://tensorfeed.ai/', 200, true), check('https://tensorfeed.ai/models/x', 404)];
    const prev = buildDriftReport(degChecks, [], 3, RUN_AT, null);
    const downChecks = [check('https://tensorfeed.ai/', 500, true), check('https://tensorfeed.ai/models/x', 404)];
    const next = buildDriftReport(downChecks, [], 3, RUN_AT, prev);
    expect(shouldAlert(prev, next)).toBe('red');
  });

  it('down -> ok returns clear', () => {
    const downChecks = [check('https://tensorfeed.ai/', 500, true)];
    const prev = buildDriftReport(downChecks, [], 3, RUN_AT, null);
    const okChecks = [check('https://tensorfeed.ai/', 200, true)];
    const next = buildDriftReport(okChecks, [], 3, RUN_AT, prev);
    expect(shouldAlert(prev, next)).toBe('clear');
  });

  it('null previous + non-ok returns red', () => {
    const failChecks = [check('https://tensorfeed.ai/', 500, true)];
    const next = buildDriftReport(failChecks, [], 3, RUN_AT, null);
    expect(shouldAlert(null, next)).toBe('red');
  });

  it('null previous + ok returns null', () => {
    const okChecks = [check('https://tensorfeed.ai/', 200, true)];
    const next = buildDriftReport(okChecks, [], 3, RUN_AT, null);
    expect(shouldAlert(null, next)).toBeNull();
  });
});

describe('formatAlertBody', () => {
  it('contains the failing url + status code, critical first, and stale datasets', () => {
    const checks = [
      check('https://tensorfeed.ai/models/non-critical', 404),
      check('https://tensorfeed.ai/', 500, true),
    ];
    const report = buildDriftReport(checks, ['benchmarks', 'harnesses'], 3, RUN_AT, null);
    const body = formatAlertBody(report);
    expect(body).toContain('https://tensorfeed.ai/');
    expect(body).toContain('500');
    expect(body).toContain('https://tensorfeed.ai/models/non-critical');
    expect(body).toContain('404');
    expect(body).toContain('benchmarks');
    expect(body).toContain('harnesses');
    // critical url should appear before the non-critical one
    expect(body.indexOf('https://tensorfeed.ai/\t') >= 0 || body.indexOf('https://tensorfeed.ai/ ') >= 0).toBe(true);
    const critIdx = body.indexOf('/models/non-critical');
    const rootIdx = body.indexOf('500');
    expect(rootIdx).toBeLessThan(critIdx);
  });

  it('contains no em dash and no double hyphen', () => {
    const checks = [check('https://tensorfeed.ai/', 500, true), check('https://tensorfeed.ai/models/x', 404)];
    const report = buildDriftReport(checks, ['benchmarks'], 3, RUN_AT, null);
    const body = formatAlertBody(report);
    expect(body.includes(EM_DASH)).toBe(false);
    expect(body.includes(DOUBLE_HYPHEN)).toBe(false);
  });
});

// Same-zone /api/* URLs must be checked through the SELF service binding:
// a plain fetch() from the worker to its own hostname skips the worker
// (same-zone subrequest bypass) and hits Pages static, where worker-only
// routes like /api/meta have no file and read as phantom 404s. This is the
// regression test for the drift audit reporting "down" on healthy routes.
describe('needsSelfFetch', () => {
  it('routes own-zone /api/* through SELF', () => {
    expect(needsSelfFetch('https://tensorfeed.ai/api/meta')).toBe(true);
    expect(needsSelfFetch('https://tensorfeed.ai/api/today')).toBe(true);
  });

  it('leaves pages, static assets, and other hosts on plain fetch', () => {
    expect(needsSelfFetch('https://tensorfeed.ai/')).toBe(false);
    expect(needsSelfFetch('https://tensorfeed.ai/developers')).toBe(false);
    expect(needsSelfFetch('https://tensorfeed.ai/sitemap.xml')).toBe(false);
    expect(needsSelfFetch('https://terminalfeed.io/api/anything')).toBe(false);
    expect(needsSelfFetch('not a url')).toBe(false);
  });
});

describe('checkUrl fetch routing', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function entry(url: string, critical = true): UrlCheck {
    return { url, status_code: 0, ok: false, critical };
  }

  it('uses the SELF binding for own-zone /api/* URLs', async () => {
    const selfCalls: string[] = [];
    const self = {
      fetch: async (input: RequestInfo | URL) => {
        selfCalls.push(String(input));
        return new Response('{}', { status: 200 });
      },
    } as unknown as Fetcher;
    const globalFetch = vi.fn(async () => new Response('', { status: 404 }));
    vi.stubGlobal('fetch', globalFetch);

    const result = await checkUrl(entry('https://tensorfeed.ai/api/meta'), self);
    expect(selfCalls).toEqual(['https://tensorfeed.ai/api/meta']);
    expect(globalFetch).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.status_code).toBe(200);
  });

  it('uses plain fetch for page URLs even when SELF is available', async () => {
    const self = {
      fetch: vi.fn(async () => new Response('', { status: 500 })),
    } as unknown as Fetcher;
    const globalFetch = vi.fn(async () => new Response('', { status: 200 }));
    vi.stubGlobal('fetch', globalFetch);

    const result = await checkUrl(entry('https://tensorfeed.ai/developers'), self);
    expect(self.fetch).not.toHaveBeenCalled();
    expect(globalFetch).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('falls back to plain fetch when SELF is not bound', async () => {
    const globalFetch = vi.fn(async () => new Response('', { status: 200 }));
    vi.stubGlobal('fetch', globalFetch);

    const result = await checkUrl(entry('https://tensorfeed.ai/api/meta'), undefined);
    expect(globalFetch).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });
});
