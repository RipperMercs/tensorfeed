import { describe, it, expect } from 'vitest';
import {
  BADGE_CSP,
  escapeSvgText,
  pickBadgeColor,
  renderBadgeSvg,
  renderUnknownBadgeSvg,
  sanitizeDisplayName,
  shortIdentityLabel,
} from './agent-reputation-badge';
import type { ReputationCard, ReputationRanks } from './agent-reputation';

function card(overrides: Partial<ReputationCard> = {}): ReputationCard {
  const ranks: ReputationRanks = {
    reliability: { rank: 5, total: 10, pct: 50 },
    spend: { rank: 5, total: 10, pct: 50 },
    activity: { rank: 5, total: 10, pct: 50 },
    streak: { rank: 5, total: 10, pct: 50 },
    composite: { rank: 5, total: 10, pct: 50 },
  };
  return {
    ok: true,
    wallet: null,
    token_prefix: 'tf_live_18e54f47',
    display_name: null,
    operator_url: null,
    verified: false,
    ofac_clean: true,
    banned: false,
    ban_reason: null,
    trust_grade: 'C',
    flags: [],
    first_seen: '2026-04-01T00:00:00Z',
    last_active: '2026-05-13T00:00:00Z',
    wallet_age_days: 42,
    metrics: {
      total_calls: 100,
      successful_calls: 95,
      reliability_pct: 95,
      total_premium_calls: 50,
      total_credits_spent: 100,
      receipts_signed: 50,
      active_days: 30,
      current_streak_days: 7,
      longest_streak_days: 14,
      unique_endpoints_used: 10,
      errors_4xx: 5,
      errors_5xx: 0,
      free_trial_calls: 50,
      paid_calls: 50,
      wallet_age_days: 42,
    },
    ranks,
    attribution: {
      source: 's',
      derivation: 'd',
      license: 'l',
      compliance: 'c',
    },
    ...overrides,
  };
}

