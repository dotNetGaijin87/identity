import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  username: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  enabled: z.boolean(),
  createdAt: z.number(),
  roleIds: z.array(z.string()),
});
export type User = z.infer<typeof UserSchema>;

export const userFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.union([z.literal(''), z.string().email('Must be a valid email')]).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  enabled: z.boolean(),
});
export type UserFormValues = z.infer<typeof userFormSchema>;
export type UserInput = UserFormValues;
export type AssignRolesInput = { roleIds: string[] };
