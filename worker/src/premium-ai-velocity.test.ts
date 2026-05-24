import { describe, it, expect } from 'vitest';
import {
  parsePipeline,
  parseLanguage,
  parseMinTraction,
  parseCrossOnly,
  scoreHf,
  scoreGh,
  buildCrossPollinated,
  buildVelocity,
  DEFAULT_MIN_TRACTION,
} from './premium-ai-velocity';
import type {
  AiVelocitySnapshot,
  HfEntry,
  GhEntry,
} from './terminalfeed-ai-velocity-fetcher';
import type { ScoredHf, ScoredGh } from './premium-ai-velocity';

// ── factories ──────────────────────────────────────────────────────

function makeHf(partial: Partial<HfEntry> & { id: string; name: string }): HfEntry {
  return {
    id: partial.id,
    author: partial.author ?? null,
    name: partial.name,
    likes: partial.likes ?? 0,
    downloads: partial.downloads ?? 0,
    pipeline: partial.pipeline ?? 'text-generation',
    url: partial.url ?? `https://huggingface.co/${partial.id}`,
    updated: partial.updated ?? null,
    normalized_name: partial.normalized_name ?? partial.name.toLowerCase(),
  };
}

function makeGh(partial: Partial<GhEntry> & { fullName: string; name: string }): GhEntry {
  return {
    name: partial.name,
    fullName: partial.fullName,
    description: partial.description ?? '',
    language: partial.language ?? '',
    stars: partial.stars ?? 0,
    url: partial.url ?? `https://github.com/${partial.fullName}`,
    matched_markers: partial.matched_markers ?? [],
    normalized_name: partial.normalized_name ?? partial.name.toLowerCase(),
  };
}

function makeScoredHf(h: HfEntry): ScoredHf {
  return { ...h, traction_score: scoreHf(h), on_both: false };
}

function makeScoredGh(g: GhEntry): ScoredGh {
  return { ...g, traction_score: scoreGh(g), on_both: false };
}

function makeSnapshot(
  hf: HfEntry[],
  github: GhEntry[],
  capturedAt = '2026-05-24T00:00:00.000Z',
): AiVelocitySnapshot {
  return {
    capturedAt,
    source: 'terminalfeed.io',
    upstream_endpoints: {
      hf: 'https://terminalfeed.io/api/hf-trending',
      github: 'https://terminalfeed.io/api/github-trending',
    },
    source_license:
      'Federation cross-call to TerminalFeed (free public endpoints). Underlying HF and GitHub data carry their own terms; we link back via per-entry url.',
    hf_count: hf.length,
    github_count: github.length,
    hf,
    github,
  };
}

const DEFAULT_FILTER = {
  pipeline: null,
  language: null,
  min_traction: DEFAULT_MIN_TRACTION,
  cross_only: false,
};

// ── parsePipeline ──────────────────────────────────────────────────

describe('parsePipeline', () => {
  it('returns null on null input', () => {
    expect(parsePipeline(null)).toBeNull();
  });

  it('returns null on whitespace-only input', () => {
    expect(parsePipeline('   ')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parsePipeline('  text-generation  ')).toBe('text-generation');
  });

  it('returns null on empty string', () => {
    expect(parsePipeline('')).toBeNull();
  });
});

// ── parseLanguage ──────────────────────────────────────────────────

