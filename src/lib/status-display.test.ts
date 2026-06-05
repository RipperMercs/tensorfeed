import { describe, it, expect } from 'vitest';
import { statusHeading, statusMessage, statusBg, pickService } from './status-display';

describe('statusHeading', () => {
  it('names the provider and the state', () => {
    expect(statusHeading('Claude', 'operational')).toBe('Claude is Operational');
    expect(statusHeading('Claude', 'degraded')).toBe('Claude is Degraded');
    expect(statusHeading('Claude', 'down')).toBe('Claude is Down');
  });
  it('falls back to Status Unknown for an unrecognized state', () => {
    expect(statusHeading('ChatGPT', 'unknown')).toBe('ChatGPT Status Unknown');
    expect(statusHeading('ChatGPT', 'banana')).toBe('ChatGPT Status Unknown');
  });
});

describe('statusMessage', () => {
  it('reads as operational when up', () => {
    expect(statusMessage('Gemini', 'operational')).toContain('up and running');
  });
  it('reads as down when down and names the provider', () => {
    const msg = statusMessage('Gemini', 'down');
    expect(msg).toContain('Gemini');
    expect(msg.toLowerCase()).toContain('down');
  });
  it('hedges when unknown', () => {
    expect(statusMessage('Gemini', 'unknown')).toContain('Unable to determine');
  });
});

describe('statusBg', () => {
  it('maps each state to its accent gradient', () => {
    expect(statusBg('operational')).toContain('accent-green');
    expect(statusBg('degraded')).toContain('accent-amber');
    expect(statusBg('down')).toContain('accent-red');
  });
  it('falls back to a neutral gradient for unknown', () => {
    expect(statusBg('unknown')).toContain('bg-tertiary');
  });
});

describe('pickService', () => {
  const payload = {
    ok: true,
    services: [
      { name: 'Claude API', provider: 'Anthropic', status: 'operational', components: [] },
      { name: 'OpenAI API', provider: 'OpenAI', status: 'down', components: [] },
    ],
  };

  it('returns the service matching the name', () => {
    expect(pickService(payload, 'OpenAI API')?.status).toBe('down');
  });
  it('returns null when the named service is absent', () => {
    expect(pickService(payload, 'Mistral API')).toBeNull();
  });
  it('returns null when the payload is not ok', () => {
    expect(pickService({ ok: false, services: payload.services }, 'Claude API')).toBeNull();
  });
  it('returns null when services is missing or not an array', () => {
    expect(pickService({ ok: true }, 'Claude API')).toBeNull();
    expect(pickService({ ok: true, services: 'nope' }, 'Claude API')).toBeNull();
  });
  it('returns null for a null or non-object payload', () => {
    expect(pickService(null, 'Claude API')).toBeNull();
    expect(pickService('nope', 'Claude API')).toBeNull();
  });
});
