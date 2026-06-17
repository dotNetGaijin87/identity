import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { TenantSchema, type Tenant, type UpdateTenantInput } from '../types';
import { tenantsKey } from './get-tenants';
import { tenantKey } from './get-tenant';

export const updateTenant = async (id: string, input: UpdateTenantInput): Promise<Tenant> => {
  const data = await apiClient.put<unknown>(`/tenants/${id}`, input);
  return TenantSchema.parse(data);
};

export function useUpdateTenant(id: string, opts?: { onSuccess?: (tenant: Tenant) => void }) {
  return useMutation({
    mutationFn: (input: UpdateTenantInput) => updateTenant(id, input),
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: tenantsKey });
      queryClient.invalidateQueries({ queryKey: tenantKey(id) });
      opts?.onSuccess?.(tenant);
    },
  });
}
