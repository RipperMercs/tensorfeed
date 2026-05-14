import { describe, expect, it } from 'vitest';
import {
  compareSeverity,
  mechanicalSeverity,
  severityRank,
  type MechanicalSeverity,
} from './fda-severity';

describe('mechanicalSeverity', () => {
  describe('classification only', () => {
    it('maps Class I to critical', () => {
      expect(mechanicalSeverity({ classification: 'Class I' })).toBe('critical');
      expect(mechanicalSeverity({ classification: 'class i' })).toBe('critical');
      expect(mechanicalSeverity({ classification: 'Class 1' })).toBe('critical');
      expect(mechanicalSeverity({ classification: 'I' })).toBe('critical');
      expect(mechanicalSeverity({ classification: '1' })).toBe('critical');
    });

    it('maps Class II to high', () => {
      expect(mechanicalSeverity({ classification: 'Class II' })).toBe('high');
      expect(mechanicalSeverity({ classification: 'class ii' })).toBe('high');
      expect(mechanicalSeverity({ classification: 'Class 2' })).toBe('high');
      expect(mechanicalSeverity({ classification: 'II' })).toBe('high');
    });

    it('maps Class III to medium', () => {
      expect(mechanicalSeverity({ classification: 'Class III' })).toBe('medium');
      expect(mechanicalSeverity({ classification: 'Class 3' })).toBe('medium');
      expect(mechanicalSeverity({ classification: 'III' })).toBe('medium');
    });

    it('returns low for empty/unknown classification', () => {
      expect(mechanicalSeverity({ classification: null })).toBe('low');
      expect(mechanicalSeverity({ classification: undefined })).toBe('low');
      expect(mechanicalSeverity({ classification: '' })).toBe('low');
      expect(mechanicalSeverity({ classification: 'Class IV' })).toBe('low');
      expect(mechanicalSeverity({ classification: 'unknown' })).toBe('low');
    });
  });

  describe('event_type only', () => {
    it('maps Death to critical', () => {
      expect(mechanicalSeverity({ event_type: 'Death' })).toBe('critical');
      expect(mechanicalSeverity({ event_type: 'DEATH' })).toBe('critical');
    });

    it('maps Injury to high', () => {
      expect(mechanicalSeverity({ event_type: 'Injury' })).toBe('high');
      expect(mechanicalSeverity({ event_type: 'Serious Injury' })).toBe('high');
    });

    it('maps Malfunction to medium', () => {
      expect(mechanicalSeverity({ event_type: 'Malfunction' })).toBe('medium');
    });

    it('maps Other to low', () => {
      expect(mechanicalSeverity({ event_type: 'Other' })).toBe('low');
    });

    it('returns low for empty/unknown event_type', () => {
      expect(mechanicalSeverity({ event_type: null })).toBe('low');
      expect(mechanicalSeverity({ event_type: '' })).toBe('low');
      expect(mechanicalSeverity({ event_type: 'something weird' })).toBe('low');
    });
  });

  describe('max wins when both present', () => {
    it('Class II + Death = critical', () => {
      expect(mechanicalSeverity({ classification: 'Class II', event_type: 'Death' })).toBe(
        'critical',
      );
    });

    it('Class I + Malfunction = critical', () => {
      expect(mechanicalSeverity({ classification: 'Class I', event_type: 'Malfunction' })).toBe(
        'critical',
      );
    });

    it('Class III + Injury = high', () => {
      expect(mechanicalSeverity({ classification: 'Class III', event_type: 'Injury' })).toBe(
        'high',
      );
    });

    it('Class III + Other = medium', () => {
      expect(mechanicalSeverity({ classification: 'Class III', event_type: 'Other' })).toBe(
        'medium',
      );
    });

    it('unknown + Injury = high', () => {
      expect(mechanicalSeverity({ classification: null, event_type: 'Injury' })).toBe('high');
    });

    it('both empty = low', () => {
      expect(mechanicalSeverity({})).toBe('low');
    });
  });

  it('is idempotent in the sense that severity rank is fixed', () => {
    // f(input) is deterministic; calling twice with same input gives same output.
    const sample = { classification: 'Class II', event_type: 'Injury' };
    expect(mechanicalSeverity(sample)).toBe(mechanicalSeverity(sample));
  });
});

describe('compareSeverity', () => {
  it('orders low < medium < high < critical', () => {
    const order: MechanicalSeverity[] = ['low', 'medium', 'high', 'critical'];
    const shuffled: MechanicalSeverity[] = ['critical', 'low', 'high', 'medium'];
    expect([...shuffled].sort(compareSeverity)).toEqual(order);
  });

  it('returns 0 for equal severities', () => {
    expect(compareSeverity('high', 'high')).toBe(0);
  });

  it('returns negative when a < b', () => {
    expect(compareSeverity('low', 'critical')).toBeLessThan(0);
  });

  it('returns positive when a > b', () => {
    expect(compareSeverity('critical', 'low')).toBeGreaterThan(0);
  });
});

describe('severityRank', () => {
  it('returns monotonic ranks', () => {
    expect(severityRank('low')).toBe(0);
    expect(severityRank('medium')).toBe(1);
    expect(severityRank('high')).toBe(2);
    expect(severityRank('critical')).toBe(3);
  });
});
