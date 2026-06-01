import { describe, expect, it } from 'vitest';
import { chooseBar, classifySeverity, isSafeHref } from './alert-bar-logic';

const ok = [{ name: 'OpenAI', status: 'operational' }];
const down = [{ name: 'OpenAI', status: 'down' }];
const alert = { id: 'brk_1', headline: 'h', href: '/x', published_at: '', expires_at: '' };

describe('chooseBar priority incident > breaking > status', () => {
  it('incident wins even when a breaking alert is active', () => {
    expect(chooseBar({ services: down, breaking: alert, dismissed: false })).toBe('incident');
  });
  it('breaking shows when no incident and not dismissed', () => {
    expect(chooseBar({ services: ok, breaking: alert, dismissed: false })).toBe('breaking');
  });
  it('dismissed breaking falls back to status', () => {
    expect(chooseBar({ services: ok, breaking: alert, dismissed: true })).toBe('status');
  });
  it('no breaking shows status', () => {
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
