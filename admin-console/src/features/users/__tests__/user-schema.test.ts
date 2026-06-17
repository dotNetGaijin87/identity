import { describe, expect, test } from 'vitest';
import { UserSchema, userFormSchema } from '../types';

describe('UserSchema', () => {
  test('parses a user with role ids', () => {
    const user = {
      id: 'user_1',
      tenantId: 'tenant_1',
      username: 'jdoe',
      email: 'jdoe@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      enabled: true,
      createdAt: 1,
      roleIds: ['role_1', 'role_2'],
    };
    expect(UserSchema.parse(user).roleIds).toHaveLength(2);
  });
});

describe('userFormSchema', () => {
  test('requires a username', () => {
    expect(userFormSchema.safeParse({ username: '', enabled: true }).success).toBe(false);
  });

  test('allows an empty email but rejects a malformed one', () => {
    expect(userFormSchema.safeParse({ username: 'x', email: '', enabled: true }).success).toBe(
      true,
    );
    expect(userFormSchema.safeParse({ username: 'x', email: 'nope', enabled: true }).success).toBe(
      false,
    );
  });
});
