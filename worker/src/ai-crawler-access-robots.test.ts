// worker/src/ai-crawler-access-robots.test.ts
import { describe, it, expect } from 'vitest';
import { parseRobotsTxt, verdictForBot } from './ai-crawler-access-robots';

describe('parseRobotsTxt', () => {
  it('groups rules under their user-agent lines', () => {
    const groups = parseRobotsTxt('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow:');
    expect(groups).toHaveLength(2);
    expect(groups[0].agents).toEqual(['gptbot']);
    expect(groups[0].rules).toEqual([{ type: 'disallow', path: '/' }]);
    expect(groups[1].agents).toEqual(['*']);
  });

  it('supports multiple user-agent lines sharing one group', () => {
    const groups = parseRobotsTxt('User-agent: GPTBot\nUser-agent: CCBot\nDisallow: /');
    expect(groups[0].agents).toEqual(['gptbot', 'ccbot']);
  });

  it('ignores comments, blank lines, crawl-delay and sitemap', () => {
    const groups = parseRobotsTxt('# c\nUser-agent: *\nCrawl-delay: 10\nSitemap: https://x/y.xml\nDisallow: /admin');
    expect(groups[0].rules).toEqual([{ type: 'disallow', path: '/admin' }]);
  });
});

describe('verdictForBot', () => {
  const v = (txt: string, bot: string) => verdictForBot(parseRobotsTxt(txt), bot);

  it('returns allowed when no group matches', () => {
    expect(v('User-agent: SomeOtherBot\nDisallow: /', 'GPTBot')).toBe('allowed');
  });
  it('returns allowed on empty/malformed file', () => {
    expect(v('', 'GPTBot')).toBe('allowed');
    expect(v('garbage line without colon', 'GPTBot')).toBe('allowed');
  });
  it('exact agent group beats wildcard', () => {
    expect(v('User-agent: *\nDisallow:\n\nUser-agent: GPTBot\nDisallow: /', 'GPTBot')).toBe('blocked');
  });
  it('falls back to wildcard when no exact match', () => {
    expect(v('User-agent: *\nDisallow: /', 'GPTBot')).toBe('blocked');
  });
  it('root disallow is blocked', () => {
    expect(v('User-agent: GPTBot\nDisallow: /', 'GPTBot')).toBe('blocked');
  });
  it('subpath disallow only is partial', () => {
    expect(v('User-agent: GPTBot\nDisallow: /private', 'GPTBot')).toBe('partial');
  });
  it('empty disallow is allowed', () => {
    expect(v('User-agent: GPTBot\nDisallow:', 'GPTBot')).toBe('allowed');
  });
  it('Allow: / overrides Disallow: / (allowed)', () => {
    expect(v('User-agent: GPTBot\nDisallow: /\nAllow: /', 'GPTBot')).toBe('allowed');
  });
  it('matching is case-insensitive on the agent token', () => {
    expect(v('User-agent: gptbot\nDisallow: /', 'GPTBot')).toBe('blocked');
  });
});
