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
} from './bazaar-pilots';

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
  '/api/premium/economy/recession-watch',
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
  // Wave 15 (ai-cves batch — AgentMail messages/batch-get translation)
  '/api/premium/ai-cves/batch',
  // Wave 16 (per-provider incident triage — AgentMail scoped+flat translation)
  '/api/premium/status/openai/incidents/triage',
  '/api/premium/status/anthropic/incidents/triage',
  '/api/premium/status/google/incidents/triage',
  '/api/premium/status/aws/incidents/triage',
  '/api/premium/status/azure/incidents/triage',
  // Wave 17 (SEC filings AI-extraction — Phase 3f.3)
  '/api/premium/sec/filings/ai-flagged',
  '/api/premium/sec/filings/by-form',
  // Wave 18 (pro-tier whats-new — Parallel.ai tier-ladder pattern)
  '/api/premium/whats-new/pro',
  // Wave 14 (path-param templates). Listed here in template form because
  // bazaarPilotPaths() returns the map keys. The template-match lookup is
  // exercised separately below with concrete request paths.
  '/api/premium/providers/:name',
  '/api/premium/clean/cve/:id',
  '/api/premium/clean/kev/:id',
  '/api/premium/clean/epss/:id',
  '/api/premium/clean/openrouter/:model_id',
  '/api/premium/security/verified/:id',
  // Wave 19 (per-ticker AI-company envelope — Robinhood Agentic Trading launch)
  '/api/premium/ai-companies/:ticker',
  // Wave 20 (route-verdict: signed model-routing decision)
  '/api/premium/route-verdict',
  // Wave 21 (stack-safety-verdict: deploy gate)
  '/api/premium/stack-safety-verdict',
  // Wave 22 (benchmark-trust-verdict)
  '/api/premium/benchmark-trust-verdict',
] as const;

// Concrete request paths that should match a Wave 14 template.
const WAVE_14_CONCRETE_PATHS: Array<{ concrete: string; template: string }> = [
  { concrete: '/api/premium/providers/anthropic', template: '/api/premium/providers/:name' },
  { concrete: '/api/premium/providers/openai', template: '/api/premium/providers/:name' },
  { concrete: '/api/premium/clean/cve/CVE-2024-3094', template: '/api/premium/clean/cve/:id' },
  { concrete: '/api/premium/clean/kev/CVE-2024-3094', template: '/api/premium/clean/kev/:id' },
  { concrete: '/api/premium/clean/epss/CVE-2026-44580', template: '/api/premium/clean/epss/:id' },
  { concrete: '/api/premium/clean/openrouter/anthropic%2Fclaude-haiku-4.5', template: '/api/premium/clean/openrouter/:model_id' },
  { concrete: '/api/premium/security/verified/CVE-2024-3094', template: '/api/premium/security/verified/:id' },
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
    '/api/premium/economy/recession-watch',
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
