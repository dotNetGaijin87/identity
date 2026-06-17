import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { UserSchema, type AssignRolesInput, type User } from '../types';
import { usersKey } from './get-users';
import { userKey } from './get-user';

export const assignUserRoles = async (
  tenantId: string,
  id: string,
  input: AssignRolesInput,
): Promise<User> => {
  const data = await apiClient.put<unknown>(`/tenants/${tenantId}/users/${id}/roles`, input);
  return UserSchema.parse(data);
};

export function useAssignUserRoles(
  tenantId: string,
  id: string,
  opts?: { onSuccess?: (user: User) => void },
) {
  return useMutation({
    mutationFn: (input: AssignRolesInput) => assignUserRoles(tenantId, id, input),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: usersKey(tenantId) });
      queryClient.invalidateQueries({ queryKey: userKey(tenantId, id) });
      opts?.onSuccess?.(user);
    },
  });
}
