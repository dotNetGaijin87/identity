import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { RoleSchema, type Role } from '../types';

export const rolesKey = (tenantId: string) => ['tenants', tenantId, 'roles'] as const;

export const getRoles = async (tenantId: string): Promise<Role[]> => {
  const data = await apiClient.get<unknown>(`/tenants/${tenantId}/roles`);
  return z.array(RoleSchema).parse(data);
};

export function useRoles(tenantId: string) {
  return useQuery({
    queryKey: rolesKey(tenantId),
    queryFn: () => getRoles(tenantId),
    enabled: Boolean(tenantId),
  });
}
