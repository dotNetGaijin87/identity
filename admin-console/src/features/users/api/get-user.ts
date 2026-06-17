import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { UserSchema, type User } from '../types';

export const userKey = (tenantId: string, id: string) =>
  ['tenants', tenantId, 'users', id] as const;

export const getUser = async (tenantId: string, id: string): Promise<User> => {
  const data = await apiClient.get<unknown>(`/tenants/${tenantId}/users/${id}`);
  return UserSchema.parse(data);
};

/** Named `useUserDetail` to avoid confusion with the auth feature's `useUser`. */
export function useUserDetail(tenantId: string, id: string) {
  return useQuery({
    queryKey: userKey(tenantId, id),
    queryFn: () => getUser(tenantId, id),
    enabled: Boolean(tenantId && id),
  });
}
