import { describe, it, expect } from 'vitest';
import { aggregateIocs } from './iocs';

const HOUR_MS = 60 * 60 * 1000;
const now = () => new Date().toISOString();
const hoursAgo = (h: number) => new Date(Date.now() - h * HOUR_MS).toISOString();

function makeHit(over: Partial<{ ip: string; path: string; asn: number; country: string; detected_at: string }>) {
  return {
    detected_at: over.detected_at ?? now(),
    ip: over.ip ?? '203.0.113.1',
    path: over.path ?? '/wp-login.php',
    method: 'POST',
    user_agent: 'BadBot/1.0',
    cf_ray: 'abc',
    asn: over.asn ?? 64500,
    country: over.country ?? 'XX',
  };
}

describe('aggregateIocs', () => {
  it('groups hits by IP', () => {
    const out = aggregateIocs(
      [
        makeHit({ ip: '1.1.1.1' }),
        makeHit({ ip: '1.1.1.1', path: '/.env' }),
        makeHit({ ip: '2.2.2.2' }),
      ],
      720,
    );
    expect(out.length).toBe(2);
    const a = out.find((i) => i.value === '1.1.1.1')!;
    expect(a.hits).toBe(2);
    expect(a.paths.length).toBe(2);
  });

  it('drops hits outside the window', () => {
    const out = aggregateIocs(
      [
        makeHit({ ip: '1.1.1.1', detected_at: hoursAgo(100) }),
        makeHit({ ip: '1.1.1.1', detected_at: hoursAgo(1000) }), // outside 720h window
      ],
      720,
    );
    expect(out[0]!.hits).toBe(1);
  });

  it('drops anonymous IPs', () => {
    const out = aggregateIocs([makeHit({ ip: 'anonymous' })], 720);
    expect(out.length).toBe(0);
  });

  it('tags wordpress probes', () => {
    const out = aggregateIocs([makeHit({ ip: '1.1.1.1', path: '/wp-admin/setup.php' })], 720);
    expect(out[0]!.tags).toContain('scanner:wordpress');
  });

  it('tags env-leak probes', () => {
    const out = aggregateIocs([makeHit({ ip: '1.1.1.1', path: '/.env' })], 720);
    expect(out[0]!.tags).toContain('scanner:env-leak');
  });

  it('tags secrets probes', () => {
    const out = aggregateIocs([makeHit({ ip: '1.1.1.1', path: '/.git/config' })], 720);
    expect(out[0]!.tags).toContain('scanner:secrets');
  });

  it('escalates confidence with hit count', () => {
    const hits = Array.from({ length: 25 }, () => makeHit({ ip: '1.1.1.1' }));
    const out = aggregateIocs(hits, 720);
    expect(out[0]!.confidence).toBe('high');
  });

  it('low confidence for single hit single path', () => {
    const out = aggregateIocs([makeHit({ ip: '1.1.1.1' })], 720);
    expect(out[0]!.confidence).toBe('low');
  });

  it('caps paths at 10 per IP', () => {
    const hits = Array.from({ length: 30 }, (_, i) => makeHit({ ip: '1.1.1.1', path: `/probe-${i}.php` }));
    const out = aggregateIocs(hits, 720);
    expect(out[0]!.paths.length).toBeLessThanOrEqual(10);
  });

  it('sorts by last_seen descending', () => {
    const out = aggregateIocs(
      [
        makeHit({ ip: '1.1.1.1', detected_at: hoursAgo(48) }),
        makeHit({ ip: '2.2.2.2', detected_at: hoursAgo(1) }),
      ],
      720,
    );
    expect(out[0]!.value).toBe('2.2.2.2'); // more recent
  });

  it('caps result at 1000 entries', () => {
    const hits = Array.from({ length: 1500 }, (_, i) => makeHit({ ip: `10.0.0.${i % 250}.${i}` }));
    const out = aggregateIocs(hits, 720);
    expect(out.length).toBeLessThanOrEqual(1000);
  });
});
