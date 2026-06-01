import type { Env } from './types';

/**
 * ACL Anthology NLP/CL proceedings feed (Track A2, source 2).
 *
 * Surfaces recent papers from the current ACL / EMNLP / NAACL proceedings via
 * the ACL Anthology. The Anthology has no JSON API; its data is per-venue XML
 * on GitHub (master/data/xml/<year>.<venue>.xml), and the main-conference
 * files are large (2 to 5 MB). So this Range-fetches the first chunk of each
 * venue file (bounded fetch + parse), regex-extracts complete <paper> blocks,
 * and caps per venue. Workers have no DOM/XML parser, so the parse is regex
 * with an explicit entity decoder.
 *
 * Source posture: ACL Anthology metadata, abstracts CC-BY. TensorFeed LINKS
 * and SUMMARIZES (clipped abstract + url); full papers are linked, not
 * republished. Mirrors openreview.ts: pure transforms, KV no-TTL
 * (last-known-good), refresh with loud logging, read accessor.
 *
 * Maintenance: the VENUES list is curated; update the year/venue files each
 * conference cycle.
 */

const RAW_BASE = 'https://raw.githubusercontent.com/acl-org/acl-anthology/master/data/xml';
const ANTHOLOGY_URL = 'https://aclanthology.org';
const CURRENT_KEY = 'acl-proceedings:current';
const RANGE_BYTES = 500_000; // first ~500KB per venue file (~200 papers)
const PER_VENUE_CAP = 30;
const TOTAL_CAP = 90;
const ABSTRACT_CLIP = 240;
const FETCH_TIMEOUT_MS = 20_000;
const UA = 'tensorfeed-research/1.0 (+https://tensorfeed.ai)';

interface VenueConfig {
  file: string;
  label: string;
}
const VENUES: VenueConfig[] = [
  { file: '2025.acl.xml', label: 'ACL 2025' },
  { file: '2025.emnlp.xml', label: 'EMNLP 2025' },
  { file: '2025.naacl.xml', label: 'NAACL 2025' },
];

export interface AclPaper {
  title: string;
  authors: string[];
  venue_group: string;
  abstract_snippet: string;
  url: string;
  doi: string | null;
}

export interface NlpProceedingsSnapshot {
  capturedAt: string;
  venues: string[];
  paper_count: number;
  papers: AclPaper[];
  notes: string[];
  source: { name: string; url: string; license: string };
}

// ── Pure transforms (tested) ───────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Decode XML/HTML entities (named + numeric). Workers have no html.unescape. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, e: string) => {
    if (e[0] === '#') {
      const cp = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    return NAMED_ENTITIES[e] ?? m;
  });
}

/** Remove inline XML tags, decode entities, collapse whitespace. */
export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function clip(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 3).trimEnd()}...`;
}

export function parsePaperBlock(block: string, label: string): AclPaper | null {
  const tm = block.match(/<title>([\s\S]*?)<\/title>/);
  const um = block.match(/<url[^>]*>([\s\S]*?)<\/url>/);
  if (!tm || !um) return null;
  const title = stripTags(tm[1]);
  const urlId = stripTags(um[1]);
  if (!title || !urlId) return null;

  const authors: string[] = [];
  for (const am of block.matchAll(/<author>([\s\S]*?)<\/author>/g)) {
    const a = am[1];
    const f = a.match(/<first>([\s\S]*?)<\/first>/);
    const l = a.match(/<last>([\s\S]*?)<\/last>/);
    const name = `${f ? stripTags(f[1]) : ''} ${l ? stripTags(l[1]) : ''}`.trim();
    if (name) authors.push(name);
    if (authors.length >= 5) break;
  }

  const ab = block.match(/<abstract>([\s\S]*?)<\/abstract>/);
  const doi = block.match(/<doi>([\s\S]*?)<\/doi>/);
  return {
    title,
    authors,
    venue_group: label,
    abstract_snippet: ab ? clip(stripTags(ab[1]), ABSTRACT_CLIP) : '',
    url: urlId.startsWith('http') ? urlId : `${ANTHOLOGY_URL}/${urlId}`,
    doi: doi ? stripTags(doi[1]) : null,
  };
}

/** Extract up to `cap` papers from an XML chunk. A truncated trailing block (from the Range fetch) is ignored because its closing tag is missing. */
export function extractPapers(xmlChunk: string, label: string, cap: number): AclPaper[] {
  const out: AclPaper[] = [];
  for (const m of xmlChunk.matchAll(/<paper id="\d+">([\s\S]*?)<\/paper>/g)) {
    const p = parsePaperBlock(m[1], label);
    if (p) out.push(p);
    if (out.length >= cap) break;
  }
  return out;
}

// ── Fetch + refresh ────────────────────────────────────────────────

async function fetchVenueChunk(file: string): Promise<string | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${RAW_BASE}/${file}`, {
      headers: { 'User-Agent': UA, Range: `bytes=0-${RANGE_BYTES}`, Accept: 'application/xml' },
      signal: controller.signal,
    });
    if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status} (${file})`);
    return await res.text();
  } finally {
    clearTimeout(id);
  }
}

export interface RefreshNlpResult {
  ok: boolean;
  count?: number;
  error?: string;
}

export async function refreshAclProceedings(env: Env): Promise<RefreshNlpResult> {
  const papers: AclPaper[] = [];
  const venues: string[] = [];
  for (const v of VENUES) {
    try {
      const chunk = await fetchVenueChunk(v.file);
      if (!chunk) continue;
      const got = extractPapers(chunk, v.label, PER_VENUE_CAP);
      if (got.length > 0) {
        papers.push(...got);
        if (!venues.includes(v.label)) venues.push(v.label);
      }
    } catch (err) {
      console.warn(`[acl-anthology] fetch/parse failed for ${v.file}: ${(err as Error).message}`);
    }
  }
  if (papers.length === 0) {
    console.warn('[acl-anthology] refresh skipped, no papers parsed; snapshot NOT written');
    return { ok: false, error: 'no papers parsed' };
  }
  const capped = papers.slice(0, TOTAL_CAP);
  const snapshot: NlpProceedingsSnapshot = {
    capturedAt: new Date().toISOString(),
    venues,
    paper_count: capped.length,
    papers: capped,
    notes: [
      'Recent papers from the current ACL, EMNLP, and NAACL proceedings via the ACL Anthology. A bounded per-venue sample (the first papers in program order); follow url for the full paper. Abstracts (CC-BY) are clipped. The venue list is curated and refreshed each cycle.',
    ],
    source: {
      name: 'ACL Anthology',
      url: 'https://aclanthology.org',
      license: 'ACL Anthology metadata; abstracts CC-BY. TensorFeed links and summarizes with a clipped abstract; full papers are linked, not republished.',
    },
  };
  await env.TENSORFEED_CACHE.put(CURRENT_KEY, JSON.stringify(snapshot));
  return { ok: true, count: capped.length };
}

export async function getAclProceedings(env: Env): Promise<NlpProceedingsSnapshot | null> {
  const raw = await env.TENSORFEED_CACHE.get(CURRENT_KEY, 'text');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NlpProceedingsSnapshot;
  } catch {
    return null;
  }
}
