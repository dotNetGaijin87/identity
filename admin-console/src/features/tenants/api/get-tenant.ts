import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { TenantSchema, type Tenant } from '../types';

export const tenantKey = (id: string) => ['tenants', id] as const;

export const getTenant = async (id: string): Promise<Tenant> => {
  const data = await apiClient.get<unknown>(`/tenants/${id}`);
  return TenantSchema.parse(data);
};

export function useTenant(id: string) {
  return useQuery({
    queryKey: tenantKey(id),
    queryFn: () => getTenant(id),
    enabled: Boolean(id),
  });
}
