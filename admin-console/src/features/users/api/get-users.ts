import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { UserSchema, type User } from '../types';

export const usersKey = (tenantId: string) => ['tenants', tenantId, 'users'] as const;

export const getUsers = async (tenantId: string): Promise<User[]> => {
  const data = await apiClient.get<unknown>(`/tenants/${tenantId}/users`);
  return z.array(UserSchema).parse(data);
};

export function useUsers(tenantId: string) {
  return useQuery({
    queryKey: usersKey(tenantId),
    queryFn: () => getUsers(tenantId),
    enabled: Boolean(tenantId),
  });
}
