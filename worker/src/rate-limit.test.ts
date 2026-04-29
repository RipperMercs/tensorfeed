import { describe, expect, it, beforeEach } from 'vitest';
import {
  applyRateLimitHeaders,
  checkIPRateLimit,
  getClientIP,
  isRateLimitExempt,
  rateLimitedResponse,
  _resetRateLimitState,
  RATE_LIMIT_DEFAULTS,
} from './rate-limit';

describe('rate-limit', () => {
  beforeEach(() => {
    _resetRateLimitState();
  });

  describe('isRateLimitExempt', () => {
    it('exempts premium, payment, internal, admin, and refresh paths', () => {
      expect(isRateLimitExempt('/api/premium/routing')).toBe(true);
      expect(isRateLimitExempt('/api/payment/balance')).toBe(true);
      expect(isRateLimitExempt('/api/internal/track-bot')).toBe(true);
      expect(isRateLimitExempt('/api/admin/usage')).toBe(true);
      expect(isRateLimitExempt('/api/refresh')).toBe(true);
    });

    it('limits free endpoints', () => {
      expect(isRateLimitExempt('/api/news')).toBe(false);
      expect(isRateLimitExempt('/api/agents/news')).toBe(false);
      expect(isRateLimitExempt('/feed.xml')).toBe(false);
      expect(isRateLimitExempt('/llms.txt')).toBe(false);
      expect(isRateLimitExempt('/')).toBe(false);
    });
  });

  describe('getClientIP', () => {
    it('prefers CF-Connecting-IP over x-forwarded-for', () => {
      const req = new Request('https://tensorfeed.ai/api/news', {
        headers: { 'CF-Connecting-IP': '1.2.3.4', 'x-forwarded-for': '5.6.7.8' },
      });
      expect(getClientIP(req)).toBe('1.2.3.4');
    });

    it('falls back to the first x-forwarded-for entry', () => {
      const req = new Request('https://tensorfeed.ai/api/news', {
        headers: { 'x-forwarded-for': '5.6.7.8, 9.9.9.9' },
      });
      expect(getClientIP(req)).toBe('5.6.7.8');
    });

    it('returns "anonymous" when no client IP header is set', () => {
      const req = new Request('https://tensorfeed.ai/api/news');
      expect(getClientIP(req)).toBe('anonymous');
    });
  });

  describe('checkIPRateLimit', () => {
    it('counts requests per IP and reports remaining', () => {
      const a = checkIPRateLimit('1.1.1.1', 5);
      expect(a.allowed).toBe(true);
      expect(a.limit).toBe(5);
      expect(a.remaining).toBe(4);

      const b = checkIPRateLimit('1.1.1.1', 5);
      expect(b.remaining).toBe(3);
    });

    it('isolates counters across IPs', () => {
      checkIPRateLimit('1.1.1.1', 5);
      checkIPRateLimit('1.1.1.1', 5);
      const fresh = checkIPRateLimit('2.2.2.2', 5);
      expect(fresh.remaining).toBe(4);
    });

    it('denies once the limit is exceeded', () => {
      const limit = 3;
      const ip = '7.7.7.7';
      expect(checkIPRateLimit(ip, limit).allowed).toBe(true);
      expect(checkIPRateLimit(ip, limit).allowed).toBe(true);
      expect(checkIPRateLimit(ip, limit).allowed).toBe(true);
      const denied = checkIPRateLimit(ip, limit);
      expect(denied.allowed).toBe(false);
      expect(denied.remaining).toBe(0);
    });

    it('uses the documented default limit', () => {
      expect(RATE_LIMIT_DEFAULTS.DEFAULT_LIMIT_PER_MIN).toBe(120);
      expect(RATE_LIMIT_DEFAULTS.WINDOW_MS).toBe(60_000);
    });

    it('reports a positive reset window', () => {
      const r = checkIPRateLimit('3.3.3.3', 10);
      expect(r.resetSeconds).toBeGreaterThan(0);
      expect(r.resetSeconds).toBeLessThanOrEqual(60);
    });
  });

  describe('applyRateLimitHeaders', () => {
    it('attaches both standard and X- prefixed headers', () => {
      const base = new Response('hi', { status: 200 });
      const out = applyRateLimitHeaders(base, {
        allowed: true,
        limit: 100,
        remaining: 42,
        resetSeconds: 12,
      });
      expect(out.headers.get('RateLimit-Limit')).toBe('100');
      expect(out.headers.get('RateLimit-Remaining')).toBe('42');
      expect(out.headers.get('RateLimit-Reset')).toBe('12');
      expect(out.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(out.headers.get('X-RateLimit-Remaining')).toBe('42');
      expect(out.headers.get('X-RateLimit-Reset')).toBe('12');
    });
  });

  describe('rateLimitedResponse', () => {
    it('returns 429 with Retry-After', async () => {
      const r = rateLimitedResponse({ allowed: false, limit: 10, remaining: 0, resetSeconds: 30 });
      expect(r.status).toBe(429);
      expect(r.headers.get('Retry-After')).toBe('30');
      const body = (await r.json()) as { error: string; reset_seconds: number };
      expect(body.error).toBe('rate_limit_exceeded');
      expect(body.reset_seconds).toBe(30);
    });
  });
});
