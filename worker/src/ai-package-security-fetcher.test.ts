import { describe, it, expect } from 'vitest';
import { normalizeAdvisory } from './ai-package-security-fetcher';
import type { PackageAdvisory } from './ai-package-security-fetcher';

// ── OSV shape (mirrors the internal OsvVuln interface in the module) ──

interface OsvSeverity {
  type?: string;
  score?: string;
}

interface OsvAffectedRange {
  type?: string;
  events?: Array<{ introduced?: string; fixed?: string; last_affected?: string }>;
}

interface OsvAffected {
  package?: { name?: string; ecosystem?: string };
  ranges?: OsvAffectedRange[];
  versions?: string[];
}

interface OsvReference {
  type?: string;
  url?: string;
}

interface OsvDatabaseSpecific {
  severity?: string;
  github_reviewed?: boolean;
}

interface OsvVuln {
  id?: string;
  aliases?: string[];
  summary?: string;
  details?: string;
  modified?: string;
  published?: string;
  withdrawn?: string;
  severity?: OsvSeverity[];
  affected?: OsvAffected[];
  references?: OsvReference[];
  database_specific?: OsvDatabaseSpecific;
}

/**
 * Build a synthetic OsvVuln. Defaults are filled with placeholder values
 * so callers only override what matters for the test.
 */
function makeAdvisory(partial: Partial<OsvVuln> = {}): OsvVuln {
  return {
    id: 'GHSA-default-0000-0000',
    aliases: [],
    summary: '',
    published: '2026-05-01T00:00:00Z',
    modified: '2026-05-01T00:00:00Z',
    severity: [],
    affected: [],
    references: [],
    ...partial,
  };
}

// ── id validation ──────────────────────────────────────────────────

describe('normalizeAdvisory: id validation', () => {
  it('returns null when id is missing', () => {
    const v = makeAdvisory({ id: undefined });
    expect(normalizeAdvisory(v, 'langchain', 'PyPI')).toBeNull();
  });

  it('returns null when id is empty string', () => {
    const v = makeAdvisory({ id: '' });
    expect(normalizeAdvisory(v, 'langchain', 'PyPI')).toBeNull();
  });

  it('returns null when id is a non-string (number)', () => {
    const v = makeAdvisory({ id: 42 as unknown as string });
    expect(normalizeAdvisory(v, 'langchain', 'PyPI')).toBeNull();
  });

  it('returns null when id is a non-string (null literal)', () => {
    const v = makeAdvisory({ id: null as unknown as string });
    expect(normalizeAdvisory(v, 'langchain', 'PyPI')).toBeNull();
  });
});

// ── happy path verbatim ────────────────────────────────────────────

describe('normalizeAdvisory: happy path', () => {
  it('returns a fully populated PackageAdvisory from a real OSV-shaped object', () => {
    const v: OsvVuln = {
      id: 'GHSA-1234-abcd-5678',
      aliases: ['CVE-2026-12345', 'PYSEC-2026-99'],
      summary: 'Prompt injection in LangChain agent executor',
      published: '2026-05-01T00:00:00Z',
      modified: '2026-05-10T00:00:00Z',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H/8.8' }],
      affected: [
        {
          package: { name: 'langchain', ecosystem: 'PyPI' },
          versions: ['0.1.0', '0.1.1'],
          ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0.1.0' }, { fixed: '0.1.2' }] }],
        },
      ],
      references: [
        { type: 'ADVISORY', url: 'https://github.com/foo/bar/security/advisories/GHSA-1234' },
        { type: 'WEB', url: 'https://example.com/post' },
      ],
    };
    const adv = normalizeAdvisory(v, 'langchain', 'PyPI');
    expect(adv).not.toBeNull();
    const a = adv as PackageAdvisory;
    expect(a.id).toBe('GHSA-1234-abcd-5678');
    expect(a.aliases).toEqual(['CVE-2026-12345', 'PYSEC-2026-99']);
    expect(a.summary).toBe('Prompt injection in LangChain agent executor');
    expect(a.published).toBe('2026-05-01T00:00:00Z');
    expect(a.modified).toBe('2026-05-10T00:00:00Z');
    expect(a.withdrawn).toBeNull();
    expect(a.severity_band).toBe('high');
    expect(a.cvss_score).toBe(8.8);
    expect(a.vulnerable_versions).toContain('0.1.0');
    expect(a.vulnerable_versions).toContain('0.1.1');
    expect(a.first_patched_version).toBe('0.1.2');
    expect(a.reference_urls).toEqual([
      'https://github.com/foo/bar/security/advisories/GHSA-1234',
      'https://example.com/post',
    ]);
  });
});

