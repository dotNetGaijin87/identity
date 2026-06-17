import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { ClientSchema, type Client } from '../types';
import { clientsKey } from './get-clients';
import { clientKey } from './get-client';

export const regenerateClientSecret = async (tenantId: string, id: string): Promise<Client> => {
  const data = await apiClient.post<unknown>(
    `/tenants/${tenantId}/clients/${id}/regenerate-secret`,
  );
  return ClientSchema.parse(data);
};

export function useRegenerateClientSecret(
  tenantId: string,
  id: string,
  opts?: { onSuccess?: (client: Client) => void },
) {
  return useMutation({
    mutationFn: () => regenerateClientSecret(tenantId, id),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: clientsKey(tenantId) });
      queryClient.invalidateQueries({ queryKey: clientKey(tenantId, id) });
      opts?.onSuccess?.(client);
    },
  });
}
