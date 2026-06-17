import { z } from 'zod';

/** The authenticated admin (validated at the API boundary). */
export const AdminUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;

/** Login form schema — one source of truth for validation and the input type. */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;
