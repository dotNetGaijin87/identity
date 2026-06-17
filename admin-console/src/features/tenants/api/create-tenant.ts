import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { TenantSchema, type CreateTenantInput, type Tenant } from '../types';
import { tenantsKey } from './get-tenants';

export const createTenant = async (input: CreateTenantInput): Promise<Tenant> => {
  const data = await apiClient.post<unknown>('/tenants', input);
  return TenantSchema.parse(data);
};

export function useCreateTenant(opts?: { onSuccess?: (tenant: Tenant) => void }) {
  return useMutation({
    mutationFn: createTenant,
    onSuccess: (tenant) => {
      queryClient.invalidateQueries({ queryKey: tenantsKey });
      opts?.onSuccess?.(tenant);
    },
  });
}
