import { describe, it, expect } from 'vitest';
import { decodeEntities, stripTags, parseItem, extractPosts } from './research-blogs';

describe('decodeEntities / stripTags', () => {
  it('decodes entities and unwraps CDATA', () => {
    expect(decodeEntities('A &amp; B')).toBe('A & B');
    expect(stripTags('<![CDATA[<p>Hello &amp; <b>world</b></p>]]>')).toBe('Hello & world');
  });
});

const RSS_ITEM = `<item>
  <title>Adaptive Parallel Reasoning</title>
  <link>https://bair.berkeley.edu/blog/2026/06/01/apr/</link>
  <description><![CDATA[<p>A new <b>paradigm</b> for efficient inference &amp; scaling.</p>]]></description>
  <pubDate>Sun, 01 Jun 2026 12:00:00 +0000</pubDate>
</item>`;

const ATOM_ENTRY = `<entry>
  <title type="html">Launching the DeepMind Accelerator</title>
  <link rel="alternate" href="https://deepmind.google/blog/accelerator/"/>
  <summary>We are launching a program in Asia Pacific.</summary>
  <updated>2026-05-30T09:00:00Z</updated>
</entry>`;

describe('parseItem', () => {
  it('parses an RSS item (link element, CDATA description, pubDate)', () => {
    const p = parseItem(RSS_ITEM, 'Berkeley BAIR')!;
    expect(p.title).toBe('Adaptive Parallel Reasoning');
    expect(p.url).toBe('https://bair.berkeley.edu/blog/2026/06/01/apr/');
    expect(p.snippet).toBe('A new paradigm for efficient inference & scaling.');
    expect(p.source).toBe('Berkeley BAIR');
    expect(p.published_at).toBe(new Date('Sun, 01 Jun 2026 12:00:00 +0000').toISOString());
  });
  it('parses an Atom entry (href link, summary, updated)', () => {
    const p = parseItem(ATOM_ENTRY, 'Google DeepMind')!;
    expect(p.title).toBe('Launching the DeepMind Accelerator');
    expect(p.url).toBe('https://deepmind.google/blog/accelerator/');
    expect(p.published_at).toBe('2026-05-30T09:00:00.000Z');
  });
  it('returns null without a title or link', () => {
    expect(parseItem('<item><description>x</description></item>', 'X')).toBeNull();
  });
});

describe('extractPosts', () => {
  it('extracts RSS items and Atom entries and honors the cap', () => {
    const xml = RSS_ITEM + ATOM_ENTRY;
    expect(extractPosts(xml, 'Mixed', 50)).toHaveLength(2);
    expect(extractPosts(RSS_ITEM + RSS_ITEM + RSS_ITEM, 'X', 2)).toHaveLength(2);
  });
});
