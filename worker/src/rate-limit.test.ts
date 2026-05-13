import { describe, expect, it, beforeEach } from 'vitest';
import {
  applyRateLimitHeaders,
  checkFreeTrialQuota,
  checkIPRateLimit,
  checkNoChargeAbuse,
  FREE_TRIAL_DEFAULTS,
  getClientIP,
  isRateLimitExempt,
  peekFreeTrialQuota,
  rateLimitedResponse,
  _resetRateLimitState,
  RATE_LIMIT_DEFAULTS,
  NO_CHARGE_ABUSE_DEFAULTS,
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

  // ── No-charge abuse limiter (asymmetric exhaustion fix) ─────────
  describe('checkNoChargeAbuse', () => {
    it('marks abusive=false until the threshold is exceeded', () => {
      const token = 'tf_live_abusetest1';
      // First N calls under threshold should report abusive=false
      for (let i = 0; i < NO_CHARGE_ABUSE_DEFAULTS.LIMIT_PER_MIN; i++) {
        const r = checkNoChargeAbuse(token);
        expect(r.abusive).toBe(false);
      }
      // The (LIMIT+1)-th call exceeds the threshold
      const over = checkNoChargeAbuse(token);
      expect(over.abusive).toBe(true);
      expect(over.count).toBe(NO_CHARGE_ABUSE_DEFAULTS.LIMIT_PER_MIN + 1);
    });

    it('isolates counters per token (one offender does not throttle another)', () => {
      const a = 'tf_live_abusetest_a';
      const b = 'tf_live_abusetest_b';
      // Pump A to abusive
      for (let i = 0; i < NO_CHARGE_ABUSE_DEFAULTS.LIMIT_PER_MIN + 5; i++) {
        checkNoChargeAbuse(a);
      }
      const aResult = checkNoChargeAbuse(a);
      expect(aResult.abusive).toBe(true);

      // B should still be clean
      const bResult = checkNoChargeAbuse(b);
      expect(bResult.abusive).toBe(false);
      expect(bResult.count).toBe(1);
    });

    it('returns non-abusive for empty token (defensive)', () => {
      const r = checkNoChargeAbuse('');
      expect(r.abusive).toBe(false);
      expect(r.count).toBe(0);
    });

    it('exposes a reset_seconds value within the window', () => {
      const r = checkNoChargeAbuse('tf_live_resetcheck');
      expect(r.resetSeconds).toBeGreaterThan(0);
      expect(r.resetSeconds).toBeLessThanOrEqual(NO_CHARGE_ABUSE_DEFAULTS.WINDOW_MS / 1000);
    });
  });

  describe('checkFreeTrialQuota', () => {
    it('grants the first call and increments used', () => {
      const r = checkFreeTrialQuota('1.2.3.4');
      expect(r.allowed).toBe(true);
      expect(r.used).toBe(1);
      expect(r.remaining).toBe(FREE_TRIAL_DEFAULTS.LIMIT_PER_DAY - 1);
      expect(r.limit).toBe(FREE_TRIAL_DEFAULTS.LIMIT_PER_DAY);
      expect(r.resetSeconds).toBeGreaterThan(0);
      expect(r.resetSeconds).toBeLessThanOrEqual(FREE_TRIAL_DEFAULTS.WINDOW_MS / 1000);
      expect(typeof r.resetAt).toBe('string');
    });

    it('counts each call against the per-IP cap', () => {
      const ip = '5.6.7.8';
      for (let i = 0; i < 5; i += 1) checkFreeTrialQuota(ip);
      const r = checkFreeTrialQuota(ip);
      expect(r.used).toBe(6);
      expect(r.remaining).toBe(FREE_TRIAL_DEFAULTS.LIMIT_PER_DAY - 6);
    });

    it('denies after the cap is reached and stops incrementing', () => {
      const ip = '9.9.9.9';
      // Burn the entire daily allowance.
      for (let i = 0; i < FREE_TRIAL_DEFAULTS.LIMIT_PER_DAY; i += 1) checkFreeTrialQuota(ip);
      const denied = checkFreeTrialQuota(ip);
      expect(denied.allowed).toBe(false);
      expect(denied.used).toBe(FREE_TRIAL_DEFAULTS.LIMIT_PER_DAY);
      expect(denied.remaining).toBe(0);
      // A second denial does NOT push used above the cap.
      const denied2 = checkFreeTrialQuota(ip);
      expect(denied2.allowed).toBe(false);
      expect(denied2.used).toBe(FREE_TRIAL_DEFAULTS.LIMIT_PER_DAY);
    });

    it('isolates buckets per IP', () => {
      checkFreeTrialQuota('aaa');
      checkFreeTrialQuota('aaa');
      const a = checkFreeTrialQuota('aaa');
      const b = checkFreeTrialQuota('bbb');
      expect(a.used).toBe(3);
      expect(b.used).toBe(1);
    });
  });

  describe('peekFreeTrialQuota', () => {
    it('returns full allowance for a never-seen IP without consuming', () => {
      const peek = peekFreeTrialQuota('never-seen');
      expect(peek.used).toBe(0);
      expect(peek.remaining).toBe(FREE_TRIAL_DEFAULTS.LIMIT_PER_DAY);
      expect(peek.allowed).toBe(true);
      // A subsequent peek still shows zero use.
      const peek2 = peekFreeTrialQuota('never-seen');
      expect(peek2.used).toBe(0);
    });

    it('reflects existing usage without incrementing', () => {
      const ip = 'peek-test';
      checkFreeTrialQuota(ip);
      checkFreeTrialQuota(ip);
      checkFreeTrialQuota(ip);
      const peek = peekFreeTrialQuota(ip);
      expect(peek.used).toBe(3);
      expect(peek.remaining).toBe(FREE_TRIAL_DEFAULTS.LIMIT_PER_DAY - 3);
      // Peek did not change anything.
      const peek2 = peekFreeTrialQuota(ip);
      expect(peek2.used).toBe(3);
    });

    it('reports allowed=false when the cap is reached', () => {
      const ip = 'peek-exhausted';
      for (let i = 0; i < FREE_TRIAL_DEFAULTS.LIMIT_PER_DAY; i += 1) checkFreeTrialQuota(ip);
      const peek = peekFreeTrialQuota(ip);
      expect(peek.allowed).toBe(false);
      expect(peek.remaining).toBe(0);
    });
  });
});
