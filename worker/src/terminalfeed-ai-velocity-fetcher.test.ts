import { describe, it, expect } from 'vitest';
import {
  normalizeName,
  isAiHfEntry,
  matchesAiGithubMarkers,
  isAiGithubEntry,
  normalizeHfEntry,
  normalizeGhEntry,
} from './terminalfeed-ai-velocity-fetcher';

// ── normalizeName ──────────────────────────────────────────────────

describe('normalizeName', () => {
  it('returns empty string on empty input', () => {
    expect(normalizeName('')).toBe('');
  });

  it('strips namespace prefix before last slash', () => {
    expect(normalizeName('Meta-Llama/Llama-3-8B')).toBe('llama-3-8b');
  });

  it('keeps dots in name after stripping namespace', () => {
    expect(normalizeName('ggerganov/llama.cpp')).toBe('llama.cpp');
  });

  it('converts underscores and spaces to hyphens', () => {
    expect(normalizeName('Some_Repo Name')).toBe('some-repo-name');
  });

  it('trims leading and trailing hyphens', () => {
    expect(normalizeName('--leading-trail--')).toBe('leading-trail');
  });

  it('collapses repeated hyphens to a single hyphen', () => {
    expect(normalizeName('foo---bar')).toBe('foo-bar');
  });

  it('lowercases mixed-case input', () => {
    expect(normalizeName('GPT-Neo')).toBe('gpt-neo');
  });

  it('strips trailing .git suffix', () => {
    expect(normalizeName('user/repo.git')).toBe('repo');
  });

  it('handles plain names without namespace', () => {
    expect(normalizeName('llama-3-8b')).toBe('llama-3-8b');
  });

  it('handles multi-slash paths by taking only the last segment', () => {
    expect(normalizeName('a/b/c-name')).toBe('c-name');
  });
});

// ── isAiHfEntry ────────────────────────────────────────────────────

describe('isAiHfEntry', () => {
  it('returns true for known AI pipeline text-generation', () => {
    expect(isAiHfEntry({ pipeline: 'text-generation' })).toBe(true);
  });

  it('returns true for image-text-to-text pipeline', () => {
    expect(isAiHfEntry({ pipeline: 'image-text-to-text' })).toBe(true);
  });

  it('returns false when pipeline is missing', () => {
    expect(isAiHfEntry({})).toBe(false);
  });

  it('returns false for unknown pipeline tabular-classification', () => {
    expect(isAiHfEntry({ pipeline: 'tabular-classification' })).toBe(false);
  });

  it('matches pipelines case-insensitively', () => {
    expect(isAiHfEntry({ pipeline: 'TEXT-GENERATION' })).toBe(true);
  });

  it('returns false for whitespace-only pipeline', () => {
    expect(isAiHfEntry({ pipeline: '   ' })).toBe(false);
  });

  it('trims surrounding whitespace before matching', () => {
    expect(isAiHfEntry({ pipeline: '  text-generation  ' })).toBe(true);
  });
});

// ── matchesAiGithubMarkers ─────────────────────────────────────────

describe('matchesAiGithubMarkers', () => {
  it('returns ["llm"] for LLM-powered tool', () => {
    expect(matchesAiGithubMarkers('LLM-powered tool')).toEqual(['llm']);
  });

  it('returns ["transformer"] for transformer architecture', () => {
    expect(matchesAiGithubMarkers('transformer architecture')).toEqual(['transformer']);
  });

  it('returns empty array for non-AI text', () => {
    expect(matchesAiGithubMarkers('just a recipe app')).toEqual([]);
  });

  it('returns multiple markers when multiple are present', () => {
    const out = matchesAiGithubMarkers('an LLM agentic transformer toolkit');
    expect(out).toContain('llm');
    expect(out).toContain('agentic');
    expect(out).toContain('transformer');
    expect(out.length).toBeGreaterThanOrEqual(3);
  });

  it('is case-insensitive', () => {
    expect(matchesAiGithubMarkers('LARGE LANGUAGE MODEL benchmark')).toContain('large language model');
  });
});

// ── isAiGithubEntry ────────────────────────────────────────────────

