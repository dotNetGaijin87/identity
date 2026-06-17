import { describe, expect, test } from 'vitest';
import { TenantSchema, tenantFormSchema } from '../types';

describe('TenantSchema (boundary validation)', () => {
  test('accepts a well-formed tenant', () => {
    const tenant = {
      id: 'tenant_1',
      name: 'acme',
      displayName: 'Acme',
      enabled: true,
      createdAt: 1_700_000_000_000,
    };
    expect(TenantSchema.parse(tenant)).toEqual(tenant);
  });

  test('rejects a tenant missing required fields', () => {
    expect(() => TenantSchema.parse({ id: 'tenant_1' })).toThrow();
  });
});

describe('tenantFormSchema', () => {
  test('rejects an empty name', () => {
    const result = tenantFormSchema.safeParse({ name: '', enabled: true });
    expect(result.success).toBe(false);
  });

  test('rejects names with invalid characters', () => {
    const result = tenantFormSchema.safeParse({ name: 'Has Spaces', enabled: true });
    expect(result.success).toBe(false);
  });

  test('accepts a valid kebab-case name', () => {
    const result = tenantFormSchema.safeParse({ name: 'my-tenant', enabled: true });
    expect(result.success).toBe(true);
  });
});
