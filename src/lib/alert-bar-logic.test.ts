import { describe, expect, it } from 'vitest';
import { chooseBar, classifySeverity, isSafeHref } from './alert-bar-logic';

const ok = [{ name: 'OpenAI', status: 'operational' }];
const down = [{ name: 'OpenAI', status: 'down' }];
const degraded = [{ name: 'AWS Bedrock', status: 'degraded' }];
const alert = { id: 'brk_1', headline: 'h', href: '/x', published_at: '', expires_at: '' };

describe('chooseBar priority breaking > incident > status', () => {
  it('breaking wins even when a provider is fully down', () => {
    expect(chooseBar({ services: down, breaking: alert, dismissed: false })).toBe('breaking');
  });
  it('breaking wins over a soft degraded incident', () => {
    expect(chooseBar({ services: degraded, breaking: alert, dismissed: false })).toBe('breaking');
  });
  it('breaking shows when status is all-ok and not dismissed', () => {
    expect(chooseBar({ services: ok, breaking: alert, dismissed: false })).toBe('breaking');
  });
  it('dismissing breaking reveals an active incident (the safety valve)', () => {
    expect(chooseBar({ services: down, breaking: alert, dismissed: true })).toBe('incident');
  });
  it('dismissed breaking with no incident falls back to status', () => {
    expect(chooseBar({ services: ok, breaking: alert, dismissed: true })).toBe('status');
  });
  it('no breaking shows the incident bar when a provider is down', () => {
    expect(chooseBar({ services: down, breaking: null, dismissed: false })).toBe('incident');
  });
  it('no breaking and all-ok shows status', () => {
    expect(chooseBar({ services: ok, breaking: null, dismissed: false })).toBe('status');
  });
});

describe('isSafeHref', () => {
  it('accepts a relative path, rejects offsite/scheme/protocol-relative', () => {
    expect(isSafeHref('/originals/x')).toBe(true);
    expect(isSafeHref('https://evil')).toBe(false);
    expect(isSafeHref('//evil')).toBe(false);
    expect(isSafeHref('javascript:x')).toBe(false);
  });
});

describe('classifySeverity', () => {
  it('down beats degraded beats ok', () => {
    expect(classifySeverity(down)).toBe('down');
    expect(classifySeverity([{ name: 'x', status: 'degraded' }])).toBe('degraded');
    expect(classifySeverity(ok)).toBe('ok');
  });
});
