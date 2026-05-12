import { describe, it, expect } from 'vitest';
import { isHoneypotPath, makeHit, honeypotResponse } from './honeypot';

describe('isHoneypotPath', () => {
  it('catches exact wp-login path', () => {
    expect(isHoneypotPath('/wp-login.php')).toBe(true);
  });

  it('catches .env probe', () => {
    expect(isHoneypotPath('/.env')).toBe(true);
  });

  it('catches /wp-admin/ subpaths', () => {
    expect(isHoneypotPath('/wp-admin/something.php')).toBe(true);
  });

  it('catches /admin/ subpaths', () => {
    expect(isHoneypotPath('/admin/users')).toBe(true);
  });

  it('allows legitimate API paths', () => {
    expect(isHoneypotPath('/api/news')).toBe(false);
    expect(isHoneypotPath('/api/payment/info')).toBe(false);
    expect(isHoneypotPath('/api/mcp')).toBe(false);
  });

  it('allows site routes', () => {
    expect(isHoneypotPath('/x402')).toBe(false);
    expect(isHoneypotPath('/originals')).toBe(false);
    expect(isHoneypotPath('/')).toBe(false);
  });

  it('case-insensitive on prefix match', () => {
    expect(isHoneypotPath('/WP-ADMIN/setup-config.php')).toBe(true);
  });

  it('does not treat /api/admin/ as honeypot (it is our admin)', () => {
    // /api/admin is legitimate; we route admin traffic there gated by ADMIN_KEY.
    // The honeypot is /admin/ (without /api prefix), which has no legit use.
    expect(isHoneypotPath('/api/admin/anomalies')).toBe(false);
  });
});

describe('makeHit', () => {
  it('extracts structured fields from a Request', () => {
    const req = new Request('https://tensorfeed.ai/wp-login.php', {
      method: 'POST',
      headers: {
        'CF-Connecting-IP': '203.0.113.1',
        'user-agent': 'Mozilla/5.0 (compatible; ScannerBot/1.0)',
        'cf-ray': '8abc123def456-DFW',
      },
    });
    const hit = makeHit(req);
    expect(hit.ip).toBe('203.0.113.1');
    expect(hit.path).toBe('/wp-login.php');
    expect(hit.method).toBe('POST');
    expect(hit.user_agent).toBe('Mozilla/5.0 (compatible; ScannerBot/1.0)');
    expect(hit.cf_ray).toBe('8abc123def456-DFW');
    expect(typeof hit.detected_at).toBe('string');
  });

  it('truncates ridiculously long user-agent', () => {
    const ua = 'A'.repeat(2000);
    const req = new Request('https://tensorfeed.ai/.env', {
      headers: { 'CF-Connecting-IP': '10.0.0.1', 'user-agent': ua },
    });
    const hit = makeHit(req);
    expect(hit.user_agent.length).toBeLessThanOrEqual(256);
  });

  it('falls back to anonymous when no CF-Connecting-IP', () => {
    const req = new Request('https://tensorfeed.ai/.env');
    const hit = makeHit(req);
    expect(hit.ip).toBe('anonymous');
  });
});

describe('honeypotResponse', () => {
  it('returns a 404 with text/plain body', async () => {
    const r = honeypotResponse();
    expect(r.status).toBe(404);
    expect(r.headers.get('content-type')).toContain('text/plain');
    expect(await r.text()).toBe('Not Found');
  });

  it('sets no-store cache-control so the probe is not cached', () => {
    const r = honeypotResponse();
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
});
