import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { RoleSchema, type Role } from '../types';

export const roleKey = (tenantId: string, id: string) =>
  ['tenants', tenantId, 'roles', id] as const;

export const getRole = async (tenantId: string, id: string): Promise<Role> => {
  const data = await apiClient.get<unknown>(`/tenants/${tenantId}/roles/${id}`);
  return RoleSchema.parse(data);
};

export function useRole(tenantId: string, id: string) {
  return useQuery({
    queryKey: roleKey(tenantId, id),
    queryFn: () => getRole(tenantId, id),
    enabled: Boolean(tenantId && id),
  });
}
