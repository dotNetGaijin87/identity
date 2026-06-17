import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { RoleSchema, type Role, type RoleInput } from '../types';
import { rolesKey } from './get-roles';

export const createRole = async (tenantId: string, input: RoleInput): Promise<Role> => {
  const data = await apiClient.post<unknown>(`/tenants/${tenantId}/roles`, input);
  return RoleSchema.parse(data);
};

export function useCreateRole(tenantId: string, opts?: { onSuccess?: (role: Role) => void }) {
  return useMutation({
    mutationFn: (input: RoleInput) => createRole(tenantId, input),
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: rolesKey(tenantId) });
      opts?.onSuccess?.(role);
    },
  });
}
