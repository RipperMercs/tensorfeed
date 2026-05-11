import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getKillSwitchState,
  setKillSwitch,
  safePut,
  getKillSwitchAuditLog,
  _resetIsolateMemoForTests,
} from './kill-switch';
import { installFakeCache, InstalledCache } from './edge-cache-test-helpers';
import type { Env } from './types';

class MockKV {
  store = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async put(key: string, value: string, _opts?: KVNamespacePutOptions): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

function makeEnv(envOverrides: Partial<Env> = {}): Env {
  return {
    TENSORFEED_CACHE: new MockKV(),
    TENSORFEED_NEWS: new MockKV(),
    TENSORFEED_STATUS: new MockKV(),
    ...envOverrides,
  } as unknown as Env;
}

describe('getKillSwitchState', () => {
  let installedCache: InstalledCache;
  beforeEach(() => {
    installedCache = installFakeCache();
    _resetIsolateMemoForTests();
  });
  afterEach(() => {
    installedCache.uninstall();
    _resetIsolateMemoForTests();
  });

  it('returns inactive when neither env nor KV flag is set', async () => {
    const env = makeEnv();
    const state = await getKillSwitchState(env);
    expect(state.active).toBe(false);
    expect(state.source).toBe('none');
  });

  it('returns active when env secret is set', async () => {
    const env = makeEnv({ KILL_SWITCH_KV_WRITES: 'true' });
    const state = await getKillSwitchState(env);
    expect(state.active).toBe(true);
    expect(state.source).toBe('env');
  });

  it('accepts variations of truthy env values', async () => {
    for (const val of ['true', 'TRUE', '1', 'yes', 'YES']) {
      _resetIsolateMemoForTests();
      installedCache.uninstall();
      installedCache = installFakeCache();
      const env = makeEnv({ KILL_SWITCH_KV_WRITES: val });
      const state = await getKillSwitchState(env);
      expect(state.active, `value=${val}`).toBe(true);
    }
  });

  it('returns active when KV flag is set', async () => {
    const env = makeEnv();
    await env.TENSORFEED_CACHE.put('admin:kill-switch:kv-writes', 'true');
    const state = await getKillSwitchState(env);
    expect(state.active).toBe(true);
    expect(state.source).toBe('kv');
  });

  it('env takes precedence over KV (env=true wins even if KV=false)', async () => {
    const env = makeEnv({ KILL_SWITCH_KV_WRITES: 'true' });
    // No KV flag set; env is the only signal
    const state = await getKillSwitchState(env);
    expect(state.source).toBe('env');
  });
});

describe('setKillSwitch', () => {
  let installedCache: InstalledCache;
  beforeEach(() => {
    installedCache = installFakeCache();
    _resetIsolateMemoForTests();
  });
  afterEach(() => {
    installedCache.uninstall();
    _resetIsolateMemoForTests();
  });

  it('flipping on then off toggles state and writes audit entries', async () => {
    const env = makeEnv();
    const after_on = await setKillSwitch(env, true, 'unit test');
    expect(after_on.active).toBe(true);
    const after_off = await setKillSwitch(env, false, 'unit test cleanup');
    expect(after_off.active).toBe(false);
    const audit = await getKillSwitchAuditLog(env);
    expect(audit).toHaveLength(2);
    expect(audit[0].on).toBe(true);
    expect(audit[0].actor).toBe('unit test');
    expect(audit[1].on).toBe(false);
    expect(audit[1].actor).toBe('unit test cleanup');
  });

  it('cache invalidation makes next getKillSwitchState see fresh value', async () => {
    const env = makeEnv();
    await setKillSwitch(env, true, 'flip');
    expect((await getKillSwitchState(env)).active).toBe(true);
    await setKillSwitch(env, false, 'unflip');
    expect((await getKillSwitchState(env)).active).toBe(false);
  });
});

describe('safePut', () => {
  let installedCache: InstalledCache;
  beforeEach(() => {
    installedCache = installFakeCache();
    _resetIsolateMemoForTests();
  });
  afterEach(() => {
    installedCache.uninstall();
    _resetIsolateMemoForTests();
  });

  it('writes when kill switch is inactive', async () => {
    const env = makeEnv();
    const kv = env.TENSORFEED_CACHE as unknown as MockKV;
    const written = await safePut(env, env.TENSORFEED_CACHE, 'a', 'b');
    expect(written).toBe(true);
    expect(kv.store.get('a')).toBe('b');
  });

  it('no-ops when env kill switch is active', async () => {
    const env = makeEnv({ KILL_SWITCH_KV_WRITES: 'true' });
    const kv = env.TENSORFEED_CACHE as unknown as MockKV;
    const written = await safePut(env, env.TENSORFEED_CACHE, 'a', 'b');
    expect(written).toBe(false);
    expect(kv.store.has('a')).toBe(false);
  });

  it('no-ops when KV kill switch is active', async () => {
    const env = makeEnv();
    await setKillSwitch(env, true, 'test');
    const kv = env.TENSORFEED_CACHE as unknown as MockKV;
    const written = await safePut(env, env.TENSORFEED_CACHE, 'a', 'b');
    expect(written).toBe(false);
    expect(kv.store.has('a')).toBe(false);
  });

  it('after KV switch is flipped off, writes resume', async () => {
    const env = makeEnv();
    await setKillSwitch(env, true, 'test');
    await safePut(env, env.TENSORFEED_CACHE, 'a', 'b');
    await setKillSwitch(env, false, 'test');
    const written = await safePut(env, env.TENSORFEED_CACHE, 'a', 'b');
    expect(written).toBe(true);
  });

  it('writes propagate KV put options (TTL etc)', async () => {
    const env = makeEnv();
    const kv = env.TENSORFEED_CACHE as unknown as MockKV;
    const recv: { key?: string; opts?: KVNamespacePutOptions } = {};
    kv.put = async (key: string, _value: string, opts?: KVNamespacePutOptions) => {
      recv.key = key;
      recv.opts = opts;
    };
    await safePut(env, env.TENSORFEED_CACHE, 'k', 'v', { expirationTtl: 60 });
    expect(recv.key).toBe('k');
    expect(recv.opts?.expirationTtl).toBe(60);
  });
});

describe('audit log', () => {
  let installedCache: InstalledCache;
  beforeEach(() => {
    installedCache = installFakeCache();
    _resetIsolateMemoForTests();
  });
  afterEach(() => {
    installedCache.uninstall();
    _resetIsolateMemoForTests();
  });

  it('caps the audit log at 200 entries', async () => {
    const env = makeEnv();
    for (let i = 0; i < 250; i++) {
      await setKillSwitch(env, i % 2 === 0, `iter-${i}`);
    }
    const audit = await getKillSwitchAuditLog(env);
    expect(audit.length).toBe(200);
    // Newest entries preserved
    expect(audit[audit.length - 1].actor).toBe('iter-249');
  });

  it('returns empty array when no audit log exists', async () => {
    const env = makeEnv();
    expect(await getKillSwitchAuditLog(env)).toEqual([]);
  });
});
