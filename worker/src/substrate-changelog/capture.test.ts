import { describe, it, expect } from 'vitest';
import { diffSnapshots, pickX402SpecTag } from './capture';
import type { ModelSnapshot, DeprecationSnapshot, SpecSnapshot, FrameworkSnapshot } from './types';

const D = '2026-06-04';
const specs = (over: Partial<SpecSnapshot> = {}): SpecSnapshot => ({ mcp: 'm1', x402: 'v1', a2a: 'v1.0.0', sources: { mcp: null, x402: null, a2a: null }, ...over });
const m = (entries: ModelSnapshot): ModelSnapshot => entries;
const fw = (entries: FrameworkSnapshot): FrameworkSnapshot => entries;

describe('diffSnapshots', () => {
  it('first run (null priors) seeds silently, no events', () => {
    const ev = diffSnapshots(null, m({ 'oa/gpt': { provider: 'OpenAI', name: 'GPT', input: 1, output: 2 } }), null, {}, null, specs(), null, {}, D);
    expect(ev).toEqual([]);
  });
  it('model_added / removed / repriced', () => {
    const prev = m({ 'a/x': { provider: 'A', name: 'X', input: 3, output: 15 }, 'a/y': { provider: 'A', name: 'Y', input: 1, output: 1 } });
    const curr = m({ 'a/x': { provider: 'A', name: 'X', input: 2.5, output: 12 }, 'a/z': { provider: 'A', name: 'Z', input: 5, output: 5 } });
    const ev = diffSnapshots(prev, curr, {}, {}, specs(), specs(), null, {}, D);
    const types = ev.map((e) => `${e.type}:${e.subject}`).sort();
    expect(types).toContain('model_added:a/z');
    expect(types).toContain('model_removed:a/y');
    expect(types).toContain('model_repriced:a/x');
    const reprice = ev.find((e) => e.type === 'model_repriced');
    expect(reprice?.detail).toContain('3');
    expect(reprice?.detail).toContain('2.5');
  });
  it('model_deprecated on new id or status change', () => {
    const ev = diffSnapshots(m({}), m({}), { d1: 'announced' }, { d1: 'deprecated', d2: 'announced' }, specs(), specs(), null, {}, D);
    const subs = ev.filter((e) => e.type === 'model_deprecated').map((e) => e.subject).sort();
    expect(subs).toEqual(['d1', 'd2']);
  });
  it('spec_version when a repo version changes', () => {
    const ev = diffSnapshots(m({}), m({}), {}, {}, specs({ mcp: 'm1' }), specs({ mcp: 'm2' }), null, {}, D);
    const sv = ev.filter((e) => e.type === 'spec_version');
    expect(sv).toHaveLength(1);
    expect(sv[0].subject).toBe('mcp');
    expect(sv[0].version).toBe('m2');
  });
  it('stable id: the same change yields the same id (dedup safe)', () => {
    const a = diffSnapshots(m({ 'a/x': { provider: 'A', name: 'X', input: 1, output: 1 } }), m({}), {}, {}, specs(), specs(), null, {}, D);
    const b = diffSnapshots(m({ 'a/x': { provider: 'A', name: 'X', input: 1, output: 1 } }), m({}), {}, {}, specs(), specs(), null, {}, '2026-06-05');
    expect(a[0].id).toBe(b[0].id);
  });
  it('no em dashes or double hyphens in event strings', () => {
    const ev = diffSnapshots(m({ 'a/x': { provider: 'A', name: 'X', input: 3, output: 15 } }), m({ 'a/x': { provider: 'A', name: 'X', input: 2, output: 10 } }), {}, {}, specs(), specs(), null, {}, D);
    const json = JSON.stringify(ev);
    expect(json).not.toContain('—');
    expect(json).not.toContain('–');
    expect(json.includes('--')).toBe(false);
  });
  it('float equality is not a reprice (2.5 equals 2.50, 5 equals 5.0)', () => {
    const ev = diffSnapshots(
      m({ 'a/x': { provider: 'A', name: 'X', input: 2.5, output: 5 } }),
      m({ 'a/x': { provider: 'A', name: 'X', input: 2.50, output: 5.0 } }),
      {}, {}, specs(), specs(), null, {}, D,
    );
    expect(ev).toEqual([]);
  });
  it('output-only change fires exactly one model_repriced', () => {
    const ev = diffSnapshots(
      m({ 'a/x': { provider: 'A', name: 'X', input: 3, output: 15 } }),
      m({ 'a/x': { provider: 'A', name: 'X', input: 3, output: 12 } }),
      {}, {}, specs(), specs(), null, {}, D,
    );
    const repriced = ev.filter((e) => e.type === 'model_repriced');
    expect(repriced).toHaveLength(1);
    expect(repriced[0].subject).toBe('a/x');
  });
  it('an identical model entry fires no model_repriced', () => {
    const ev = diffSnapshots(
      m({ 'a/x': { provider: 'A', name: 'X', input: 3, output: 15 } }),
      m({ 'a/x': { provider: 'A', name: 'X', input: 3, output: 15 } }),
      {}, {}, specs(), specs(), null, {}, D,
    );
    expect(ev.filter((e) => e.type === 'model_repriced')).toHaveLength(0);
  });
  it('a spec value going to null keeps the prior, fires no spec_version', () => {
    const ev = diffSnapshots(m({}), m({}), {}, {}, specs({ mcp: 'm1' }), specs({ mcp: null }), null, {}, D);
    expect(ev.filter((e) => e.type === 'spec_version')).toHaveLength(0);
  });
  it('framework_release when a tracked repo ships a new tag', () => {
    const ev = diffSnapshots(m({}), m({}), {}, {}, specs(), specs(), fw({ langchain: 'v1' }), fw({ langchain: 'v2' }), D);
    const fr = ev.filter((e) => e.type === 'framework_release');
    expect(fr).toHaveLength(1);
    expect(fr[0].subject).toBe('langchain');
    expect(fr[0].version).toBe('v2');
    expect(fr[0].detail).toBe('langchain released v2');
    expect(fr[0].id).toBe('framework_release:langchain:v2');
  });
  it('framework_release first run (null prev) seeds silently, no events', () => {
    const ev = diffSnapshots(m({}), m({}), {}, {}, specs(), specs(), null, fw({ langchain: 'v1', agno: 'v2' }), D);
    expect(ev.filter((e) => e.type === 'framework_release')).toHaveLength(0);
  });
  it('framework_release emits for a brand new slug once a baseline exists', () => {
    const ev = diffSnapshots(m({}), m({}), {}, {}, specs(), specs(), fw({ langchain: 'v1' }), fw({ langchain: 'v1', agno: 'v3' }), D);
    const fr = ev.filter((e) => e.type === 'framework_release');
    expect(fr).toHaveLength(1);
    expect(fr[0].subject).toBe('agno');
    expect(fr[0].version).toBe('v3');
  });
  it('framework_release fires nothing when the tag is unchanged', () => {
    const ev = diffSnapshots(m({}), m({}), {}, {}, specs(), specs(), fw({ langchain: 'v2' }), fw({ langchain: 'v2' }), D);
    expect(ev.filter((e) => e.type === 'framework_release')).toHaveLength(0);
  });
  it('framework_release id is timestamp-free (same change yields same id)', () => {
    const a = diffSnapshots(m({}), m({}), {}, {}, specs(), specs(), fw({ mastra: 'v0.1' }), fw({ mastra: 'v0.2' }), D);
    const b = diffSnapshots(m({}), m({}), {}, {}, specs(), specs(), fw({ mastra: 'v0.1' }), fw({ mastra: 'v0.2' }), '2026-06-05');
    const idA = a.find((e) => e.type === 'framework_release')?.id;
    const idB = b.find((e) => e.type === 'framework_release')?.id;
    expect(idA).toBe('framework_release:mastra:v0.2');
    expect(idA).toBe(idB);
  });
  it('no em dashes or double hyphens in framework_release event strings', () => {
    const ev = diffSnapshots(m({}), m({}), {}, {}, specs(), specs(), fw({ langchain: 'v1' }), fw({ langchain: 'v2' }), D);
    const json = JSON.stringify(ev.filter((e) => e.type === 'framework_release'));
    expect(json).not.toContain('—');
    expect(json).not.toContain('–');
    expect(json.includes('--')).toBe(false);
  });
});

describe('pickX402SpecTag', () => {
  it('keeps bare vN spec tags, drops language-SDK tags', () => {
    expect(pickX402SpecTag([{ name: 'npm-x402@v1.1.0' }, { name: 'v2' }, { name: 'pypi-x402@v2.7.0' }, { name: 'v1' }])).toBe('v2');
  });
  it('returns null when no spec tag present', () => {
    expect(pickX402SpecTag([{ name: 'npm-x402@v1.1.0' }])).toBeNull();
  });
});