describe('isAiGithubEntry', () => {
  it('returns ai:true with markers when fullName contains marker', () => {
    const r = isAiGithubEntry({ fullName: 'org/llm-toolkit', description: 'a toolkit' });
    expect(r.ai).toBe(true);
    expect(r.markers).toContain('llm');
  });

  it('returns ai:true with markers when description contains marker', () => {
    const r = isAiGithubEntry({ fullName: 'org/something', description: 'a transformer model' });
    expect(r.ai).toBe(true);
    expect(r.markers).toContain('transformer');
  });

  it('returns ai:false and empty markers when neither contains a marker', () => {
    const r = isAiGithubEntry({ fullName: 'org/recipe-app', description: 'cook food' });
    expect(r.ai).toBe(false);
    expect(r.markers).toEqual([]);
  });

  it('handles missing fullName and description gracefully', () => {
    const r = isAiGithubEntry({});
    expect(r.ai).toBe(false);
    expect(r.markers).toEqual([]);
  });

  it('searches both fullName and description for markers', () => {
    const r = isAiGithubEntry({ fullName: 'org/llm-toolkit', description: 'a diffusion library' });
    expect(r.ai).toBe(true);
    expect(r.markers).toContain('llm');
    expect(r.markers).toContain('diffusion');
  });
});

// ── normalizeHfEntry ───────────────────────────────────────────────

describe('normalizeHfEntry', () => {
  it('returns null when id is missing', () => {
    expect(normalizeHfEntry({})).toBeNull();
  });

  it('returns null when id is non-string', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(normalizeHfEntry({ id: 123 as unknown as string })).toBeNull();
  });

  it('populates author=null when missing', () => {
    const r = normalizeHfEntry({ id: 'org/model', name: 'model' });
    expect(r).not.toBeNull();
    expect(r!.author).toBeNull();
  });

  it('defaults likes and downloads to 0 when missing', () => {
    const r = normalizeHfEntry({ id: 'org/model', name: 'model' });
    expect(r!.likes).toBe(0);
    expect(r!.downloads).toBe(0);
  });

  it('uses id as fallback url when url missing', () => {
    const r = normalizeHfEntry({ id: 'org/model', name: 'model' });
    expect(r!.url).toBe('https://huggingface.co/org/model');
  });

  it('uses provided url when present', () => {
    const r = normalizeHfEntry({ id: 'org/model', name: 'model', url: 'https://example.com/x' });
    expect(r!.url).toBe('https://example.com/x');
  });

  it('computes normalized_name from name field', () => {
    const r = normalizeHfEntry({ id: 'meta-llama/Llama-3-8B', name: 'Llama-3-8B' });
    expect(r!.normalized_name).toBe('llama-3-8b');
  });

  it('preserves author string when present', () => {
    const r = normalizeHfEntry({ id: 'org/m', name: 'm', author: 'org' });
    expect(r!.author).toBe('org');
  });

  it('defaults pipeline to empty string when missing', () => {
    const r = normalizeHfEntry({ id: 'org/m', name: 'm' });
    expect(r!.pipeline).toBe('');
  });

  it('defaults updated to null when missing', () => {
    const r = normalizeHfEntry({ id: 'org/m', name: 'm' });
    expect(r!.updated).toBeNull();
  });

  it('falls back to id-derived name when name missing', () => {
    const r = normalizeHfEntry({ id: 'org/derived-name' });
    expect(r!.name).toBe('derived-name');
  });
});

// ── normalizeGhEntry ───────────────────────────────────────────────

describe('normalizeGhEntry', () => {
  it('returns null when fullName missing', () => {
    expect(normalizeGhEntry({}, [])).toBeNull();
  });

  it('returns null when fullName non-string', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(normalizeGhEntry({ fullName: 42 as unknown as string }, [])).toBeNull();
  });

  it('defaults description and language to empty string when missing', () => {
    const r = normalizeGhEntry({ fullName: 'org/repo', name: 'repo' }, []);
    expect(r!.description).toBe('');
    expect(r!.language).toBe('');
  });

  it('defaults stars to 0 when missing', () => {
    const r = normalizeGhEntry({ fullName: 'org/repo', name: 'repo' }, []);
    expect(r!.stars).toBe(0);
  });

  it('computes fallback url from fullName when url missing', () => {
    const r = normalizeGhEntry({ fullName: 'org/repo', name: 'repo' }, []);
    expect(r!.url).toBe('https://github.com/org/repo');
  });

  it('uses provided url when present', () => {
    const r = normalizeGhEntry({ fullName: 'org/repo', name: 'repo', url: 'https://example.com/g' }, []);
    expect(r!.url).toBe('https://example.com/g');
  });

  it('computes normalized_name from name field', () => {
    const r = normalizeGhEntry({ fullName: 'org/Some_Repo', name: 'Some_Repo' }, []);
    expect(r!.normalized_name).toBe('some-repo');
  });

  it('carries matched_markers through onto the entry', () => {
    const r = normalizeGhEntry({ fullName: 'org/repo', name: 'repo' }, ['llm', 'transformer']);
    expect(r!.matched_markers).toEqual(['llm', 'transformer']);
  });

  it('falls back to fullName-derived name when name missing', () => {
    const r = normalizeGhEntry({ fullName: 'org/derived' }, []);
    expect(r!.name).toBe('derived');
  });
});
