/**
 * Tests for the bazaar pilot registry.
 *
 * Important: validates the bazaar extension's `info` against its `schema`
 * using AJV: the same library CDP uses on its facilitator side. If the
 * test fails, our endpoint would also fail to catalog in production
 * (CDP rejects extensions whose info doesn't match its schema).
 */

import { describe, expect, it } from 'vitest';
import Ajv from 'ajv/dist/2020.js';
import {
  isBazaarPilotPath,
  getBazaarPilotConfig,
  bazaarExtensionsFor,
  bazaarDescriptionFor,
  bazaarPilotPaths,
  pilotCatalogStatus,
  pilotTemplatePath,
} from './bazaar-pilots';
import { isStrictPremiumPath } from './strict-premium-endpoints';

// Pilot paths currently in BAZAAR_PILOTS. Wave 1 (2026-05-14) added
// /routing, /compare/models, /cost/projection alongside the original
// /whats-new pilot. Wave 2 (2026-05-24) added 11 flat-schema GETs.
const PILOT_PATHS = [
  '/api/premium/whats-new',
  '/api/premium/routing',
  '/api/premium/compare/models',
  '/api/premium/cost/projection',
  // Wave 2
  '/api/premium/agents/directory',
  '/api/premium/funding/exposure',
  '/api/premium/packages/pypi/momentum',
  '/api/premium/research/velocity',
  '/api/premium/research/authors',
  '/api/premium/research/citation-velocity',
  '/api/premium/research/milestones',
  '/api/premium/research/emerging-keywords',
  '/api/premium/policy/timeline',
  '/api/premium/apis-guru/ai-feed',
  // Wave 3
  '/api/premium/model-deprecations/timeline',
  // Wave 4
  '/api/premium/inference-providers/arbitrage',
  // Wave 5
  '/api/premium/ai-safety/incidents/exposure',
  // Wave 6
  '/api/premium/ai-safety/packages/security/radar',
  // Wave 7
  '/api/premium/packages/releases/velocity',
  // Wave 8
  '/api/premium/ai-velocity',
  // Wave 9
  '/api/premium/ai-crypto-pulse',
  // Wave 10
  '/api/premium/coding-harnesses/weekly-deltas',
  // Wave 11
  '/api/premium/news/action-cards',
  // Wave 12
  '/api/premium/status/incidents/triage',
  // Wave 13 (ai-cves trio)
  '/api/premium/ai-cves/ai-stack-cves',
  '/api/premium/ai-cves/exploited-in-wild',
  '/api/premium/ai-cves/cve',
  // Wave 15 (ai-cves batch: AgentMail messages/batch-get translation)
  '/api/premium/ai-cves/batch',
  // Wave 16 (per-provider incident triage: AgentMail scoped+flat translation)
  '/api/premium/status/openai/incidents/triage',
  '/api/premium/status/anthropic/incidents/triage',
  '/api/premium/status/google/incidents/triage',
  '/api/premium/status/aws/incidents/triage',
  '/api/premium/status/azure/incidents/triage',
  // Wave 17 (SEC filings AI-extraction: Phase 3f.3)
  '/api/premium/sec/filings/ai-flagged',
  '/api/premium/sec/filings/by-form',
  // Wave 18 (pro-tier whats-new: Parallel.ai tier-ladder pattern)
  '/api/premium/whats-new/pro',
  // Wave 14 (path-param templates). Listed here in template form because
  // bazaarPilotPaths() returns the map keys. The template-match lookup is
  // exercised separately below with concrete request paths.
  '/api/premium/providers/:name',
  '/api/premium/clean/cve/:id',
  '/api/premium/clean/kev/:id',
  '/api/premium/clean/epss/:id',
  '/api/premium/security/verified/:id',
  // Wave 19 (per-ticker AI-company envelope: Robinhood Agentic Trading launch)
  '/api/premium/ai-companies/:ticker',
  // Wave 20 (route-verdict: signed model-routing decision)
  '/api/premium/route-verdict',
  // Wave 21 (stack-safety-verdict: deploy gate)
  '/api/premium/stack-safety-verdict',
  // Wave 22 (benchmark-trust-verdict)
  '/api/premium/benchmark-trust-verdict',
  // Wave 23 (failover-verdict)
  '/api/premium/failover-verdict',
  // Wave 24 (guidance-delta: signed periodic-filing guidance diff)
  '/api/premium/sec/filings/guidance-delta',
  // SSVC Decision Verdict: CISA SSVC Coordinator decision from Vulnrichment
  '/api/premium/security/ssvc-verdict',
  // Wave 34 (package-safety-verdict: GO/REVIEW/BLOCK pre-install ruling)
  '/api/premium/security/package-verdict',
  // Wave 35 (concentration-verdict: SPOF ruling over a provider dependency set)
  '/api/premium/resilience/concentration-verdict',
  // Wave 36 (inference-cost-verdict: cheapest-host ruling over the price matrix)
  '/api/premium/inference/cost-verdict',
  // Wave 37 (models-frontier: Pareto price-performance set)
  '/api/premium/models/frontier',
  // Wave 25 (provider-reliability-verdict: ranked over TF measured probes)
  '/api/premium/provider-reliability-verdict',
  // Wave 25 (x402-settlement-verdict: ruling over TF x402 settlement index)
  '/api/premium/x402-settlement-verdict',
  // Wave 26 (2026-05-30): agent news-search + brief cluster
  '/api/premium/news/decision-verified/search',
  '/api/premium/news/decision-verified',
  '/api/premium/research/topic-search',
  '/api/premium/recent',
  // Wave 27 (2026-05-30): time-series data feeds
  '/api/premium/history/pricing/series',
  '/api/premium/history/benchmarks/series',
  '/api/premium/history/status/uptime',
  '/api/premium/probe/series',
  '/api/premium/status/leaderboard',
  '/api/premium/attention/series',
  '/api/premium/openrouter/series',
  '/api/premium/mcp/registry/series',
  '/api/premium/x402-registry/series',
  '/api/premium/x402-index/series',
  // Wave 28 (2026-05-30): security data feeds
  '/api/premium/security/corroborated',
  '/api/premium/security/cve/range',
  '/api/premium/security/kev/series',
  '/api/premium/security/kev/full',
  '/api/premium/security/epss/series',
  '/api/premium/security/epss/top',
  '/api/premium/security/ghsa/ai-feed',
  '/api/premium/cve/kev-exploitation-timeline',
  '/api/premium/sec/filings/ai-disclosures',
  // Wave 29 (2026-05-30): Wave B tail (4 flat + 2 parametric template keys)
  '/api/premium/research/lab-productivity',
  '/api/premium/hf/velocity',
  '/api/premium/agents/leaderboard/full',
  '/api/premium/jobs',
  '/api/premium/x402-index/publisher/:domain',
  // Wave 30 (2026-06-02): AI Crawler Access Map (robots.txt policy + llms.txt/ai.txt)
  '/api/premium/ai-crawler-access/full',
  '/api/premium/ai-crawler-access/changes',
  // Wave 31 (2026-06-02): agent-ready
  '/api/premium/agent-ready/full',
  // Wave 32 (2026-06-02): hf-leaderboard movers
  '/api/premium/hf-leaderboard/movers',
  // Wave 33 (2026-06-04): x402-publisher-verdict (signed single-publisher trust verdict)
  '/api/premium/x402-publisher-verdict',
] as const;

