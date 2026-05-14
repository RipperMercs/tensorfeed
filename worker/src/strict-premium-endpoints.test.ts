import { describe, it, expect } from 'vitest';
import {
  isStrictPremiumPath,
  STRICT_PREMIUM_PATHS,
  STRICT_PREMIUM_PREFIXES,
} from './strict-premium-endpoints';

describe('isStrictPremiumPath', () => {
  describe('exact-match paths (the 7 listed in STRICT_PREMIUM_PATHS)', () => {
    it('matches /api/premium/history/pricing/series', () => {
      expect(isStrictPremiumPath('/api/premium/history/pricing/series')).toBe(true);
    });
    it('matches /api/premium/history/benchmarks/series', () => {
      expect(isStrictPremiumPath('/api/premium/history/benchmarks/series')).toBe(true);
    });
    it('matches /api/premium/history/status/uptime', () => {
      expect(isStrictPremiumPath('/api/premium/history/status/uptime')).toBe(true);
    });
    it('matches /api/premium/status/leaderboard', () => {
      expect(isStrictPremiumPath('/api/premium/status/leaderboard')).toBe(true);
    });
    it('matches /api/premium/probe/series', () => {
      expect(isStrictPremiumPath('/api/premium/probe/series')).toBe(true);
    });
    it('matches /api/premium/funding/exposure', () => {
      expect(isStrictPremiumPath('/api/premium/funding/exposure')).toBe(true);
    });
    it('matches /api/premium/packages/pypi/momentum', () => {
      expect(isStrictPremiumPath('/api/premium/packages/pypi/momentum')).toBe(true);
    });
  });

  describe('prefix-match paths (the 1 listed in STRICT_PREMIUM_PREFIXES)', () => {
    it('matches /api/premium/providers/anthropic', () => {
      expect(isStrictPremiumPath('/api/premium/providers/anthropic')).toBe(true);
    });
    it('matches /api/premium/providers/openai', () => {
      expect(isStrictPremiumPath('/api/premium/providers/openai')).toBe(true);
    });
    it('matches /api/premium/providers/google', () => {
      expect(isStrictPremiumPath('/api/premium/providers/google')).toBe(true);
    });
    it('does NOT match /api/premium/providers (no slug, no trailing slash)', () => {
      // The prefix is '/api/premium/providers/' with trailing slash. Bare
      // /api/premium/providers should not match (there is no such endpoint,
      // but defending against accidental matches is the discipline).
      expect(isStrictPremiumPath('/api/premium/providers')).toBe(false);
    });
  });

  describe('non-strict premium paths (the 70% that keep the trial)', () => {
    it('does NOT match /api/premium/routing', () => {
      expect(isStrictPremiumPath('/api/premium/routing')).toBe(false);
    });
    it('does NOT match /api/premium/whats-new', () => {
      expect(isStrictPremiumPath('/api/premium/whats-new')).toBe(false);
    });
    it('does NOT match /api/premium/compare/models', () => {
      expect(isStrictPremiumPath('/api/premium/compare/models')).toBe(false);
    });
    it('does NOT match /api/premium/cost/projection', () => {
      expect(isStrictPremiumPath('/api/premium/cost/projection')).toBe(false);
    });
    it('does NOT match /api/premium/news/search', () => {
      expect(isStrictPremiumPath('/api/premium/news/search')).toBe(false);
    });
    it('does NOT match /api/premium/agents/directory', () => {
      expect(isStrictPremiumPath('/api/premium/agents/directory')).toBe(false);
    });
    it('does NOT match /api/premium/watches', () => {
      expect(isStrictPremiumPath('/api/premium/watches')).toBe(false);
    });
  });

  describe('free and non-premium paths', () => {
    it('does NOT match free siblings (pricing_series_free)', () => {
      // The free 7-day-capped versions live at non-/premium paths.
      expect(isStrictPremiumPath('/api/pricing/series/free')).toBe(false);
    });
    it('does NOT match /api/news', () => {
      expect(isStrictPremiumPath('/api/news')).toBe(false);
    });
    it('does NOT match /api/status', () => {
      expect(isStrictPremiumPath('/api/status')).toBe(false);
    });
    it('does NOT match /api/payment/balance', () => {
      expect(isStrictPremiumPath('/api/payment/balance')).toBe(false);
    });
    it('does NOT match /api/admin/...', () => {
      expect(isStrictPremiumPath('/api/admin/anomaly-events')).toBe(false);
    });
    it('does NOT match the empty string', () => {
      expect(isStrictPremiumPath('')).toBe(false);
    });
    it('does NOT match /', () => {
      expect(isStrictPremiumPath('/')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('is case-sensitive (defends against URL casing tricks)', () => {
      // /API/PREMIUM/... should NOT match. Path matching in the Worker
      // is normalized to lowercase elsewhere, but the function itself
      // should not accept upper-case as equivalent.
      expect(isStrictPremiumPath('/API/PREMIUM/HISTORY/PRICING/SERIES')).toBe(false);
    });
    it('does not match with trailing query string in the path (caller strips queries)', () => {
      // requirePayment passes new URL(request.url).pathname which never
      // includes the query string. Verify the matcher reflects that
      // contract (a path WITH a query string should not match).
      expect(isStrictPremiumPath('/api/premium/funding/exposure?since=2026-01-01')).toBe(false);
    });
    it('does not match with trailing slash on exact-match paths', () => {
      expect(isStrictPremiumPath('/api/premium/funding/exposure/')).toBe(false);
    });
  });

  describe('list integrity', () => {
    it('exposes all 7 exact paths', () => {
      expect(STRICT_PREMIUM_PATHS).toHaveLength(7);
      expect(new Set(STRICT_PREMIUM_PATHS).size).toBe(7); // no duplicates
    });
    it('exposes 1 prefix path', () => {
      expect(STRICT_PREMIUM_PREFIXES).toHaveLength(1);
      expect(STRICT_PREMIUM_PREFIXES[0]).toBe('/api/premium/providers/');
    });
    it('every exact path starts with /api/premium/', () => {
      for (const path of STRICT_PREMIUM_PATHS) {
        expect(path.startsWith('/api/premium/')).toBe(true);
      }
    });
    it('every prefix ends with a slash (anchoring)', () => {
      for (const prefix of STRICT_PREMIUM_PREFIXES) {
        expect(prefix.endsWith('/')).toBe(true);
      }
    });
  });
});
