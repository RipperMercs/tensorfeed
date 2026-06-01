import { describe, it, expect } from 'vitest';
import { decodeEntities, stripTags, parsePaperBlock, extractPapers } from './acl-anthology';

describe('decodeEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('A &amp; B &lt;c&gt;')).toBe('A & B <c>');
    expect(decodeEntities('caf&#233; &#x41;')).toBe('café A');
  });
  it('leaves unknown entities intact', () => {
    expect(decodeEntities('&bogus;')).toBe('&bogus;');
  });
});

describe('stripTags', () => {
  it('removes inline tags, decodes entities, collapses whitespace', () => {
    expect(stripTags('<fixed-case>BERT</fixed-case>: a   model &amp; more')).toBe('BERT: a model & more');
  });
});

const BLOCK = `
      <title><fixed-case>EcomScript</fixed-case>: Planning &amp; Scripts</title>
      <author><first>Sreyashi</first><last>Nag</last></author>
      <author><first>Wenju</first><last>Xu</last><affiliation>Amazon</affiliation></author>
      <author><first>Sheikh</first><last>Sarwar</last></author>
      <author><first>A</first><last>B</last></author>
      <author><first>C</first><last>D</last></author>
      <author><first>E</first><last>F</last></author>
      <pages>1-17</pages>
      <abstract>Goal-oriented script planning is the ability to devise <b>coherent</b> sequences toward goals.</abstract>
      <url hash="abc">2025.acl-long.1</url>
      <doi>10.18653/v1/2025.acl-long.1</doi>`;

describe('parsePaperBlock', () => {
  it('extracts the paper fields, strips tags, caps authors at 5', () => {
    const p = parsePaperBlock(BLOCK, 'ACL 2025')!;
    expect(p.title).toBe('EcomScript: Planning & Scripts');
    expect(p.authors).toEqual(['Sreyashi Nag', 'Wenju Xu', 'Sheikh Sarwar', 'A B', 'C D']); // capped at 5
    expect(p.venue_group).toBe('ACL 2025');
    expect(p.abstract_snippet).toBe('Goal-oriented script planning is the ability to devise coherent sequences toward goals.');
    expect(p.url).toBe('https://aclanthology.org/2025.acl-long.1');
    expect(p.doi).toBe('10.18653/v1/2025.acl-long.1');
  });
  it('returns null without a title or url', () => {
    expect(parsePaperBlock('<author><first>X</first><last>Y</last></author>', 'ACL 2025')).toBeNull();
  });
});

describe('extractPapers', () => {
  it('extracts complete blocks and ignores a truncated trailing block', () => {
    const xml =
      `<paper id="1">${BLOCK}</paper>` +
      `<paper id="2"><title>Second</title><url>2025.acl-long.2</url></paper>` +
      `<paper id="3"><title>Truncated by Range fetch</title><url>2025.acl-long.3`; // no closing tags
    const papers = extractPapers(xml, 'ACL 2025', 50);
    expect(papers).toHaveLength(2);
    expect(papers[1].title).toBe('Second');
  });
  it('honors the cap', () => {
    const xml = Array.from({ length: 5 }, (_, i) => `<paper id="${i}"><title>P${i}</title><url>u${i}</url></paper>`).join('');
    expect(extractPapers(xml, 'ACL 2025', 3)).toHaveLength(3);
  });
});
