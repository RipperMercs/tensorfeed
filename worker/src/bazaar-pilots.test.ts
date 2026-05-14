/**
 * Tests for the bazaar pilot registry.
 *
 * Important: validates the bazaar extension's `info` against its `schema`
 * using AJV — the same library CDP uses on its facilitator side. If the
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
} from './bazaar-pilots';

describe('isBazaarPilotPath', () => {
  it('returns true for the whats-new pilot path', () => {
    expect(isBazaarPilotPath('/api/premium/whats-new')).toBe(true);
  });

  it('returns false for non-pilot premium paths', () => {
    expect(isBazaarPilotPath('/api/premium/routing')).toBe(false);
    expect(isBazaarPilotPath('/api/premium/compare/models')).toBe(false);
    expect(isBazaarPilotPath('/api/premium/macro/digest')).toBe(false);
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
});

describe('getBazaarPilotConfig', () => {
  it('returns a config with description and extension for piloted paths', () => {
    const config = getBazaarPilotConfig('/api/premium/whats-new');
    expect(config).not.toBeNull();
    expect(typeof config!.description).toBe('string');
    expect(config!.description.length).toBeGreaterThan(20);
    expect(typeof config!.extension).toBe('object');
    expect(config!.extension.bazaar).toBeDefined();
  });

  it('returns null for non-piloted paths', () => {
    expect(getBazaarPilotConfig('/api/premium/routing')).toBeNull();
    expect(getBazaarPilotConfig('/api/news')).toBeNull();
  });
});

describe('bazaarExtensionsFor', () => {
  it('returns the bazaar extension block for piloted paths', () => {
    const ext = bazaarExtensionsFor('/api/premium/whats-new');
    expect(ext.bazaar).toBeDefined();
  });

  it('returns an empty object for non-piloted paths', () => {
    expect(bazaarExtensionsFor('/api/premium/routing')).toEqual({});
    expect(bazaarExtensionsFor('/api/news')).toEqual({});
  });
});

describe('bazaarDescriptionFor', () => {
  it('returns the pilot-specific description for piloted paths', () => {
    const desc = bazaarDescriptionFor('/api/premium/whats-new', 'fallback');
    expect(desc).toContain('morning brief');
  });

  it('returns the fallback for non-piloted paths', () => {
    expect(bazaarDescriptionFor('/api/premium/routing', 'TensorFeed premium API')).toBe(
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