// ── summary truncation ─────────────────────────────────────────────

describe('normalizeAdvisory: summary handling', () => {
  it('truncates summary to 280 chars', () => {
    const long = 'A'.repeat(500);
    const v = makeAdvisory({ id: 'GHSA-x', summary: long });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.summary.length).toBe(280);
    expect(adv!.summary).toBe('A'.repeat(280));
  });

  it('keeps short summary verbatim', () => {
    const v = makeAdvisory({ id: 'GHSA-x', summary: 'short summary' });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.summary).toBe('short summary');
  });

  it('summary defaults to empty string when missing', () => {
    const v = makeAdvisory({ id: 'GHSA-x', summary: undefined });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.summary).toBe('');
  });

  it('summary defaults to empty string when non-string', () => {
    const v = makeAdvisory({ id: 'GHSA-x', summary: 42 as unknown as string });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.summary).toBe('');
  });
});

// ── aliases filtering ──────────────────────────────────────────────

describe('normalizeAdvisory: aliases', () => {
  it('filters aliases to strings only', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      aliases: ['CVE-1', null as unknown as string, 'CVE-2', 42 as unknown as string, undefined as unknown as string],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.aliases).toEqual(['CVE-1', 'CVE-2']);
  });

  it('returns empty array when aliases is missing', () => {
    const v = makeAdvisory({ id: 'GHSA-x', aliases: undefined });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.aliases).toEqual([]);
  });

  it('returns empty array when aliases is empty', () => {
    const v = makeAdvisory({ id: 'GHSA-x', aliases: [] });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.aliases).toEqual([]);
  });
});

// ── withdrawn passthrough ──────────────────────────────────────────

describe('normalizeAdvisory: withdrawn', () => {
  it('passes withdrawn through as string when present', () => {
    const v = makeAdvisory({ id: 'GHSA-x', withdrawn: '2026-05-20T00:00:00Z' });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.withdrawn).toBe('2026-05-20T00:00:00Z');
  });

  it('returns null when withdrawn is missing', () => {
    const v = makeAdvisory({ id: 'GHSA-x', withdrawn: undefined });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.withdrawn).toBeNull();
  });

  it('returns null when withdrawn is non-string', () => {
    const v = makeAdvisory({ id: 'GHSA-x', withdrawn: 0 as unknown as string });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.withdrawn).toBeNull();
  });
});

// ── severity_band classification ───────────────────────────────────