// Concrete request paths that should match a Wave 14 template.
const WAVE_14_CONCRETE_PATHS: Array<{ concrete: string; template: string }> = [
  { concrete: '/api/premium/providers/anthropic', template: '/api/premium/providers/:name' },
  { concrete: '/api/premium/providers/openai', template: '/api/premium/providers/:name' },
  { concrete: '/api/premium/clean/cve/CVE-2024-3094', template: '/api/premium/clean/cve/:id' },
  { concrete: '/api/premium/clean/kev/CVE-2024-3094', template: '/api/premium/clean/kev/:id' },
  { concrete: '/api/premium/clean/epss/CVE-2026-44580', template: '/api/premium/clean/epss/:id' },
  { concrete: '/api/premium/security/verified/CVE-2024-3094', template: '/api/premium/security/verified/:id' },
  // Wave 29 (2026-05-30): parametric series. publisher (1 param), economy series (2 params).
  { concrete: '/api/premium/x402-index/publisher/tensorfeed.ai', template: '/api/premium/x402-index/publisher/:domain' },
];

// Premium paths that are intentionally NOT in BAZAAR_PILOTS. Used for
// negative-control assertions across the file.
const NON_PILOT_PREMIUM_PATHS = [
  '/api/premium/macro/digest',
  '/api/premium/watches',
];

describe('isBazaarPilotPath', () => {
  it('returns true for every Wave 0+1 pilot path', () => {
    for (const path of PILOT_PATHS) {
      expect(isBazaarPilotPath(path)).toBe(true);
    }
  });

  it('returns false for non-pilot premium paths', () => {
    for (const path of NON_PILOT_PREMIUM_PATHS) {
      expect(isBazaarPilotPath(path)).toBe(false);
    }
  });

  it('returns false for free paths', () => {
    expect(isBazaarPilotPath('/api/news')).toBe(false);
    expect(isBazaarPilotPath('/api/status')).toBe(false);
    expect(isBazaarPilotPath('/.well-known/x402.json')).toBe(false);
  });

  it('returns false for prototype-pollution attempts', () => {
    expect(isBazaarPilotPath('__proto__')).toBe(false);
    expect(isBazaarPilotPath('constructor')).toBe(false);
    expect(isBazaarPilotPath('toString')).toBe(false);
  });

  it('matches concrete Wave 14 paths against their template', () => {
    for (const { concrete } of WAVE_14_CONCRETE_PATHS) {
      expect(isBazaarPilotPath(concrete), `isBazaarPilotPath(${concrete}) should be true`).toBe(true);
    }
  });

  it('does NOT match paths with the wrong segment count against templates', () => {
    // Extra segment beyond the template
    expect(isBazaarPilotPath('/api/premium/clean/cve/CVE-2024-3094/extra')).toBe(false);
    // Missing the param segment
    expect(isBazaarPilotPath('/api/premium/clean/cve')).toBe(false);
    // Wrong prefix
    expect(isBazaarPilotPath('/api/premium/other/cve/CVE-2024-3094')).toBe(false);
  });
});

