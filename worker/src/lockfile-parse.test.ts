import { describe, it, expect } from 'vitest';
import { parseLockfile, LOCKFILE_MAX_BYTES, LOCKFILE_MAX_PACKAGES, LOCKFILE_MAX_LINES } from './lockfile-parse';

describe('parseLockfile requirements.txt', () => {
  it('parses pinned, unpinned, comments, extras, and env markers', () => {
    const raw = [
      '# my stack',
      'vllm==0.5.0',
      'transformers==4.40.0  # inline comment',
      'torch>=2.3.0',
      'uvicorn[standard]==0.29.0',
      'requests==2.31.0 ; python_version < "3.12"',
    ].join('\n');
    const r = parseLockfile(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.format).toBe('requirements');
    expect(r.packages).toEqual([
      { name: 'vllm', version: '0.5.0' },
      { name: 'transformers', version: '4.40.0' },
      { name: 'torch', version: null },
      { name: 'uvicorn', version: '0.29.0' },
      { name: 'requests', version: '2.31.0' },
    ]);
  });

  it('drops every non-package directive (SSRF and include guard)', () => {
    const raw = [
      '-r https://evil.example/more.txt',
      '--index-url https://user:secret@registry.internal/simple',
      '-e git+https://github.com/acme/thing.git#egg=thing',
      'git+https://github.com/acme/other.git',
      'https://files.example/pkg-1.0-py3-none-any.whl',
      'safe-pkg==1.0.0',
    ].join('\n');
    const r = parseLockfile(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.packages).toEqual([{ name: 'safe-pkg', version: '1.0.0' }]);
  });

  it('drops package names that fail the allowlist (injection guard)', () => {
    const raw = ['<script>alert(1)</script>==1.0.0', 'legit==2.0.0'].join('\n');
    const r = parseLockfile(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.packages).toEqual([{ name: 'legit', version: '2.0.0' }]);
  });
});

describe('parseLockfile JSON manifests', () => {
  it('parses package.json deps and devDeps, stripping range prefixes', () => {
    const raw = JSON.stringify({
      name: 'app',
      dependencies: { react: '^18.2.0', vllm: '0.5.0' },
      devDependencies: { vitest: '~1.6.1' },
    });
    const r = parseLockfile(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.format).toBe('package-json');
    expect(r.packages).toContainEqual({ name: 'react', version: '18.2.0' });
    expect(r.packages).toContainEqual({ name: 'vitest', version: '1.6.1' });
  });

  it('parses package-lock v2 packages map, deriving scoped names from paths', () => {
    const raw = JSON.stringify({
      lockfileVersion: 3,
      packages: {
        '': { name: 'root' },
        'node_modules/left-pad': { version: '1.3.0' },
        'node_modules/@scope/bar': { version: '2.1.0' },
      },
    });
    const r = parseLockfile(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.format).toBe('package-lock');
    expect(r.packages).toContainEqual({ name: 'left-pad', version: '1.3.0' });
    expect(r.packages).toContainEqual({ name: '@scope/bar', version: '2.1.0' });
  });

  it('parses package-lock v1 dependencies map', () => {
    const raw = JSON.stringify({
      lockfileVersion: 1,
      dependencies: { 'left-pad': { version: '1.3.0' } },
    });
    const r = parseLockfile(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.format).toBe('package-lock');
    expect(r.packages).toEqual([{ name: 'left-pad', version: '1.3.0' }]);
  });

  it('rejects invalid JSON that starts with a brace', () => {
    const r = parseLockfile('{ not valid json ');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('invalid_json');
  });

  it('does not throw on a package-lock v2 with a non-string (numeric) version', () => {
    const raw = JSON.stringify({
      lockfileVersion: 3,
      packages: {
        '': { name: 'root' },
        'node_modules/a': { version: 12345 },
      },
    });
    const r = parseLockfile(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.format).toBe('package-lock');
    expect(r.packages).toContainEqual({ name: 'a', version: null });
  });

  it('does not throw on a package-lock v1 with boolean or object version fields', () => {
    const raw = JSON.stringify({
      lockfileVersion: 1,
      dependencies: {
        a: { version: true },
        b: { version: { x: 1 } },
      },
    });
    const r = parseLockfile(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.format).toBe('package-lock');
    expect(r.packages).toContainEqual({ name: 'a', version: null });
    expect(r.packages).toContainEqual({ name: 'b', version: null });
  });
});

describe('parseLockfile poetry.lock', () => {
  it('parses [[package]] blocks', () => {
    const raw = [
      '[[package]]',
      'name = "vllm"',
      'version = "0.5.0"',
      '',
      '[[package]]',
      'name = "torch"',
      'version = "2.3.0"',
    ].join('\n');
    const r = parseLockfile(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.format).toBe('poetry-lock');
    expect(r.packages).toEqual([
      { name: 'vllm', version: '0.5.0' },
      { name: 'torch', version: '2.3.0' },
    ]);
  });
});

describe('parseLockfile caps and empties', () => {
  it('rejects oversize input', () => {
    const raw = 'a==1.0.0\n'.repeat(40000); // exceeds 256 KB
    expect(raw.length).toBeGreaterThan(LOCKFILE_MAX_BYTES);
    const r = parseLockfile(raw);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('too_large');
  });

  it('truncates at the package cap and flags it', () => {
    const lines: string[] = [];
    for (let i = 0; i < LOCKFILE_MAX_PACKAGES + 50; i++) lines.push(`pkg${i}==1.0.0`);
    const r = parseLockfile(lines.join('\n'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.packages.length).toBe(LOCKFILE_MAX_PACKAGES);
    expect(r.truncated).toBe(true);
  });

  it('rejects empty and null bodies', () => {
    expect(parseLockfile('').ok).toBe(false);
    expect(parseLockfile(null).ok).toBe(false);
    expect(parseLockfile('   \n  ').ok).toBe(false);
  });

  it('rejects input exceeding the line cap', () => {
    // All-comment lines so each is cheap; stays well under LOCKFILE_MAX_BYTES.
    const lines: string[] = [];
    for (let i = 0; i < LOCKFILE_MAX_LINES + 1; i++) lines.push('#');
    const raw = lines.join('\n');
    expect(raw.length).toBeLessThan(LOCKFILE_MAX_BYTES);
    const r = parseLockfile(raw);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('too_many_lines');
  });
});
