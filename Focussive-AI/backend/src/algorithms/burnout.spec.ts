import { describe, it, expect } from '@jest/globals';
import { computeBurnoutScore, isBurnoutRisk } from './burnout';

describe('burnout score', () => {
  it('single medium 60min task, no consecutive focus -> 60', () => {
    expect(computeBurnoutScore([{ durationMinutes: 60, priority: 'MEDIUM' }], 0)).toBe(60);
  });

  it('consecutive focus > 3h applies 1.3x', () => {
    expect(computeBurnoutScore([{ durationMinutes: 60, priority: 'MEDIUM' }], 4)).toBe(78);
  });

  it('priority weights', () => {
    const urgent = computeBurnoutScore([{ durationMinutes: 100, priority: 'URGENT' }], 0);
    const low = computeBurnoutScore([{ durationMinutes: 100, priority: 'LOW' }], 0);
    expect(urgent).toBe(150);
    expect(low).toBe(80);
  });

  it('alert threshold', () => {
    expect(isBurnoutRisk(75.0)).toBe(false);
    expect(isBurnoutRisk(75.1)).toBe(true);
  });
});