describe('Bazaar pilot strict-premium invariant', () => {
  // Structural fix for the audit finding that ai-crawler-access/full and
  // agent-ready/full were Bazaar pilots but missing from STRICT_PREMIUM_PATHS,
  // so anonymous CDP / x402scan crawlers got the full premium dataset on the
  // free-trial 200 path instead of a 402 (leaking the payload and never
  // settling, so CDP could not catalog them). 2026-06-04.
  //
  // Invariant: every key in BAZAAR_PILOTS must be strict-premium. A Bazaar
  // pilot that is NOT strict-premium falls through to the free-trial pool, so
  // anonymous discovery crawlers never see the 402 settlement they need to
  // catalog the endpoint, and the full premium payload leaks for free. Template
  // keys (Wave 14+, e.g. /api/premium/clean/cve/:id) are covered because
  // isStrictPremiumPath() prefix-matches them (the ':param' segment follows the
  // strict prefix slash), so the literal template string passes the check.
  //
  // EXEMPTIONS: paths that are deliberately gated some other way and are
  // intentionally NOT strict-premium. There are currently none: the audit noted
  // /api/premium/watches is hard-gated on a bearer token inside its handler (it
  // 401s rather than leaking), but it is NOT a BAZAAR_PILOTS key (it lives in
  // NON_PILOT_PREMIUM_PATHS), so the invariant never reaches it and no exemption
  // entry is required. The allowlist exists so that if such a deliberately
  // bearer-gated write IS ever added as a pilot, it can be exempted here with a
  // documented reason, while any other non-exempt pilot added without
  // strict-premium fails this test.
  const STRICT_PREMIUM_EXEMPT_PILOTS: ReadonlyArray<string> = [];

  it('every BAZAAR_PILOTS key is strict-premium (or an explicit exemption)', () => {
    const offenders: string[] = [];
    for (const key of bazaarPilotPaths()) {
      if (STRICT_PREMIUM_EXEMPT_PILOTS.includes(key)) continue;
      if (!isStrictPremiumPath(key)) {
        offenders.push(key);
      }
    }
    expect(
      offenders,
      `Bazaar pilots missing from strict-premium (free-trial 200 leaks the full premium payload to anonymous crawlers): ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('does not list a stale exemption (every exemption is still a pilot and still non-strict)', () => {
    // Keeps the allowlist honest: an exemption that no longer applies (the path
    // was removed, or it became strict-premium) should be deleted, not left to
    // rot. With an empty allowlist this is vacuously true today, but it guards
    // future entries.
    const pilots = new Set(bazaarPilotPaths());
    for (const exempt of STRICT_PREMIUM_EXEMPT_PILOTS) {
      expect(pilots.has(exempt), `exemption ${exempt} is no longer a Bazaar pilot`).toBe(true);
      expect(
        isStrictPremiumPath(exempt),
        `exemption ${exempt} is now strict-premium; remove it from the allowlist`,
      ).toBe(false);
    }
  });
});

describe('getBazaarPilotConfig', () => {
  it('returns a config with description and extension for every pilot path', () => {
    for (const path of PILOT_PATHS) {
      const config = getBazaarPilotConfig(path);
      expect(config, `getBazaarPilotConfig(${path}) should not be null`).not.toBeNull();
      expect(typeof config!.description).toBe('string');
      expect(config!.description.length).toBeGreaterThan(20);
      expect(typeof config!.extension).toBe('object');
      expect(config!.extension.bazaar).toBeDefined();
    }
  });

  it('returns null for non-piloted paths', () => {
    expect(getBazaarPilotConfig('/api/premium/macro/digest')).toBeNull();
    expect(getBazaarPilotConfig('/api/news')).toBeNull();
  });

  it('returns the template config when given a concrete Wave 14 path', () => {
    for (const { concrete, template } of WAVE_14_CONCRETE_PATHS) {
      const c1 = getBazaarPilotConfig(concrete);
      const c2 = getBazaarPilotConfig(template);
      expect(c1, `concrete ${concrete} should match`).not.toBeNull();
      expect(c1).toBe(c2);
    }
  });

  it('Wave 14 configs carry routeTemplate matching their map key', () => {
    for (const { template } of WAVE_14_CONCRETE_PATHS) {
      const config = getBazaarPilotConfig(template);
      const bazaar = (config!.extension.bazaar as Record<string, unknown>);
      expect(bazaar.routeTemplate, `${template} should declare routeTemplate`).toBe(template);
    }
  });
});

describe('bazaarExtensionsFor', () => {
  it('returns the bazaar extension block for every pilot path', () => {
    for (const path of PILOT_PATHS) {
      const ext = bazaarExtensionsFor(path);
      expect(ext.bazaar, `bazaarExtensionsFor(${path}).bazaar should be defined`).toBeDefined();
    }
  });

  it('returns an empty object for non-piloted paths', () => {
    expect(bazaarExtensionsFor('/api/premium/macro/digest')).toEqual({});
    expect(bazaarExtensionsFor('/api/news')).toEqual({});
  });
});

describe('bazaarDescriptionFor', () => {
  it('returns the pilot-specific description for piloted paths', () => {
    expect(bazaarDescriptionFor('/api/premium/whats-new', 'fallback')).toContain('morning brief');
    expect(bazaarDescriptionFor('/api/premium/routing', 'fallback').toLowerCase()).toContain(
      'recommendation',
    );
    expect(bazaarDescriptionFor('/api/premium/compare/models', 'fallback').toLowerCase()).toContain(
      'comparison',
    );
    expect(
      bazaarDescriptionFor('/api/premium/cost/projection', 'fallback').toLowerCase(),
    ).toContain('project');
  });

  it('returns the fallback for non-piloted paths', () => {
    expect(bazaarDescriptionFor('/api/premium/macro/digest', 'TensorFeed premium API')).toBe(
      'TensorFeed premium API',
    );
  });
});

describe('whats-new bazaar extension shape', () => {
  it('has the required v2 bazaar extension keys: info, schema', () => {
    const ext = bazaarExtensionsFor('/api/premium/whats-new');
    const bazaar = (ext.bazaar as Record<string, unknown>) ?? {};
    expect(bazaar.info).toBeDefined();
    expect(bazaar.schema).toBeDefined();
  });

  it('info.input declares HTTP GET with queryParams', () => {
    const ext = bazaarExtensionsFor('/api/premium/whats-new');
    const info = (ext.bazaar as Record<string, any>).info;
    expect(info.input.type).toBe('http');
    expect(info.input.method).toBe('GET');
    expect(typeof info.input.queryParams).toBe('object');
  });

  it('info.output declares JSON with a realistic example', () => {
    const ext = bazaarExtensionsFor('/api/premium/whats-new');
    const info = (ext.bazaar as Record<string, any>).info;
    expect(info.output.type).toBe('json');
    expect(info.output.example).toBeDefined();
    // Spot-check the example carries TF-specific fields
    expect(info.output.example.window).toBeDefined();
    expect(info.output.example.summary).toBeDefined();
    expect(info.output.example.pricing).toBeDefined();
    expect(info.output.example.status).toBeDefined();
    expect(info.output.example.news).toBeDefined();
  });

  it('uses the json-schema 2020-12 draft URI in the schema', () => {
    const ext = bazaarExtensionsFor('/api/premium/whats-new');
    const schema = (ext.bazaar as Record<string, any>).schema;
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
  });
});

describe('whats-new bazaar extension AJV validation', () => {
  // This is the load-bearing test: CDP runs the same validation on its
  // side. If `info` does not satisfy `schema`, the resource will not be
  // cataloged. Any future edit to the example or schema must keep this
  // passing or the pilot will silently fail to list in Bazaar.
  it('the example info validates against the declared schema', () => {
    const ext = bazaarExtensionsFor('/api/premium/whats-new');
    const bazaar = ext.bazaar as Record<string, any>;
    const ajv = new Ajv({ strict: false, allErrors: true });
    const validate = ajv.compile(bazaar.schema);
    const valid = validate(bazaar.info);
    if (!valid) {
      // Re-throw with full ajv error context so a regression points
      // directly at the offending property.
      throw new Error(
        `bazaar extension info failed schema validation: ${JSON.stringify(
          validate.errors,
          null,
          2,
        )}`,
      );
    }
    expect(valid).toBe(true);
  });

  it('rejects info with the wrong input.method (e.g. POST when schema says GET)', () => {
    // Negative control: confirm the schema actually enforces method
    const ext = bazaarExtensionsFor('/api/premium/whats-new');
    const bazaar = ext.bazaar as Record<string, any>;
    const ajv = new Ajv({ strict: false, allErrors: true });
    const validate = ajv.compile(bazaar.schema);
    const tampered = JSON.parse(JSON.stringify(bazaar.info));
    tampered.input.method = 'POST';
    expect(validate(tampered)).toBe(false);
  });

  it('rejects info with queryParams.days out of declared range', () => {
    const ext = bazaarExtensionsFor('/api/premium/whats-new');
    const bazaar = ext.bazaar as Record<string, any>;
    const ajv = new Ajv({ strict: false, allErrors: true });
    const validate = ajv.compile(bazaar.schema);
    const tampered = JSON.parse(JSON.stringify(bazaar.info));
    tampered.input.queryParams.days = 99;
    expect(validate(tampered)).toBe(false);
  });
});

describe('Wave 1 pilot AJV validation', () => {
  // Same load-bearing test as the whats-new block, generalized across the
  // three Wave 1 pilots. If any of these regress, the endpoint silently
  // fails to catalog in Bazaar.
  const wave1Paths = [
    '/api/premium/routing',
    '/api/premium/compare/models',
    '/api/premium/cost/projection',
  ];

  for (const path of wave1Paths) {
    it(`${path} info validates against its declared schema`, () => {
      const ext = bazaarExtensionsFor(path);
      const bazaar = ext.bazaar as Record<string, any>;
      const ajv = new Ajv({ strict: false, allErrors: true });
      const validate = ajv.compile(bazaar.schema);
      const valid = validate(bazaar.info);
      if (!valid) {
        throw new Error(
          `${path} bazaar extension info failed schema validation: ${JSON.stringify(
            validate.errors,
            null,
            2,
          )}`,
        );
      }
      expect(valid).toBe(true);
    });

    it(`${path} rejects info with wrong input.method (negative control)`, () => {
      const ext = bazaarExtensionsFor(path);
      const bazaar = ext.bazaar as Record<string, any>;
      const ajv = new Ajv({ strict: false, allErrors: true });
      const validate = ajv.compile(bazaar.schema);
      const tampered = JSON.parse(JSON.stringify(bazaar.info));
      tampered.input.method = 'POST';
      expect(validate(tampered)).toBe(false);
    });
  }
});

describe('Wave 2 pilot AJV validation', () => {
  // Wave 2 (2026-05-24): 11 flat-schema GET endpoints. Same load-bearing
  // AJV check as Wave 1: if any of these regress, the endpoint silently
  // fails to catalog in Bazaar.
  const wave2Paths = [
    '/api/premium/agents/directory',
    '/api/premium/funding/exposure',
    '/api/premium/packages/pypi/momentum',
    '/api/premium/research/velocity',
    '/api/premium/research/authors',
    '/api/premium/research/citation-velocity',
    '/api/premium/research/milestones',
    '/api/premium/research/emerging-keywords',
    '/api/premium/policy/timeline',
    '/api/premium/apis-guru/ai-feed',
    // Wave 3 (2026-05-24)
    '/api/premium/model-deprecations/timeline',
    // Wave 4 (2026-05-24)
    '/api/premium/inference-providers/arbitrage',
    // Wave 5 (2026-05-24)
    '/api/premium/ai-safety/incidents/exposure',
    // Wave 6 (2026-05-24)
    '/api/premium/ai-safety/packages/security/radar',
    // Wave 7 (2026-05-24)
    '/api/premium/packages/releases/velocity',
    // Wave 8 (2026-05-24)
    '/api/premium/ai-velocity',
    // Wave 9 (2026-05-24)
    '/api/premium/ai-crypto-pulse',
    // Wave 10 (2026-05-24)
    '/api/premium/coding-harnesses/weekly-deltas',
    // Wave 11 (2026-05-24)
    '/api/premium/news/action-cards',
    // Wave 12 (2026-05-24)
    '/api/premium/status/incidents/triage',
    // Wave 13 (2026-05-24)
    '/api/premium/ai-cves/ai-stack-cves',
    '/api/premium/ai-cves/exploited-in-wild',
    '/api/premium/ai-cves/cve',
    // Wave 15 (2026-05-26)
    '/api/premium/ai-cves/batch',
    // Wave 16 (2026-05-26)
    '/api/premium/status/openai/incidents/triage',
    '/api/premium/status/anthropic/incidents/triage',
    '/api/premium/status/google/incidents/triage',
    '/api/premium/status/aws/incidents/triage',
    '/api/premium/status/azure/incidents/triage',
    // Wave 17 (2026-05-26): SEC filings AI-extraction
    '/api/premium/sec/filings/ai-flagged',
    '/api/premium/sec/filings/by-form',
    // Wave 18 (2026-05-26): pro-tier whats-new
    '/api/premium/whats-new/pro',
  ];

  for (const path of wave2Paths) {
    it(`${path} info validates against its declared schema`, () => {
      const ext = bazaarExtensionsFor(path);
      const bazaar = ext.bazaar as Record<string, any>;
      const ajv = new Ajv({ strict: false, allErrors: true });
      const validate = ajv.compile(bazaar.schema);
      const valid = validate(bazaar.info);
      if (!valid) {
        throw new Error(
          `${path} bazaar extension info failed schema validation: ${JSON.stringify(
            validate.errors,
            null,
            2,
          )}`,
        );
      }
      expect(valid).toBe(true);
    });

    it(`${path} rejects info with wrong input.method (negative control)`, () => {
      const ext = bazaarExtensionsFor(path);
      const bazaar = ext.bazaar as Record<string, any>;
      const ajv = new Ajv({ strict: false, allErrors: true });
      const validate = ajv.compile(bazaar.schema);
      const tampered = JSON.parse(JSON.stringify(bazaar.info));
      tampered.input.method = 'POST';
      expect(validate(tampered)).toBe(false);
    });

    it(`${path} has a description longer than 40 chars`, () => {
      const config = getBazaarPilotConfig(path);
      expect(config).not.toBeNull();
      expect(config!.description.length).toBeGreaterThan(40);
    });
  }
});

describe('Wave 26 pilot AJV validation', () => {
  // Wave 26 (2026-05-30): agent news-search + brief cluster. Same load-bearing
  // AJV check as earlier waves: if any of these regress, the endpoint silently
  // fails to catalog in Bazaar (CDP runs the same validation on its side).
  const wave26Paths = [
    '/api/premium/news/decision-verified/search',
    '/api/premium/news/decision-verified',
    '/api/premium/research/topic-search',
    '/api/premium/recent',
  ];

  for (const path of wave26Paths) {
    it(`${path} info validates against its declared schema`, () => {
      const ext = bazaarExtensionsFor(path);
      const bazaar = ext.bazaar as Record<string, any>;
      const ajv = new Ajv({ strict: false, allErrors: true });
      const validate = ajv.compile(bazaar.schema);
      const valid = validate(bazaar.info);
      if (!valid) {
        throw new Error(
          `${path} bazaar extension info failed schema validation: ${JSON.stringify(
            validate.errors,
            null,
            2,
          )}`,
        );
      }
      expect(valid).toBe(true);
    });

    it(`${path} rejects info with wrong input.method (negative control)`, () => {
      const ext = bazaarExtensionsFor(path);
      const bazaar = ext.bazaar as Record<string, any>;
      const ajv = new Ajv({ strict: false, allErrors: true });
      const validate = ajv.compile(bazaar.schema);
      const tampered = JSON.parse(JSON.stringify(bazaar.info));
      tampered.input.method = 'POST';
      expect(validate(tampered)).toBe(false);
    });

    it(`${path} has a description longer than 40 chars`, () => {
      const config = getBazaarPilotConfig(path);
      expect(config).not.toBeNull();
      expect(config!.description.length).toBeGreaterThan(40);
    });
  }
});

describe('Wave 27 pilot AJV validation', () => {
  // Wave 27 (2026-05-30): time-series data feeds. Same load-bearing AJV check:
  // if any regress, the endpoint silently fails to catalog in Bazaar.
  const wave27Paths = [
    '/api/premium/history/pricing/series',
    '/api/premium/history/benchmarks/series',
    '/api/premium/history/status/uptime',
    '/api/premium/probe/series',
    '/api/premium/status/leaderboard',
    '/api/premium/attention/series',
    '/api/premium/openrouter/series',
    '/api/premium/mcp/registry/series',
    '/api/premium/x402-registry/series',
    '/api/premium/x402-index/series',
  ];

  for (const path of wave27Paths) {
    it(`${path} info validates against its declared schema`, () => {
      const ext = bazaarExtensionsFor(path);
      const bazaar = ext.bazaar as Record<string, any>;
      const ajv = new Ajv({ strict: false, allErrors: true });
      const validate = ajv.compile(bazaar.schema);
      const valid = validate(bazaar.info);
      if (!valid) {
        throw new Error(
          `${path} bazaar extension info failed schema validation: ${JSON.stringify(
            validate.errors,
            null,
            2,
          )}`,
        );
      }
      expect(valid).toBe(true);
    });

    it(`${path} rejects info with wrong input.method (negative control)`, () => {
      const ext = bazaarExtensionsFor(path);
      const bazaar = ext.bazaar as Record<string, any>;
      const ajv = new Ajv({ strict: false, allErrors: true });
      const validate = ajv.compile(bazaar.schema);
      const tampered = JSON.parse(JSON.stringify(bazaar.info));
      tampered.input.method = 'POST';
      expect(validate(tampered)).toBe(false);
    });

    it(`${path} has a description longer than 40 chars`, () => {
      const config = getBazaarPilotConfig(path);
      expect(config).not.toBeNull();
      expect(config!.description.length).toBeGreaterThan(40);
    });
  }
});

describe('Wave 28 pilot AJV validation', () => {
  // Wave 28 (2026-05-30): security data feeds. Same load-bearing AJV check:
  // if any regress, the endpoint silently fails to catalog in Bazaar.
  const wave28Paths = [
    '/api/premium/security/corroborated',
    '/api/premium/security/cve/range',
    '/api/premium/security/kev/series',
    '/api/premium/security/kev/full',
    '/api/premium/security/epss/series',
    '/api/premium/security/epss/top',
    '/api/premium/security/ghsa/ai-feed',
    '/api/premium/cve/kev-exploitation-timeline',
    '/api/premium/sec/filings/ai-disclosures',
  ];

  for (const path of wave28Paths) {
    it(`${path} info validates against its declared schema`, () => {
      const ext = bazaarExtensionsFor(path);
      const bazaar = ext.bazaar as Record<string, any>;
      const ajv = new Ajv({ strict: false, allErrors: true });
      const validate = ajv.compile(bazaar.schema);
      const valid = validate(bazaar.info);
      if (!valid) {
        throw new Error(
          `${path} bazaar extension info failed schema validation: ${JSON.stringify(
            validate.errors,
            null,
            2,
          )}`,
        );
      }
      expect(valid).toBe(true);
    });

    it(`${path} rejects info with wrong input.method (negative control)`, () => {
      const ext = bazaarExtensionsFor(path);
      const bazaar = ext.bazaar as Record<string, any>;
      const ajv = new Ajv({ strict: false, allErrors: true });
      const validate = ajv.compile(bazaar.schema);
      const tampered = JSON.parse(JSON.stringify(bazaar.info));
      tampered.input.method = 'POST';
      expect(validate(tampered)).toBe(false);
    });

    it(`${path} has a description longer than 40 chars`, () => {
      const config = getBazaarPilotConfig(path);
      expect(config).not.toBeNull();
      expect(config!.description.length).toBeGreaterThan(40);
    });
  }
});

describe('Wave 29 pilot AJV validation', () => {
  // Wave 29 (2026-05-30): Wave B tail, including 2 parametric configs whose
  // info carries pathParams. Same load-bearing AJV check.
  const wave29Paths = [
    '/api/premium/research/lab-productivity',
    '/api/premium/hf/velocity',
    '/api/premium/agents/leaderboard/full',
    '/api/premium/jobs',
    '/api/premium/x402-index/publisher/:domain',
  ];

  for (const path of wave29Paths) {
    it(`${path} info validates against its declared schema`, () => {
      const ext = bazaarExtensionsFor(path);
      const bazaar = ext.bazaar as Record<string, any>;
      const ajv = new Ajv({ strict: false, allErrors: true });
      const validate = ajv.compile(bazaar.schema);
      const valid = validate(bazaar.info);
      if (!valid) {
        throw new Error(
          `${path} bazaar extension info failed schema validation: ${JSON.stringify(
            validate.errors,
            null,
            2,
          )}`,
        );
      }
      expect(valid).toBe(true);
    });

    it(`${path} rejects info with wrong input.method (negative control)`, () => {
      const ext = bazaarExtensionsFor(path);
      const bazaar = ext.bazaar as Record<string, any>;
      const ajv = new Ajv({ strict: false, allErrors: true });
      const validate = ajv.compile(bazaar.schema);
      const tampered = JSON.parse(JSON.stringify(bazaar.info));
      tampered.input.method = 'POST';
      expect(validate(tampered)).toBe(false);
    });

    it(`${path} has a description longer than 40 chars`, () => {
      const config = getBazaarPilotConfig(path);
      expect(config).not.toBeNull();
      expect(config!.description.length).toBeGreaterThan(40);
    });
  }
});

describe('bazaarPilotPaths', () => {
  it('returns exactly the registered pilot paths', () => {
    expect(bazaarPilotPaths().sort()).toEqual([...PILOT_PATHS].sort());
  });

  it('does not include any non-pilot premium path', () => {
    const paths = bazaarPilotPaths();
    for (const p of NON_PILOT_PREMIUM_PATHS) {
      expect(paths).not.toContain(p);
    }
  });

  it('every returned path resolves to a pilot config', () => {
    for (const p of bazaarPilotPaths()) {
      expect(isBazaarPilotPath(p)).toBe(true);
      expect(getBazaarPilotConfig(p)).not.toBeNull();
    }
  });
});

describe('pilotTemplatePath', () => {
  // Maps a raw request path (which may carry a query string or a concrete
  // path param) to its stable BAZAAR_PILOTS key, so the usage meter
  // aggregates per template instead of fanning out across params. This is
  // the path the converter carried on 2026-05-30: a flat pilot reached with
  // query params must still fold into the bare template key.
  it('returns the flat template key for an exact-match pilot path', () => {
    expect(pilotTemplatePath('/api/premium/research/emerging-keywords')).toBe(
      '/api/premium/research/emerging-keywords',
    );
    expect(pilotTemplatePath('/api/premium/whats-new')).toBe('/api/premium/whats-new');
  });

  it('ignores a trailing query string when matching the template', () => {
    expect(
      pilotTemplatePath('/api/premium/research/emerging-keywords?text=x&targetLanguage=French'),
    ).toBe('/api/premium/research/emerging-keywords');
    expect(pilotTemplatePath('/api/premium/routing?task=code&top_n=3')).toBe(
      '/api/premium/routing',
    );
  });

  it('folds a concrete Wave 14 path param into its template key', () => {
    for (const { concrete, template } of WAVE_14_CONCRETE_PATHS) {
      expect(pilotTemplatePath(concrete), `pilotTemplatePath(${concrete})`).toBe(template);
    }
  });

  it('folds a concrete path param plus a query string into its template key', () => {
    expect(pilotTemplatePath('/api/premium/clean/epss/CVE-2026-44580?series=true')).toBe(
      '/api/premium/clean/epss/:id',
    );
    expect(pilotTemplatePath('/api/premium/ai-companies/NVDA?fields=pricing')).toBe(
      '/api/premium/ai-companies/:ticker',
    );
  });

  it('returns null for a non-pilot path', () => {
    expect(pilotTemplatePath('/api/premium/macro/digest')).toBeNull();
    expect(pilotTemplatePath('/api/news')).toBeNull();
    expect(pilotTemplatePath('/api/premium/clean/cve')).toBeNull();
  });
});

describe('pilotCatalogStatus', () => {
  it('marks a pilot cataloged only on exact pathname match of a full URL', () => {
    const status = pilotCatalogStatus([
      { resource: 'https://tensorfeed.ai/api/premium/whats-new' },
    ]);
    const byPath = Object.fromEntries(status.map((s) => [s.path, s.cataloged]));
    expect(byPath['/api/premium/whats-new']).toBe(true);
    expect(byPath['/api/premium/routing']).toBe(false);
    expect(byPath['/api/premium/compare/models']).toBe(false);
    expect(byPath['/api/premium/cost/projection']).toBe(false);
  });

  it('ignores query strings when matching the pathname', () => {
    const status = pilotCatalogStatus([
      { resource: 'https://tensorfeed.ai/api/premium/routing?task=code' },
    ]);
    const byPath = Object.fromEntries(status.map((s) => [s.path, s.cataloged]));
    expect(byPath['/api/premium/routing']).toBe(true);
  });

  it('matches a bare path resource (non-absolute URL fallback)', () => {
    const status = pilotCatalogStatus([
      { resource: '/api/premium/cost/projection' },
    ]);
    const byPath = Object.fromEntries(status.map((s) => [s.path, s.cataloged]));
    expect(byPath['/api/premium/cost/projection']).toBe(true);
  });

  it('does not let a sibling path false-match (compare vs compare/models)', () => {
    const status = pilotCatalogStatus([
      { resource: 'https://tensorfeed.ai/api/premium/compare' },
    ]);
    const byPath = Object.fromEntries(status.map((s) => [s.path, s.cataloged]));
    expect(byPath['/api/premium/compare/models']).toBe(false);
  });

  it('returns one entry per pilot path, all false, for an empty catalog', () => {
    const status = pilotCatalogStatus([]);
    expect(status).toHaveLength(bazaarPilotPaths().length);
    expect(status.every((s) => s.cataloged === false)).toBe(true);
  });
});

describe('bazaar pilot configs are btoa-safe (Latin1 only)', () => {
  // payments.ts emits the x402 402 header via btoa(JSON.stringify(headerCanonical))
  // (payments.ts:2922 and :3097), and the canonical carries the bazaar extension.
  // btoa throws on any UTF-16 code unit above 0xFF, so a single em dash, smart
  // quote, or box-drawing char in a pilot description or example output 500s the
  // live endpoint (this happened once on /api/premium/apis-guru/ai-feed). Latin1
  // chars (code points up to 0xFF, such as accented letters) are fine; forbid
  // anything above 0xFF. This codifies the "Latin1-scan before deploy" rule.
  function firstBadChar(value: unknown, path: string, out: string[]): void {
    if (typeof value === 'string') {
      for (let i = 0; i < value.length; i++) {
        if (value.charCodeAt(i) > 0xff) {
          const hex = value.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
          out.push(`${path}: U+${hex} near ${JSON.stringify(value.slice(Math.max(0, i - 12), i + 12))}`);
          return;
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => firstBadChar(v, `${path}[${i}]`, out));
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) firstBadChar(v, `${path}.${k}`, out);
    }
  }

  it('every pilot config string is Latin1-encodable (no code unit above 0xFF)', () => {
    const offenders: string[] = [];
    for (const p of bazaarPilotPaths()) {
      firstBadChar(getBazaarPilotConfig(p), p, offenders);
    }
    expect(
      offenders,
      `non-Latin1 chars would crash btoa() at request time: ${offenders.join(' | ')}`,
    ).toEqual([]);
  });
});
