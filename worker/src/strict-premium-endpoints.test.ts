import { describe, it, expect } from 'vitest';
import {
  isStrictPremiumPath,
  STRICT_PREMIUM_PATHS,
  STRICT_PREMIUM_PREFIXES,
} from './strict-premium-endpoints';

describe('isStrictPremiumPath', () => {
  describe('exact-match paths (moat endpoints in STRICT_PREMIUM_PATHS)', () => {
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

  describe('parameter-required history + security paths (pay-skills #68 fix)', () => {
    it('matches /api/premium/history/news/full', () => {
      expect(isStrictPremiumPath('/api/premium/history/news/full')).toBe(true);
    });
    it('matches /api/premium/history/news/source-health', () => {
      expect(isStrictPremiumPath('/api/premium/history/news/source-health')).toBe(true);
    });
    it('matches /api/premium/history/news/clusters/full', () => {
      expect(isStrictPremiumPath('/api/premium/history/news/clusters/full')).toBe(true);
    });
    it('matches /api/premium/history/news/verified', () => {
      expect(isStrictPremiumPath('/api/premium/history/news/verified')).toBe(true);
    });
    it('matches /api/premium/security/cve/range', () => {
      expect(isStrictPremiumPath('/api/premium/security/cve/range')).toBe(true);
    });
    it('matches /api/premium/security/kev/series', () => {
      expect(isStrictPremiumPath('/api/premium/security/kev/series')).toBe(true);
    });
    it('matches /api/premium/security/epss/series', () => {
      expect(isStrictPremiumPath('/api/premium/security/epss/series')).toBe(true);
    });
    it('matches /api/premium/clean/eia/series', () => {
      expect(isStrictPremiumPath('/api/premium/clean/eia/series')).toBe(true);
    });
    it('matches /api/premium/clean/power/daily', () => {
      expect(isStrictPremiumPath('/api/premium/clean/power/daily')).toBe(true);
    });
    it('matches /api/premium/climate/power/hourly', () => {
      expect(isStrictPremiumPath('/api/premium/climate/power/hourly')).toBe(true);
    });
    it('matches /api/premium/health/fda/aggregate', () => {
      expect(isStrictPremiumPath('/api/premium/health/fda/aggregate')).toBe(true);
    });
    it('does NOT match /api/premium/security/kev/full (no params, safe under trial)', () => {
      // kev/full and epss/top do not require query params, so the trial layer
      // returns a real 200 for them. They stay on the trial layer intentionally.
      expect(isStrictPremiumPath('/api/premium/security/kev/full')).toBe(false);
    });
    it('does NOT match /api/premium/security/epss/top (date optional, safe under trial)', () => {
      expect(isStrictPremiumPath('/api/premium/security/epss/top')).toBe(false);
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

  describe('Wave 2 Bazaar pilots (2026-05-24 promotion to strict-premium)', () => {
    // These 9 paths were promoted to strict-premium when added as Bazaar
    // pilots so anonymous CDP / x402scan crawlers see a canonical 402 rather
    // than the free-trial 200. funding/exposure + packages/pypi/momentum
    // were already strict-premium pre-promotion.
    it('matches /api/premium/agents/directory', () => {
      expect(isStrictPremiumPath('/api/premium/agents/directory')).toBe(true);
    });
    it('matches /api/premium/research/velocity', () => {
      expect(isStrictPremiumPath('/api/premium/research/velocity')).toBe(true);
    });
    it('matches /api/premium/research/authors', () => {
      expect(isStrictPremiumPath('/api/premium/research/authors')).toBe(true);
    });
    it('matches /api/premium/research/citation-velocity', () => {
      expect(isStrictPremiumPath('/api/premium/research/citation-velocity')).toBe(true);
    });
    it('matches /api/premium/research/milestones', () => {
      expect(isStrictPremiumPath('/api/premium/research/milestones')).toBe(true);
    });
    it('matches /api/premium/research/emerging-keywords', () => {
      expect(isStrictPremiumPath('/api/premium/research/emerging-keywords')).toBe(true);
    });
    it('matches /api/premium/economy/recession-watch', () => {
      expect(isStrictPremiumPath('/api/premium/economy/recession-watch')).toBe(true);
    });
    it('matches /api/premium/policy/timeline', () => {
      expect(isStrictPremiumPath('/api/premium/policy/timeline')).toBe(true);
    });
    it('matches /api/premium/apis-guru/ai-feed', () => {
      expect(isStrictPremiumPath('/api/premium/apis-guru/ai-feed')).toBe(true);
    });
  });

  describe('Wave 3 Bazaar pilot (2026-05-24)', () => {
    it('matches /api/premium/model-deprecations/timeline', () => {
      expect(isStrictPremiumPath('/api/premium/model-deprecations/timeline')).toBe(true);
    });
  });

  describe('Wave 4 Bazaar pilot (2026-05-24)', () => {
    it('matches /api/premium/inference-providers/arbitrage', () => {
      expect(isStrictPremiumPath('/api/premium/inference-providers/arbitrage')).toBe(true);
    });
  });

  describe('Wave 5 Bazaar pilot (2026-05-24)', () => {
    it('matches /api/premium/ai-safety/incidents/exposure', () => {
      expect(isStrictPremiumPath('/api/premium/ai-safety/incidents/exposure')).toBe(true);
    });
  });

  describe('Wave 6 Bazaar pilot (2026-05-24)', () => {
    it('matches /api/premium/ai-safety/packages/security/radar', () => {
      expect(isStrictPremiumPath('/api/premium/ai-safety/packages/security/radar')).toBe(true);
    });
  });

  describe('Wave 7 Bazaar pilot (2026-05-24)', () => {
    it('matches /api/premium/packages/releases/velocity', () => {
      expect(isStrictPremiumPath('/api/premium/packages/releases/velocity')).toBe(true);
    });
  });

  describe('Wave 8 Bazaar pilot (2026-05-24)', () => {
    it('matches /api/premium/ai-velocity', () => {
      expect(isStrictPremiumPath('/api/premium/ai-velocity')).toBe(true);
    });
  });

  describe('Wave 9 Bazaar pilot (2026-05-24)', () => {
    it('matches /api/premium/ai-crypto-pulse', () => {
      expect(isStrictPremiumPath('/api/premium/ai-crypto-pulse')).toBe(true);
    });
  });

  describe('Wave 10 Bazaar pilot (2026-05-24)', () => {
    it('matches /api/premium/coding-harnesses/weekly-deltas', () => {
      expect(isStrictPremiumPath('/api/premium/coding-harnesses/weekly-deltas')).toBe(true);
    });
  });

  describe('Wave 11 Bazaar pilot (2026-05-24)', () => {
    it('matches /api/premium/news/action-cards', () => {
      expect(isStrictPremiumPath('/api/premium/news/action-cards')).toBe(true);
    });
  });

  describe('Wave 12 Bazaar pilot (2026-05-24)', () => {
    it('matches /api/premium/status/incidents/triage', () => {
      expect(isStrictPremiumPath('/api/premium/status/incidents/triage')).toBe(true);
    });
  });

  describe('non-strict premium paths (still on the trial layer)', () => {
    it('does NOT match /api/premium/news/search', () => {
      expect(isStrictPremiumPath('/api/premium/news/search')).toBe(false);
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
    it('exposes all 65 exact paths', () => {
      // 24 pre-Wave-2 + 9 Wave 2 + 1 each Waves 3..12 + 3 Wave 13 (ai-cves trio)
      // + 1 Wave 15 (ai-cves batch) + 5 Wave 16 (per-provider triage)
      // + 3 Wave 17 (SEC filings AI-extraction) + 1 Wave 18 (pro-tier
      // whats-new) + 2 audit H-5 (decision-verified) + 1 Wave 20
      // (route-verdict) + 2 verdict-track (provider-reliability-verdict,
      // x402-settlement-verdict) + 1 Wave 24 (guidance-delta). funding/exposure +
      // packages/pypi/momentum were already strict.
      expect(STRICT_PREMIUM_PATHS).toHaveLength(65);
      expect(new Set(STRICT_PREMIUM_PATHS).size).toBe(65); // no duplicates
    });
    it('exposes 8 prefix paths (providers + 5 Wave 14 path-param pilots + Wave 19 ai-companies + x402-index)', () => {
      expect(STRICT_PREMIUM_PREFIXES).toHaveLength(8);
      expect(STRICT_PREMIUM_PREFIXES).toContain('/api/premium/providers/');
      expect(STRICT_PREMIUM_PREFIXES).toContain('/api/premium/clean/cve/');
      expect(STRICT_PREMIUM_PREFIXES).toContain('/api/premium/clean/kev/');
      expect(STRICT_PREMIUM_PREFIXES).toContain('/api/premium/clean/epss/');
      expect(STRICT_PREMIUM_PREFIXES).toContain('/api/premium/clean/openrouter/');
      expect(STRICT_PREMIUM_PREFIXES).toContain('/api/premium/security/verified/');
      expect(STRICT_PREMIUM_PREFIXES).toContain('/api/premium/ai-companies/');
      expect(STRICT_PREMIUM_PREFIXES).toContain('/api/premium/x402-index/');
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
