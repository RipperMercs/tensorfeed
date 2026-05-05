import { describe, it, expect } from 'vitest';
import {
  generateBadgeSvg,
  resolveProviderSlug,
  generateUptimeBadge,
} from './badges';
import type { Env } from './types';

interface MockKV {
  get: (key: string, type?: string) => Promise<unknown>;
  put: () => Promise<void>;
}

function makeMockKv(seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed));
  const kv: MockKV = {
    get: async (key, type) => {
      const raw = store.get(key);
      if (raw === undefined) return null;
      if (type === 'json') return JSON.parse(raw);
      return raw;
    },
    put: async () => {},
  };
  return { kv };
}

function makeEnv(kv: MockKV): Env {
  return { TENSORFEED_STATUS: kv as unknown as Env['TENSORFEED_STATUS'] } as Env;
}

describe('resolveProviderSlug', () => {
  it('resolves common provider slugs to their STATUS_PAGES names', () => {
    expect(resolveProviderSlug('claude')).toBe('Claude API');
    expect(resolveProviderSlug('openai')).toBe('OpenAI API');
    expect(resolveProviderSlug('gemini')).toBe('Google Gemini');
    expect(resolveProviderSlug('bedrock')).toBe('AWS Bedrock');
    expect(resolveProviderSlug('azure')).toBe('Azure OpenAI');
    expect(resolveProviderSlug('hf')).toBe('Hugging Face');
  });

  it('is case-insensitive', () => {
    expect(resolveProviderSlug('CLAUDE')).toBe('Claude API');
    expect(resolveProviderSlug('OpenAI')).toBe('OpenAI API');
  });

  it('supports hyphenated multi-word slugs', () => {
    expect(resolveProviderSlug('aws-bedrock')).toBe('AWS Bedrock');
    expect(resolveProviderSlug('azure-openai')).toBe('Azure OpenAI');
    expect(resolveProviderSlug('together-ai')).toBe('Together AI');
    expect(resolveProviderSlug('luma-ai')).toBe('Luma');
  });

  it('returns null for unknown slugs', () => {
    expect(resolveProviderSlug('xai')).toBeNull();
    expect(resolveProviderSlug('grok')).toBeNull();
    expect(resolveProviderSlug('not-a-provider')).toBeNull();
  });
});

describe('generateBadgeSvg', () => {
  it('produces a valid SVG with correct width/height', () => {
    const svg = generateBadgeSvg('claude uptime', '99.97%', '#4c1');
    expect(svg).toMatch(/^<svg /);
    expect(svg).toMatch(/<\/svg>$/);
    expect(svg).toMatch(/height="20"/);
    expect(svg).toMatch(/role="img"/);
  });

  it('embeds the label and value text', () => {
    const svg = generateBadgeSvg('claude uptime', '99.97%', '#4c1');
    // Both shadow and main text elements include the label/value
    const labelMatches = svg.match(/claude uptime/g);
    expect(labelMatches?.length).toBeGreaterThanOrEqual(2);
    const valueMatches = svg.match(/99\.97%/g);
    expect(valueMatches?.length).toBeGreaterThanOrEqual(2);
  });

  it('uses the provided color for the right (value) section', () => {
    const svg = generateBadgeSvg('test', 'value', '#e05d44');
    expect(svg).toContain('fill="#e05d44"');
  });

  it('escapes XML special characters in label and value', () => {
    const svg = generateBadgeSvg('a&b<c>d', 'v"e\'f', '#4c1');
    expect(svg).toContain('a&amp;b&lt;c&gt;d');
    expect(svg).toContain('v&quot;e&apos;f');
    // Ensure the raw chars are not present in text content
    expect(svg).not.toMatch(/>a&b<c>d</);
  });

  it('aria-label combines label and value for accessibility', () => {
    const svg = generateBadgeSvg('claude', '99.97%', '#4c1');
    expect(svg).toContain('aria-label="claude: 99.97%"');
  });

  it('total width equals labelW + valueW (no gap, no overlap)', () => {
    const svg = generateBadgeSvg('xx', 'yy', '#4c1');
    const widthMatch = svg.match(/^<svg [^>]*width="(\d+)"/);
    expect(widthMatch).not.toBeNull();
    const totalW = parseInt(widthMatch![1], 10);
    // Both rects together must equal totalW
    const labelRect = svg.match(/<rect width="(\d+)" height="20" fill="#555"\/>/);
    const valueRect = svg.match(/<rect x="(\d+)" width="(\d+)" height="20" fill="#4c1"\/>/);
    expect(labelRect).not.toBeNull();
    expect(valueRect).not.toBeNull();
    const labelW = parseInt(labelRect![1], 10);
    const valueW = parseInt(valueRect![2], 10);
    expect(labelW + valueW).toBe(totalW);
  });
});

describe('generateUptimeBadge', () => {
  it('returns null for unknown provider slug', async () => {
    const { kv } = makeMockKv();
    const env = makeEnv(kv);
    const result = await generateUptimeBadge(env, 'not-a-real-provider');
    expect(result).toBeNull();
  });

  it('renders "no data" when leaderboard has no decisive samples for the provider', async () => {
    const { kv } = makeMockKv();
    const env = makeEnv(kv);
    const result = await generateUptimeBadge(env, 'claude');
    expect(result).not.toBeNull();
    expect(result!.svg).toContain('no data');
    // Gray no-data color
    expect(result!.svg).toContain('#9f9f9f');
  });

  it('renders the percentage and bright-green color for >=99.9% uptime', async () => {
    // Seed today's daycount with operational polls for Claude
    const today = new Date().toISOString().slice(0, 10);
    const seed = {
      [`daycount:${today}`]: JSON.stringify({
        'Claude API': { polls: 1000, operational: 1000, degraded: 0, down: 0, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const result = await generateUptimeBadge(env, 'claude');
    expect(result).not.toBeNull();
    expect(result!.svg).toContain('100.00%');
    expect(result!.svg).toContain('#4c1'); // bright green
  });

  it('uses red color for low uptime', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const seed = {
      [`daycount:${today}`]: JSON.stringify({
        'Claude API': { polls: 1000, operational: 500, degraded: 0, down: 500, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const result = await generateUptimeBadge(env, 'claude');
    expect(result).not.toBeNull();
    expect(result!.svg).toContain('50.00%');
    expect(result!.svg).toContain('#e05d44'); // red
  });

  it('produces a stable etag for the same uptime value', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const seed = {
      [`daycount:${today}`]: JSON.stringify({
        'Claude API': { polls: 1000, operational: 999, degraded: 0, down: 1, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const a = await generateUptimeBadge(env, 'claude');
    const b = await generateUptimeBadge(env, 'claude');
    expect(a?.etag).toBe(b?.etag);
    // ETag must be quoted per RFC 7232
    expect(a?.etag).toMatch(/^".*"$/);
  });

  it('honors the customLabel parameter', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const seed = {
      [`daycount:${today}`]: JSON.stringify({
        'Claude API': { polls: 100, operational: 100, degraded: 0, down: 0, unknown: 0 },
      }),
    };
    const { kv } = makeMockKv(seed);
    const env = makeEnv(kv);
    const result = await generateUptimeBadge(env, 'claude', 'anthropic SLA');
    expect(result!.svg).toContain('anthropic SLA');
    // Default label should NOT be present when custom is provided
    expect(result!.svg).not.toContain('claude api uptime');
  });
});
