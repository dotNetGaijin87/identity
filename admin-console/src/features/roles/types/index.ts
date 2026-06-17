import { z } from 'zod';

export const RoleSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string(),
  createdAt: z.number(),
});
export type Role = z.infer<typeof RoleSchema>;

export const roleFormSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  description: z.string().optional(),
});
export type RoleFormValues = z.infer<typeof roleFormSchema>;
export type RoleInput = { name: string; description?: string };
