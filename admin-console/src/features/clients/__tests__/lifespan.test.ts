import { describe, expect, test } from 'vitest';
import { lifespanToSeconds, secondsToLifespan } from '../types';

describe('access-token lifespan conversion', () => {
  test('converts value + unit to seconds', () => {
    expect(lifespanToSeconds(30, 'seconds')).toBe(30);
    expect(lifespanToSeconds(5, 'minutes')).toBe(300);
    expect(lifespanToSeconds(2, 'hours')).toBe(7200);
  });

  test('picks the largest exact unit when decomposing', () => {
    expect(secondsToLifespan(7200)).toEqual({ value: 2, unit: 'hours' });
    expect(secondsToLifespan(300)).toEqual({ value: 5, unit: 'minutes' });
    expect(secondsToLifespan(90)).toEqual({ value: 90, unit: 'seconds' });
  });

  test('falls back to a sane default for non-positive input', () => {
    expect(secondsToLifespan(0)).toEqual({ value: 300, unit: 'seconds' });
  });

  test('round-trips', () => {
    const { value, unit } = secondsToLifespan(600);
    expect(lifespanToSeconds(value, unit)).toBe(600);
  });
});
