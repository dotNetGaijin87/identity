import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';

export const logout = () => apiClient.post<null>('/auth/logout');

export function useLogout(opts?: { onSuccess?: () => void }) {
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Drop all cached server data — including the auth user — on sign-out.
      queryClient.clear();
      opts?.onSuccess?.();
    },
  });
}
