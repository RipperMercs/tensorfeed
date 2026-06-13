import { describe, expect, it } from 'vitest';
import { widgetBreaking } from './breaking';

const live = {
  id: 'brk_1',
  headline: 'US export order pulls Fable 5 and Mythos 5.',
  href: '/originals/fable-5-mythos-5-export-control-suspension',
};

describe('widgetBreaking', () => {
  it('builds an absolute url for a safe relative href', () => {
    expect(widgetBreaking(live, { demo: false })).toEqual({
      headline: 'US export order pulls Fable 5 and Mythos 5.',
      url: 'https://tensorfeed.ai/originals/fable-5-mythos-5-export-control-suspension',
    });
  });

  it('suppresses the strip in demo mode so sample status never fakes news', () => {
    expect(widgetBreaking(live, { demo: true })).toBeNull();
  });

  it('returns null when there is no active alert', () => {
    expect(widgetBreaking(null, { demo: false })).toBeNull();
  });

  it('returns null when the headline is missing or blank', () => {
    expect(widgetBreaking({ id: 'b', headline: '   ', href: '/x' }, { demo: false })).toBeNull();
    expect(widgetBreaking({ id: 'b', href: '/x' }, { demo: false })).toBeNull();
  });

  it('trims the headline', () => {
    expect(widgetBreaking({ id: 'b', headline: '  hi  ', href: '/x' }, { demo: false })?.headline).toBe('hi');
  });

  it('keeps the headline but drops the link when href is offsite or unsafe', () => {
    expect(widgetBreaking({ id: 'b', headline: 'hi', href: 'https://evil' }, { demo: false })).toEqual({
      headline: 'hi',
      url: null,
    });
    expect(widgetBreaking({ id: 'b', headline: 'hi', href: '//evil' }, { demo: false })?.url).toBeNull();
  });
});