describe('normalizeAdvisory: severity_band from CVSS score', () => {
  it('classifies 9.0 as critical (boundary)', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/9.0' }],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.severity_band).toBe('critical');
    expect(adv!.cvss_score).toBe(9.0);
  });

  it('classifies 9.5 as critical', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/9.5' }],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.severity_band).toBe('critical');
    expect(adv!.cvss_score).toBe(9.5);
  });

  it('classifies 7.0 as high (boundary)', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/7.0' }],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.severity_band).toBe('high');
    expect(adv!.cvss_score).toBe(7.0);
  });

  it('classifies 8.9 as high', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/8.9' }],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.severity_band).toBe('high');
    expect(adv!.cvss_score).toBe(8.9);
  });

  it('classifies 4.0 as medium (boundary)', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/4.0' }],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.severity_band).toBe('medium');
    expect(adv!.cvss_score).toBe(4.0);
  });

  it('classifies 6.9 as medium', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/6.9' }],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.severity_band).toBe('medium');
    expect(adv!.cvss_score).toBe(6.9);
  });

  it('classifies 0.1 as low', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/0.1' }],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.severity_band).toBe('low');
    expect(adv!.cvss_score).toBe(0.1);
  });

  it('classifies 3.9 as low', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/3.9' }],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.severity_band).toBe('low');
    expect(adv!.cvss_score).toBe(3.9);
  });

  it('classifies 0.0 as unknown', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/0.0' }],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.severity_band).toBe('unknown');
    expect(adv!.cvss_score).toBe(0.0);
  });

  it('falls back to database_specific.severity=Critical (case-insensitive) when CVSS missing', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      severity: [],
      database_specific: { severity: 'CRITICAL' },
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.severity_band).toBe('critical');
    expect(adv!.cvss_score).toBeNull();
  });

  it('falls back to database_specific.severity=high (case-insensitive)', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      severity: [],
      database_specific: { severity: 'High' },
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.severity_band).toBe('high');
    expect(adv!.cvss_score).toBeNull();
  });

  it('returns unknown when CVSS missing and db_specific missing', () => {
    const v = makeAdvisory({ id: 'GHSA-x', severity: [], database_specific: undefined });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.severity_band).toBe('unknown');
    expect(adv!.cvss_score).toBeNull();
  });

  it('prefers CVSS V4 over V3 when both present', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      severity: [
        { type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/5.0' },
        { type: 'CVSS_V4', score: 'CVSS:4.0/AV:N/9.5' },
      ],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.cvss_score).toBe(9.5);
    expect(adv!.severity_band).toBe('critical');
  });

  it('parses score from a full CVSS vector ending in /N.N', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      severity: [{ type: 'CVSS_V3', score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H/8.8' }],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.cvss_score).toBe(8.8);
    expect(adv!.severity_band).toBe('high');
  });
});

// ── vulnerable_versions extraction ─────────────────────────────────

describe('normalizeAdvisory: vulnerable_versions', () => {
  it('extracts versions from affected[].versions[]', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      affected: [
        {
          package: { name: 'langchain', ecosystem: 'PyPI' },
          versions: ['0.1.0', '0.1.1', '0.1.2'],
        },
      ],
    });
    const adv = normalizeAdvisory(v, 'langchain', 'PyPI');
    expect(adv!.vulnerable_versions).toContain('0.1.0');
    expect(adv!.vulnerable_versions).toContain('0.1.1');
    expect(adv!.vulnerable_versions).toContain('0.1.2');
  });

  it('extracts version ranges from ranges[].events[]', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      affected: [
        {
          package: { name: 'langchain', ecosystem: 'PyPI' },
          ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0.1.0' }, { fixed: '0.1.5' }] }],
        },
      ],
    });
    const adv = normalizeAdvisory(v, 'langchain', 'PyPI');
    expect(adv!.vulnerable_versions).toContain('0.1.0-0.1.5');
  });

  it('combines versions and ranges into a single deduped list', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      affected: [
        {
          package: { name: 'langchain', ecosystem: 'PyPI' },
          versions: ['0.1.0'],
          ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0.1.0' }, { fixed: '0.2.0' }] }],
        },
      ],
    });
    const adv = normalizeAdvisory(v, 'langchain', 'PyPI');
    expect(adv!.vulnerable_versions).toEqual(['0.1.0', '0.1.0-0.2.0']);
  });

  it('skips affected entries when package name does not match (case-insensitive)', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      affected: [
        {
          package: { name: 'someotherpkg', ecosystem: 'PyPI' },
          versions: ['1.0.0'],
        },
      ],
    });
    const adv = normalizeAdvisory(v, 'langchain', 'PyPI');
    expect(adv!.vulnerable_versions).toEqual([]);
  });

  it('matches package name case-insensitively', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      affected: [
        {
          package: { name: 'LangChain', ecosystem: 'PyPI' },
          versions: ['0.1.0'],
        },
      ],
    });
    const adv = normalizeAdvisory(v, 'langchain', 'PyPI');
    expect(adv!.vulnerable_versions).toEqual(['0.1.0']);
  });

  it('skips affected entries when ecosystem does not match', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      affected: [
        {
          package: { name: 'langchain', ecosystem: 'npm' },
          versions: ['0.1.0'],
        },
      ],
    });
    const adv = normalizeAdvisory(v, 'langchain', 'PyPI');
    expect(adv!.vulnerable_versions).toEqual([]);
  });

  it('handles last_affected event when no fixed event present', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      affected: [
        {
          package: { name: 'pkg', ecosystem: 'PyPI' },
          ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '1.0.0' }, { last_affected: '1.5.0' }] }],
        },
      ],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.vulnerable_versions).toContain('1.0.0-1.5.0');
  });

  it('returns empty array when affected is missing', () => {
    const v = makeAdvisory({ id: 'GHSA-x', affected: undefined });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.vulnerable_versions).toEqual([]);
  });
});

