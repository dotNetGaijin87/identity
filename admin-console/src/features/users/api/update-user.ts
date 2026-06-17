import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { UserSchema, type User, type UserInput } from '../types';
import { usersKey } from './get-users';
import { userKey } from './get-user';

export const updateUser = async (tenantId: string, id: string, input: UserInput): Promise<User> => {
  const data = await apiClient.put<unknown>(`/tenants/${tenantId}/users/${id}`, input);
  return UserSchema.parse(data);
};

export function useUpdateUser(
  tenantId: string,
  id: string,
  opts?: { onSuccess?: (user: User) => void },
) {
  return useMutation({
    mutationFn: (input: UserInput) => updateUser(tenantId, id, input),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: usersKey(tenantId) });
      queryClient.invalidateQueries({ queryKey: userKey(tenantId, id) });
      opts?.onSuccess?.(user);
    },
  });
}
