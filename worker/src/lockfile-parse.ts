import type { PackageInput } from './premium-stack-safety';

// Hard caps. The lockfile is untrusted pasted text. We parse, never resolve:
// no install, no dependency resolution, no execution, no fetch of any URL the
// file names.
export const LOCKFILE_MAX_BYTES = 262144; // 256 KB paste cap (DoS guard)
export const LOCKFILE_MAX_LINES = 20000; // line cap (DoS guard)
export const LOCKFILE_MAX_PACKAGES = 200; // extracted package cap

// Same allowlists the verdict engine validates against. Anything echoed back is
// constrained to these characters, so no HTML, no script, and no chat role
// tokens can survive. The allowlist is the sanitization for reflected names.
const NAME_RE = /^[A-Za-z0-9._/@-]{1,128}$/;
const VERSION_RE = /^[A-Za-z0-9.+_-]{1,64}$/;

export type LockfileFormat = 'requirements' | 'package-json' | 'package-lock' | 'poetry-lock';

export type ParseLockfileResult =
  | { ok: true; format: LockfileFormat; packages: PackageInput[]; truncated: boolean }
  | { ok: false; error: string; hint: string };

function cleanName(name: string): string | null {
  // Drop pip extras (foo[bar]) and whitespace, then allowlist-check.
  const base = name.split('[')[0].trim();
  return NAME_RE.test(base) ? base : null;
}

function cleanVersion(v: string | null | undefined): string | null {
  if (v == null) return null;
  const stripped = v.replace(/^[\^~>=<! ]+/, '').trim();
  return VERSION_RE.test(stripped) ? stripped : null;
}

function push(out: PackageInput[], name: string | null, version: string | null): boolean {
  // Returns true when the cap is hit (signals truncation to the caller).
  if (!name) return false;
  if (out.length >= LOCKFILE_MAX_PACKAGES) return true;
  out.push({ name, version });
  return false;
}

export function parseLockfile(raw: string | null): ParseLockfileResult {
  if (raw == null) {
    return { ok: false, error: 'empty_body', hint: 'POST the lockfile contents as the request body.' };
  }
  if (raw.length > LOCKFILE_MAX_BYTES) {
    return { ok: false, error: 'too_large', hint: `Lockfile exceeds ${LOCKFILE_MAX_BYTES} bytes. Send a smaller manifest.` };
  }
  const text = raw.trim();
  if (text.length === 0) {
    return { ok: false, error: 'empty_body', hint: 'POST the lockfile contents as the request body.' };
  }
  // Detect by content shape, never by filename (a paste may have no filename).
  if (text[0] === '{') return parseJson(text);
  if (/^\[\[package\]\]/m.test(text)) return parsePoetry(text);
  return parseRequirements(text);
}