// ── first_patched_version ──────────────────────────────────────────

describe('normalizeAdvisory: first_patched_version', () => {
  it('pulls from the first range with a fixed event', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      affected: [
        {
          package: { name: 'pkg', ecosystem: 'PyPI' },
          ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0.1.0' }, { fixed: '0.2.0' }] }],
        },
      ],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.first_patched_version).toBe('0.2.0');
  });

  it('returns null when no fixed event exists in any range', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      affected: [
        {
          package: { name: 'pkg', ecosystem: 'PyPI' },
          ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0.1.0' }] }],
        },
      ],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.first_patched_version).toBeNull();
  });

  it('returns null when affected is missing', () => {
    const v = makeAdvisory({ id: 'GHSA-x', affected: undefined });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.first_patched_version).toBeNull();
  });
});

// ── reference_urls ─────────────────────────────────────────────────

describe('normalizeAdvisory: reference_urls', () => {
  it('drops entries without url', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      references: [
        { type: 'ADVISORY', url: 'https://example.com/a' },
        { type: 'WEB' },
        { type: 'WEB', url: 'https://example.com/b' },
      ],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.reference_urls).toEqual(['https://example.com/a', 'https://example.com/b']);
  });

  it('collects only url strings, not the full reference object', () => {
    const v = makeAdvisory({
      id: 'GHSA-x',
      references: [{ type: 'ADVISORY', url: 'https://example.com/x' }],
    });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.reference_urls).toEqual(['https://example.com/x']);
  });

  it('returns empty array when references is missing', () => {
    const v = makeAdvisory({ id: 'GHSA-x', references: undefined });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.reference_urls).toEqual([]);
  });

  it('returns empty array when references is empty', () => {
    const v = makeAdvisory({ id: 'GHSA-x', references: [] });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.reference_urls).toEqual([]);
  });
});

// ── date defaults ──────────────────────────────────────────────────

describe('normalizeAdvisory: date defaults', () => {
  it('published defaults to empty string when missing', () => {
    const v = makeAdvisory({ id: 'GHSA-x', published: undefined });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.published).toBe('');
  });

  it('modified defaults to empty string when missing', () => {
    const v = makeAdvisory({ id: 'GHSA-x', modified: undefined });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.modified).toBe('');
  });

  it('published defaults to empty string when non-string', () => {
    const v = makeAdvisory({ id: 'GHSA-x', published: 0 as unknown as string });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.published).toBe('');
  });

  it('modified defaults to empty string when non-string', () => {
    const v = makeAdvisory({ id: 'GHSA-x', modified: 0 as unknown as string });
    const adv = normalizeAdvisory(v, 'pkg', 'PyPI');
    expect(adv!.modified).toBe('');
  });
});
