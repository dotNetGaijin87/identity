import { expect, test } from 'vitest';
import { cn } from '../cn';

test('cn joins truthy class names and drops falsy ones', () => {
  expect(cn('a', false, 'b', undefined, null, 'c')).toBe('a b c');
  expect(cn(false, undefined)).toBe('');
});