describe('escapeSvgText', () => {
  it('escapes all XML metacharacters', () => {
    expect(escapeSvgText('<script>')).toBe('&lt;script&gt;');
    expect(escapeSvgText('a&b')).toBe('a&amp;b');
    expect(escapeSvgText('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeSvgText("'single'")).toBe('&apos;single&apos;');
  });
  it('passes plain text through unchanged', () => {
    expect(escapeSvgText('Agent X')).toBe('Agent X');
  });
});

describe('sanitizeDisplayName', () => {
  it('strips XML metacharacters before they reach the renderer', () => {
    expect(sanitizeDisplayName('<script>alert(1)</script>')).toBe('scriptalert1script');
  });
  it('strips javascript: URI fragments', () => {
    expect(sanitizeDisplayName('javascript:alert(1)')).toBe('javascriptalert1');
  });
  it('allows alphanumerics, space, dot, underscore, hyphen', () => {
    expect(sanitizeDisplayName('Cool.Agent_42-X v2')).toBe('Cool.Agent_42-X v2');
  });
  it('returns null when input is empty after sanitization', () => {
    expect(sanitizeDisplayName('<<<>>>')).toBeNull();
    expect(sanitizeDisplayName('')).toBeNull();
    expect(sanitizeDisplayName(null)).toBeNull();
    expect(sanitizeDisplayName(undefined)).toBeNull();
  });
  it('caps at 24 visible chars', () => {
    expect(sanitizeDisplayName('A'.repeat(100))?.length).toBe(24);
  });
  it('trims whitespace', () => {
    expect(sanitizeDisplayName('   spaced   ')).toBe('spaced');
  });
});

describe('shortIdentityLabel', () => {
  it('formats valid 0x40-hex wallet as 0xABCD...EFGH', () => {
    const c = card({ wallet: '0x1234567890ABCDEF1234567890ABCDEF12345678', token_prefix: null });
    expect(shortIdentityLabel(c)).toBe('0x1234…5678');
  });
  it('falls back to token_prefix when wallet is missing', () => {
    expect(shortIdentityLabel(card({ wallet: null, token_prefix: 'tf_live_18e54f47' }))).toBe('tf_live_18e54f47');
  });
  it('returns "unknown" when both are absent', () => {
    expect(shortIdentityLabel(card({ wallet: null, token_prefix: null }))).toBe('unknown');
  });
});

describe('pickBadgeColor', () => {
  const ranks = (composite: number): ReputationRanks => ({
    reliability: { rank: composite, total: 100, pct: 50 },
    spend: { rank: composite, total: 100, pct: 50 },
    activity: { rank: composite, total: 100, pct: 50 },
    streak: { rank: composite, total: 100, pct: 50 },
    composite: { rank: composite, total: 100, pct: 50 },
  });

  it('returns gold for rank 1 in any metric', () => {
    expect(pickBadgeColor(ranks(1), 'C')).toBe('#FFD700');
  });
  it('returns silver for rank 2', () => {
    expect(pickBadgeColor(ranks(2), 'C')).toBe('#C0C0C0');
  });
  it('returns bronze for rank 3', () => {
    expect(pickBadgeColor(ranks(3), 'C')).toBe('#CD7F32');
  });
  it('falls back to grade color for rank 4+', () => {
    expect(pickBadgeColor(ranks(4), 'A')).toBe('#00ff88');
    expect(pickBadgeColor(ranks(4), 'F')).toBe('#ff3333');
  });
  it('returns gold if the agent is rank 1 in any single metric', () => {
    const mixed: ReputationRanks = {
      reliability: { rank: 1, total: 100, pct: 99 },
      spend: { rank: 50, total: 100, pct: 50 },
      activity: { rank: 50, total: 100, pct: 50 },
      streak: { rank: 50, total: 100, pct: 50 },
      composite: { rank: 50, total: 100, pct: 50 },
    };
    expect(pickBadgeColor(mixed, 'C')).toBe('#FFD700');
  });
});

describe('renderBadgeSvg (output shape + safety)', () => {
  it('emits a 200x40 SVG with the required structural elements', () => {
    const svg = renderBadgeSvg(card());
    expect(svg).toContain('<svg ');
    expect(svg).toContain('width="200"');
    expect(svg).toContain('height="40"');
    expect(svg).toContain('viewBox="0 0 200 40"');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="');
    expect(svg).toContain('TF</text>');
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('inserts the sanitized display name into the body', () => {
    const svg = renderBadgeSvg(card({ display_name: 'Cool.Agent' }));
    expect(svg).toContain('>Cool.Agent</text>');
  });

  it('falls back to the short identity when display_name is null', () => {
    const svg = renderBadgeSvg(card({ display_name: null, token_prefix: 'tf_live_aabbccdd' }));
    expect(svg).toContain('>tf_live_aabbccdd</text>');
  });

  it('NEVER contains an unescaped < or > from a malicious display name', () => {
    const svg = renderBadgeSvg(
      card({ display_name: '<script>alert("xss")</script>' }),
    );
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('alert(');
    expect(svg).not.toContain('"xss"');
  });

  it('NEVER contains javascript: URIs from a malicious display name', () => {
    const svg = renderBadgeSvg(card({ display_name: 'javascript:alert(1)' }));
    expect(svg.toLowerCase()).not.toContain('javascript:');
  });

  it('handles a NaN reliability gracefully (renders 0%)', () => {
    const c = card();
    (c.metrics as any).reliability_pct = NaN;
    const svg = renderBadgeSvg(c);
    expect(svg).toContain('0%');
  });

  it('clamps reliability above 100 to 100%', () => {
    const c = card();
    c.metrics.reliability_pct = 250;
    expect(renderBadgeSvg(c)).toContain('100%');
  });

  it('renders the trust grade letter', () => {
    expect(renderBadgeSvg(card({ trust_grade: 'A' }))).toContain(' A</text>');
    expect(renderBadgeSvg(card({ trust_grade: 'F' }))).toContain(' F</text>');
  });

  it('falls back to D for an unknown trust grade letter', () => {
    const c = card();
    (c as any).trust_grade = 'Z';
    expect(renderBadgeSvg(c)).toContain(' D</text>');
  });

  it('uses gold tier color when composite rank is 1', () => {
    const c = card();
    c.ranks.composite = { rank: 1, total: 5, pct: 100 };
    expect(renderBadgeSvg(c)).toContain('#FFD700');
  });

  it('stays under 2000 bytes (spec: ~2 KB target)', () => {
    expect(renderBadgeSvg(card()).length).toBeLessThan(2000);
  });

  it('aria-label encodes the same metadata users see', () => {
    const svg = renderBadgeSvg(card({ trust_grade: 'B', display_name: 'Acme' }));
    expect(svg).toContain('aria-label="TensorFeed agent Acme');
    expect(svg).toContain('trust grade B');
  });

  it('handles rank 0 (no rank computed) as "#-"', () => {
    const c = card();
    c.ranks.composite = { rank: 0, total: 0, pct: 0 };
    expect(renderBadgeSvg(c)).toContain('#- ');
  });
});

describe('renderUnknownBadgeSvg', () => {
  it('renders a "no record yet" placeholder', () => {
    const svg = renderUnknownBadgeSvg('tf_live_deadbeef');
    expect(svg).toContain('no record yet');
    expect(svg).toContain('tf_live_deadbeef');
    expect(svg.endsWith('</svg>')).toBe(true);
  });
  it('escapes XSS in the identity arg', () => {
    const svg = renderUnknownBadgeSvg('<script>alert(1)</script>');
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('alert(');
  });
});

describe('BADGE_CSP', () => {
  it('locks down every fetch directive', () => {
    expect(BADGE_CSP).toContain("default-src 'none'");
    expect(BADGE_CSP).toContain("script-src 'none'");
    expect(BADGE_CSP).toContain("style-src 'none'");
  });
});
