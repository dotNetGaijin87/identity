import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { RoleSchema, type Role, type RoleInput } from '../types';
import { rolesKey } from './get-roles';
import { roleKey } from './get-role';

export const updateRole = async (tenantId: string, id: string, input: RoleInput): Promise<Role> => {
  const data = await apiClient.put<unknown>(`/tenants/${tenantId}/roles/${id}`, input);
  return RoleSchema.parse(data);
};

export function useUpdateRole(
  tenantId: string,
  id: string,
  opts?: { onSuccess?: (role: Role) => void },
) {
  return useMutation({
    mutationFn: (input: RoleInput) => updateRole(tenantId, id, input),
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: rolesKey(tenantId) });
      queryClient.invalidateQueries({ queryKey: roleKey(tenantId, id) });
      opts?.onSuccess?.(role);
    },
  });
}
