import { describe, it, expect } from '@jest/globals';
import { computeFriction, shouldDecompose, decomposeTask } from './microstep';

describe('micro-stepping friction', () => {
  it('friction formula', () => {
    expect(computeFriction(15, 0)).toBe(1);
    expect(computeFriction(30, 1)).toBe(2.4);
  });

  it('decompose triggers', () => {
    expect(shouldDecompose(121, 0)).toBe(true);
    expect(shouldDecompose(120, 0)).toBe(false);
    expect(shouldDecompose(30, 2)).toBe(true);
    expect(shouldDecompose(30, 1)).toBe(false);
  });

  it('30 min task splits into 3 steps of 10', () => {
    expect(decomposeTask(30).map((s) => s.minutes)).toEqual([10, 10, 10]);
  });

  it('45 min task splits into 3 steps of 15', () => {
    expect(decomposeTask(45).map((s) => s.minutes)).toEqual([15, 15, 15]);
  });

  it('large task: steps stay <= 15 and sum to total', () => {
    const steps = decomposeTask(121);
    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps.every((s) => s.minutes <= 15)).toBe(true);
    expect(steps.reduce((a, s) => a + s.minutes, 0)).toBe(121);
  });
});
