import { z } from 'zod';

export const AdminUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;
