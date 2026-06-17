import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { UserSchema, type User, type UserInput } from '../types';
import { usersKey } from './get-users';

export const createUser = async (tenantId: string, input: UserInput): Promise<User> => {
  const data = await apiClient.post<unknown>(`/tenants/${tenantId}/users`, input);
  return UserSchema.parse(data);
};

export function useCreateUser(tenantId: string, opts?: { onSuccess?: (user: User) => void }) {
  return useMutation({
    mutationFn: (input: UserInput) => createUser(tenantId, input),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: usersKey(tenantId) });
      opts?.onSuccess?.(user);
    },
  });
}
