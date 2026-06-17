import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { AdminUserSchema, type AdminUser } from '../types';

export const authUserKey = ['auth-user'] as const;

export const getAuthUser = async (): Promise<AdminUser> => {
  // notifyOnError: false — being logged out is normal, not a toast-worthy failure.
  const data = await apiClient.get<unknown>('/auth/me', { notifyOnError: false });
  return AdminUserSchema.parse(data);
};

export function useUser() {
  return useQuery({
    queryKey: authUserKey,
    queryFn: getAuthUser,
    retry: false,
    staleTime: 30_000,
  });
}
