import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { AdminUserSchema, type AdminUser, type LoginInput } from '../types';
import { authUserKey } from './get-user';

export const login = async (input: LoginInput): Promise<AdminUser> => {
  const data = await apiClient.post<unknown>('/auth/login', input, { notifyOnError: false });
  return AdminUserSchema.parse(data);
};

export function useLogin(opts?: { onSuccess?: (user: AdminUser) => void }) {
  return useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      // Seed the session user into the cache so `useUser` resolves immediately.
      queryClient.setQueryData(authUserKey, user);
      opts?.onSuccess?.(user);
    },
  });
}