function parseJson(text: string): ParseLockfileResult {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid_json', hint: 'Body starts with { but is not valid JSON.' };
  }
  if (typeof doc !== 'object' || doc === null) {
    return { ok: false, error: 'invalid_json', hint: 'Expected a JSON object.' };
  }
  const obj = doc as Record<string, unknown>;
  const out: PackageInput[] = [];
  let truncated = false;

  // package-lock.json v2/v3: a packages map keyed by install path.
  if (obj.packages && typeof obj.packages === 'object') {
    for (const [p, meta] of Object.entries(obj.packages as Record<string, unknown>)) {
      if (!p) continue; // "" is the root project
      const name = cleanName(p.replace(/^.*node_modules\//, ''));
      const version =
        meta && typeof meta === 'object'
          ? cleanVersion((meta as Record<string, unknown>).version as string | undefined)
          : null;
      truncated = push(out, name, version) || truncated;
    }
    if (out.length === 0) return { ok: false, error: 'no_packages', hint: 'No packages found in the lockfile.' };
    return { ok: true, format: 'package-lock', packages: out, truncated };
  }

  // package-lock.json v1: a dependencies map keyed by name.
  if (obj.lockfileVersion === 1 && obj.dependencies && typeof obj.dependencies === 'object') {
    for (const [rawName, meta] of Object.entries(obj.dependencies as Record<string, unknown>)) {
      const version =
        meta && typeof meta === 'object'
          ? cleanVersion((meta as Record<string, unknown>).version as string | undefined)
          : null;
      truncated = push(out, cleanName(rawName), version) || truncated;
    }
    if (out.length === 0) return { ok: false, error: 'no_packages', hint: 'No packages found in the lockfile.' };
    return { ok: true, format: 'package-lock', packages: out, truncated };
  }

  // package.json: dependency maps keyed by name, value is a version spec.
  for (const key of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    const m = obj[key];
    if (m && typeof m === 'object') {
      for (const [rawName, spec] of Object.entries(m as Record<string, unknown>)) {
        const version = typeof spec === 'string' ? cleanVersion(spec) : null;
        truncated = push(out, cleanName(rawName), version) || truncated;
      }
    }
  }
  if (out.length === 0) return { ok: false, error: 'no_packages', hint: 'No dependencies found in the JSON manifest.' };
  return { ok: true, format: 'package-json', packages: out, truncated };
}

function parseRequirements(text: string): ParseLockfileResult {
  const lines = text.split(/\r?\n/);
  if (lines.length > LOCKFILE_MAX_LINES) {
    return { ok: false, error: 'too_many_lines', hint: `Lockfile exceeds ${LOCKFILE_MAX_LINES} lines.` };
  }
  const out: PackageInput[] = [];
  let truncated = false;
  for (const line of lines) {
    const noComment = line.split('#')[0].trim();
    if (!noComment) continue;
    // Ignore every non-package directive. We parse, never resolve: no includes,
    // no index URLs, no editable installs, no VCS or URL requirements. This is
    // the SSRF guard: there is no fetch step and these lines are dropped.
    if (noComment.startsWith('-')) continue; // -r, -c, -e, --index-url, --hash
    if (noComment.includes('://')) continue; // any URL
    if (/^[a-z]+\+/.test(noComment)) continue; // git+, hg+, svn+
    const spec = noComment.split(';')[0].trim(); // drop env markers
    const pinned = spec.match(/^([^=<>!~ ]+)\s*={2,3}\s*(\S+)$/);
    if (pinned) {
      truncated = push(out, cleanName(pinned[1]), cleanVersion(pinned[2])) || truncated;
      continue;
    }
    const nameOnly = spec.match(/^([A-Za-z0-9._/@[\]-]+)/);
    if (nameOnly) truncated = push(out, cleanName(nameOnly[1]), null) || truncated;
  }
  if (out.length === 0) {
    return { ok: false, error: 'no_packages', hint: 'No packages found. Expected requirements.txt style name==version lines.' };
  }
  return { ok: true, format: 'requirements', packages: out, truncated };
}

function parsePoetry(text: string): ParseLockfileResult {
  const lines = text.split(/\r?\n/);
  if (lines.length > LOCKFILE_MAX_LINES) {
    return { ok: false, error: 'too_many_lines', hint: `Lockfile exceeds ${LOCKFILE_MAX_LINES} lines.` };
  }
  const out: PackageInput[] = [];
  let truncated = false;
  let curName: string | null = null;
  let curVersion: string | null = null;
  const flush = () => {
    if (curName) truncated = push(out, curName, curVersion) || truncated;
    curName = null;
    curVersion = null;
  };
  for (const line of lines) {
    const t = line.trim();
    if (t === '[[package]]') {
      flush();
      continue;
    }
    const nm = t.match(/^name\s*=\s*"([^"]+)"/);
    if (nm) {
      curName = cleanName(nm[1]);
      continue;
    }
    const vm = t.match(/^version\s*=\s*"([^"]+)"/);
    if (vm) curVersion = cleanVersion(vm[1]);
  }
  flush();
  if (out.length === 0) return { ok: false, error: 'no_packages', hint: 'No [[package]] blocks found in the poetry.lock.' };
  return { ok: true, format: 'poetry-lock', packages: out, truncated };
}