describe('parseLanguage', () => {
  it('returns null on null input', () => {
    expect(parseLanguage(null)).toBeNull();
  });

  it('returns null on whitespace-only input', () => {
    expect(parseLanguage('   ')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(parseLanguage('  Python  ')).toBe('Python');
  });

  it('returns null on empty string', () => {
    expect(parseLanguage('')).toBeNull();
  });
});

// ── parseMinTraction ───────────────────────────────────────────────

describe('parseMinTraction', () => {
  it('returns default (0) on null', () => {
    expect(parseMinTraction(null)).toBe(DEFAULT_MIN_TRACTION);
    expect(DEFAULT_MIN_TRACTION).toBe(0);
  });

  it('returns default on empty string', () => {
    expect(parseMinTraction('')).toBe(DEFAULT_MIN_TRACTION);
  });

  it('returns default on non-numeric input', () => {
    expect(parseMinTraction('not-a-number')).toBe(DEFAULT_MIN_TRACTION);
  });

  it('parses float values', () => {
    expect(parseMinTraction('42.5')).toBe(42.5);
  });

  it('clamps negative to 0', () => {
    expect(parseMinTraction('-100')).toBe(0);
  });

  it('clamps above 10000 to 10000', () => {
    expect(parseMinTraction('99999')).toBe(10000);
  });

  it('accepts boundary 0', () => {
    expect(parseMinTraction('0')).toBe(0);
  });

  it('accepts boundary 10000', () => {
    expect(parseMinTraction('10000')).toBe(10000);
  });
});

// ── parseCrossOnly ─────────────────────────────────────────────────

describe('parseCrossOnly', () => {
  it('returns false on null', () => {
    expect(parseCrossOnly(null)).toBe(false);
  });

  it('returns true on "1"', () => {
    expect(parseCrossOnly('1')).toBe(true);
  });

  it('returns true on "true" (case-insensitive)', () => {
    expect(parseCrossOnly('true')).toBe(true);
    expect(parseCrossOnly('TRUE')).toBe(true);
    expect(parseCrossOnly('True')).toBe(true);
  });

  it('returns true on "yes" (case-insensitive)', () => {
    expect(parseCrossOnly('yes')).toBe(true);
    expect(parseCrossOnly('YES')).toBe(true);
  });

  it('returns false on "0"', () => {
    expect(parseCrossOnly('0')).toBe(false);
  });

  it('returns false on "false"', () => {
    expect(parseCrossOnly('false')).toBe(false);
  });

  it('returns false on garbage input', () => {
    expect(parseCrossOnly('maybe')).toBe(false);
  });
});

// ── scoreHf ────────────────────────────────────────────────────────

describe('scoreHf', () => {
  it('combines likes*3 + log10(downloads+1)*10, rounded to 1 decimal', () => {
    // likes=10, downloads=999: 10*3 + log10(1000)*10 = 30 + 30 = 60.0
    const h = makeHf({ id: 'a/b', name: 'b', likes: 10, downloads: 999 });
    expect(scoreHf(h)).toBe(60);
  });

  it('returns 0 for likes=0, downloads=0', () => {
    const h = makeHf({ id: 'a/b', name: 'b', likes: 0, downloads: 0 });
    expect(scoreHf(h)).toBe(0);
  });

  it('rounds to 1 decimal place', () => {
    // likes=1, downloads=0: 3 + log10(1)*10 = 3 + 0 = 3.0
    const h = makeHf({ id: 'a/b', name: 'b', likes: 1, downloads: 0 });
    expect(scoreHf(h)).toBe(3);
  });

  it('weights likes heavier than downloads', () => {
    const onlyLikes = makeHf({ id: 'a/b', name: 'b', likes: 100, downloads: 0 });
    const onlyDownloads = makeHf({ id: 'a/c', name: 'c', likes: 0, downloads: 100 });
    expect(scoreHf(onlyLikes)).toBeGreaterThan(scoreHf(onlyDownloads));
  });
});

// ── scoreGh ────────────────────────────────────────────────────────

describe('scoreGh', () => {
  it('uses log10(stars+1)*30, rounded to 1 decimal', () => {
    // stars=99: log10(100)*30 = 2*30 = 60.0
    const g = makeGh({ fullName: 'a/b', name: 'b', stars: 99 });
    expect(scoreGh(g)).toBe(60);
  });

  it('returns 0 when stars=0', () => {
    const g = makeGh({ fullName: 'a/b', name: 'b', stars: 0 });
    expect(scoreGh(g)).toBe(0);
  });

  it('rounds to 1 decimal place', () => {
    // stars=9: log10(10)*30 = 30.0
    const g = makeGh({ fullName: 'a/b', name: 'b', stars: 9 });
    expect(scoreGh(g)).toBe(30);
  });
});

// ── buildCrossPollinated ───────────────────────────────────────────

describe('buildCrossPollinated', () => {
  it('returns empty when no normalized_name overlap', () => {
    const hf = [makeScoredHf(makeHf({ id: 'a/alpha', name: 'alpha' }))];
    const gh = [makeScoredGh(makeGh({ fullName: 'org/beta', name: 'beta' }))];
    expect(buildCrossPollinated(hf, gh)).toEqual([]);
  });

  it('matches by normalized_name across feeds', () => {
    const hf = [
      makeScoredHf(
        makeHf({ id: 'Meta-Llama/llama-3-8b', name: 'llama-3-8b', likes: 100, downloads: 1000, normalized_name: 'llama-3-8b' }),
      ),
    ];
    const gh = [
      makeScoredGh(
        makeGh({ fullName: 'meta/llama-3-8b', name: 'llama-3-8b', stars: 999, normalized_name: 'llama-3-8b' }),
      ),
    ];
    const out = buildCrossPollinated(hf, gh);
    expect(out.length).toBe(1);
    expect(out[0].normalized_name).toBe('llama-3-8b');
    expect(out[0].hf.id).toBe('Meta-Llama/llama-3-8b');
    expect(out[0].github.fullName).toBe('meta/llama-3-8b');
  });

  it('sorts by combined_traction desc', () => {
    const hfA = makeScoredHf(makeHf({ id: 'x/a', name: 'a', likes: 1, normalized_name: 'a' }));
    const hfB = makeScoredHf(makeHf({ id: 'x/b', name: 'b', likes: 100, normalized_name: 'b' }));
    const ghA = makeScoredGh(makeGh({ fullName: 'x/a', name: 'a', stars: 1, normalized_name: 'a' }));
    const ghB = makeScoredGh(makeGh({ fullName: 'x/b', name: 'b', stars: 1000, normalized_name: 'b' }));
    const out = buildCrossPollinated([hfA, hfB], [ghA, ghB]);
    expect(out.map((c) => c.normalized_name)).toEqual(['b', 'a']);
  });

  it('combined_traction = hf.traction_score + gh.traction_score, rounded 1dp', () => {
    const hf = makeScoredHf(makeHf({ id: 'x/m', name: 'm', likes: 10, downloads: 999, normalized_name: 'm' }));
    const gh = makeScoredGh(makeGh({ fullName: 'x/m', name: 'm', stars: 99, normalized_name: 'm' }));
    // hf=60.0, gh=60.0
    const out = buildCrossPollinated([hf], [gh]);
    expect(out[0].combined_traction).toBe(120);
  });

  it('excludes items with empty normalized_name', () => {
    const hf = [makeScoredHf(makeHf({ id: 'x/m', name: 'm', normalized_name: '' }))];
    const gh = [makeScoredGh(makeGh({ fullName: 'x/m', name: 'm', normalized_name: '' }))];
    expect(buildCrossPollinated(hf, gh)).toEqual([]);
  });

  it('takes the first when multiple GH entries share a normalized_name', () => {
    const hf = [makeScoredHf(makeHf({ id: 'x/dup', name: 'dup', normalized_name: 'dup' }))];
    const ghFirst = makeScoredGh(makeGh({ fullName: 'a/dup', name: 'dup', stars: 100, normalized_name: 'dup' }));
    const ghSecond = makeScoredGh(makeGh({ fullName: 'b/dup', name: 'dup', stars: 999, normalized_name: 'dup' }));
    const out = buildCrossPollinated(hf, [ghFirst, ghSecond]);
    expect(out.length).toBe(1);
    expect(out[0].github.fullName).toBe('a/dup');
  });
});

// ── buildVelocity: empty / smoke ───────────────────────────────────

describe('buildVelocity: empty snapshot', () => {
  it('empty snapshot returns empty top arrays, zero counts, ok=true', () => {
    const snapshot = makeSnapshot([], []);
    const r = buildVelocity(snapshot, DEFAULT_FILTER);
    expect(r.ok).toBe(true);
    expect(r.hf_top).toEqual([]);
    expect(r.github_top).toEqual([]);
    expect(r.cross_pollinated).toEqual([]);
    expect(r.cohort_size).toEqual({ hf: 0, github: 0, cross_pollinated: 0 });
    expect(r.summary.hf_by_pipeline).toEqual({});
    expect(r.summary.github_by_language).toEqual({});
    expect(r.summary.total_hf_likes).toBe(0);
    expect(r.summary.total_github_stars).toBe(0);
  });
});

// ── buildVelocity: sorting + caps ──────────────────────────────────

describe('buildVelocity: top sorting + cap', () => {
  it('hf_top sorted by traction_score desc, capped at 15', () => {
    const hf: HfEntry[] = [];
    for (let i = 0; i < 20; i++) {
      // give i likes -> score scales with i
      hf.push(makeHf({ id: `org/m${i}`, name: `m${i}`, likes: i, normalized_name: `m${i}` }));
    }
    const r = buildVelocity(makeSnapshot(hf, []), DEFAULT_FILTER);
    expect(r.hf_top.length).toBe(15);
    // top should be m19 (highest likes)
    expect(r.hf_top[0].name).toBe('m19');
    for (let i = 0; i < r.hf_top.length - 1; i++) {
      expect(r.hf_top[i].traction_score).toBeGreaterThanOrEqual(r.hf_top[i + 1].traction_score);
    }
  });

  it('github_top sorted by traction_score desc, capped at 15', () => {
    const gh: GhEntry[] = [];
    for (let i = 0; i < 20; i++) {
      gh.push(makeGh({ fullName: `org/r${i}`, name: `r${i}`, stars: i * 10, normalized_name: `r${i}` }));
    }
    const r = buildVelocity(makeSnapshot([], gh), DEFAULT_FILTER);
    expect(r.github_top.length).toBe(15);
    expect(r.github_top[0].name).toBe('r19');
    for (let i = 0; i < r.github_top.length - 1; i++) {
      expect(r.github_top[i].traction_score).toBeGreaterThanOrEqual(r.github_top[i + 1].traction_score);
    }
  });
});

// ── buildVelocity: on_both flag ────────────────────────────────────

describe('buildVelocity: on_both flag', () => {
  it('sets on_both=true on entries whose normalized_name appears in both feeds', () => {
    const hf = [
      makeHf({ id: 'org/shared', name: 'shared', likes: 5, normalized_name: 'shared' }),
      makeHf({ id: 'org/hfonly', name: 'hfonly', likes: 5, normalized_name: 'hfonly' }),
    ];
    const gh = [
      makeGh({ fullName: 'org/shared', name: 'shared', stars: 5, normalized_name: 'shared' }),
      makeGh({ fullName: 'org/ghonly', name: 'ghonly', stars: 5, normalized_name: 'ghonly' }),
    ];
    const r = buildVelocity(makeSnapshot(hf, gh), DEFAULT_FILTER);
    const sharedHf = r.hf_top.find((e) => e.normalized_name === 'shared');
    const hfOnly = r.hf_top.find((e) => e.normalized_name === 'hfonly');
    const sharedGh = r.github_top.find((e) => e.normalized_name === 'shared');
    const ghOnly = r.github_top.find((e) => e.normalized_name === 'ghonly');
    expect(sharedHf?.on_both).toBe(true);
    expect(hfOnly?.on_both).toBe(false);
    expect(sharedGh?.on_both).toBe(true);
    expect(ghOnly?.on_both).toBe(false);
  });
});

// ── buildVelocity: filters ─────────────────────────────────────────

describe('buildVelocity: pipeline filter', () => {
  it('substring-matches HF pipeline case-insensitively', () => {
    const hf = [
      makeHf({ id: 'org/a', name: 'a', pipeline: 'text-generation', likes: 1, normalized_name: 'a' }),
      makeHf({ id: 'org/b', name: 'b', pipeline: 'image-classification', likes: 1, normalized_name: 'b' }),
    ];
    const r = buildVelocity(makeSnapshot(hf, []), { ...DEFAULT_FILTER, pipeline: 'TEXT' });
    expect(r.hf_top.map((e) => e.name)).toEqual(['a']);
  });
});

describe('buildVelocity: language filter', () => {
  it('substring-matches GitHub language case-insensitively', () => {
    const gh = [
      makeGh({ fullName: 'org/a', name: 'a', language: 'Python', stars: 1, normalized_name: 'a' }),
      makeGh({ fullName: 'org/b', name: 'b', language: 'TypeScript', stars: 1, normalized_name: 'b' }),
    ];
    const r = buildVelocity(makeSnapshot([], gh), { ...DEFAULT_FILTER, language: 'python' });
    expect(r.github_top.map((e) => e.name)).toEqual(['a']);
  });
});

describe('buildVelocity: min_traction filter', () => {
  it('filters both hf_top and github_top by traction_score threshold', () => {
    const hf = [
      makeHf({ id: 'org/big', name: 'big', likes: 100, normalized_name: 'big' }), // score 300
      makeHf({ id: 'org/small', name: 'small', likes: 1, normalized_name: 'small' }), // score 3
    ];
    const gh = [
      makeGh({ fullName: 'org/bigg', name: 'bigg', stars: 9999, normalized_name: 'bigg' }), // log10(10000)*30 = 120
      makeGh({ fullName: 'org/smallg', name: 'smallg', stars: 0, normalized_name: 'smallg' }), // 0
    ];
    const r = buildVelocity(makeSnapshot(hf, gh), { ...DEFAULT_FILTER, min_traction: 100 });
    expect(r.hf_top.map((e) => e.name)).toEqual(['big']);
    expect(r.github_top.map((e) => e.name)).toEqual(['bigg']);
  });
});

describe('buildVelocity: cross_only filter', () => {
  it('excludes items where on_both=false', () => {
    const hf = [
      makeHf({ id: 'org/shared', name: 'shared', likes: 1, normalized_name: 'shared' }),
      makeHf({ id: 'org/hfonly', name: 'hfonly', likes: 1, normalized_name: 'hfonly' }),
    ];
    const gh = [
      makeGh({ fullName: 'org/shared', name: 'shared', stars: 1, normalized_name: 'shared' }),
      makeGh({ fullName: 'org/ghonly', name: 'ghonly', stars: 1, normalized_name: 'ghonly' }),
    ];
    const r = buildVelocity(makeSnapshot(hf, gh), { ...DEFAULT_FILTER, cross_only: true });
    expect(r.hf_top.map((e) => e.name)).toEqual(['shared']);
    expect(r.github_top.map((e) => e.name)).toEqual(['shared']);
  });

  it('still populates cross_pollinated even when cross_only=true', () => {
    const hf = [makeHf({ id: 'org/m', name: 'm', likes: 5, normalized_name: 'm' })];
    const gh = [makeGh({ fullName: 'org/m', name: 'm', stars: 5, normalized_name: 'm' })];
    const r = buildVelocity(makeSnapshot(hf, gh), { ...DEFAULT_FILTER, cross_only: true });
    expect(r.cross_pollinated.length).toBe(1);
    expect(r.cross_pollinated[0].normalized_name).toBe('m');
  });
});

// ── buildVelocity: summary ─────────────────────────────────────────

describe('buildVelocity: summary', () => {
  it('hf_by_pipeline counts pipelines among passing HF items', () => {
    const hf = [
      makeHf({ id: 'org/a', name: 'a', pipeline: 'text-generation', normalized_name: 'a' }),
      makeHf({ id: 'org/b', name: 'b', pipeline: 'text-generation', normalized_name: 'b' }),
      makeHf({ id: 'org/c', name: 'c', pipeline: 'image-classification', normalized_name: 'c' }),
    ];
    const r = buildVelocity(makeSnapshot(hf, []), DEFAULT_FILTER);
    expect(r.summary.hf_by_pipeline).toEqual({
      'text-generation': 2,
      'image-classification': 1,
    });
  });

  it('github_by_language counts languages, missing -> "Unknown"', () => {
    const gh = [
      makeGh({ fullName: 'org/a', name: 'a', language: 'Python', normalized_name: 'a' }),
      makeGh({ fullName: 'org/b', name: 'b', language: 'Python', normalized_name: 'b' }),
      makeGh({ fullName: 'org/c', name: 'c', language: '', normalized_name: 'c' }),
    ];
    const r = buildVelocity(makeSnapshot([], gh), DEFAULT_FILTER);
    expect(r.summary.github_by_language).toEqual({
      Python: 2,
      Unknown: 1,
    });
  });

  it('total_hf_likes sums likes across passing HF', () => {
    const hf = [
      makeHf({ id: 'org/a', name: 'a', likes: 10, normalized_name: 'a' }),
      makeHf({ id: 'org/b', name: 'b', likes: 25, normalized_name: 'b' }),
      makeHf({ id: 'org/c', name: 'c', likes: 5, normalized_name: 'c' }),
    ];
    const r = buildVelocity(makeSnapshot(hf, []), DEFAULT_FILTER);
    expect(r.summary.total_hf_likes).toBe(40);
  });

  it('total_github_stars sums stars across passing GH', () => {
    const gh = [
      makeGh({ fullName: 'org/a', name: 'a', stars: 100, normalized_name: 'a' }),
      makeGh({ fullName: 'org/b', name: 'b', stars: 250, normalized_name: 'b' }),
      makeGh({ fullName: 'org/c', name: 'c', stars: 50, normalized_name: 'c' }),
    ];
    const r = buildVelocity(makeSnapshot([], gh), DEFAULT_FILTER);
    expect(r.summary.total_github_stars).toBe(400);
  });
});

// ── buildVelocity: response shape ──────────────────────────────────

describe('buildVelocity: response shape', () => {
  it('echoes filter back', () => {
    const snapshot = makeSnapshot([], []);
    const filter = { pipeline: 'text-generation', language: 'Python', min_traction: 5, cross_only: true };
    const r = buildVelocity(snapshot, filter);
    expect(r.filter).toEqual(filter);
  });

  it('preserves snapshot_captured_at from input snapshot', () => {
    const snapshot = makeSnapshot([], [], '2026-01-15T12:34:56.000Z');
    const r = buildVelocity(snapshot, DEFAULT_FILTER);
    expect(r.snapshot_captured_at).toBe('2026-01-15T12:34:56.000Z');
  });

  it('attribution.source mentions TerminalFeed', () => {
    const snapshot = makeSnapshot([], []);
    const r = buildVelocity(snapshot, DEFAULT_FILTER);
    expect(r.attribution.source).toContain('TerminalFeed');
  });

  it('attribution.notes describes the score formula', () => {
    const snapshot = makeSnapshot([], []);
    const r = buildVelocity(snapshot, DEFAULT_FILTER);
    expect(r.attribution.notes.toLowerCase()).toContain('likes');
    expect(r.attribution.notes.toLowerCase()).toContain('log10');
    expect(r.attribution.notes.toLowerCase()).toContain('stars');
  });

  it('source field set to terminalfeed.io federation cross-call', () => {
    const snapshot = makeSnapshot([], []);
    const r = buildVelocity(snapshot, DEFAULT_FILTER);
    expect(r.source).toBe('terminalfeed.io federation cross-call');
  });
});
