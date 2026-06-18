import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { sessionsKey } from './get-sessions';

export const revokeSession = async (tenantId: string, id: string): Promise<void> => {
  await apiClient.delete(`/tenants/${tenantId}/sessions/${id}`);
};

export function useRevokeSession(tenantId: string, opts?: { onSuccess?: () => void }) {
  return useMutation({
    mutationFn: (id: string) => revokeSession(tenantId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsKey(tenantId) });
      opts?.onSuccess?.();
    },
  });
}
