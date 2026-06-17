import { z } from 'zod';

export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  enabled: z.boolean(),
  createdAt: z.number(),
});
export type Tenant = z.infer<typeof TenantSchema>;

/** Form schema — `name` is the tenant identifier (set once, on create). */
export const tenantFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Tenant name is required')
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens only'),
  displayName: z.string().optional(),
  enabled: z.boolean(),
});
export type TenantFormValues = z.infer<typeof tenantFormSchema>;

export type CreateTenantInput = TenantFormValues;
export type UpdateTenantInput = { displayName?: string; enabled: boolean };
