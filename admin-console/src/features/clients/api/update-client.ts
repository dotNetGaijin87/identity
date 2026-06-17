import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { ClientSchema, type Client, type ClientInput } from '../types';
import { clientsKey } from './get-clients';
import { clientKey } from './get-client';

export const updateClient = async (
  tenantId: string,
  id: string,
  input: ClientInput,
): Promise<Client> => {
  const data = await apiClient.put<unknown>(`/tenants/${tenantId}/clients/${id}`, input);
  return ClientSchema.parse(data);
};

export function useUpdateClient(
  tenantId: string,
  id: string,
  opts?: { onSuccess?: (client: Client) => void },
) {
  return useMutation({
    mutationFn: (input: ClientInput) => updateClient(tenantId, id, input),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: clientsKey(tenantId) });
      queryClient.invalidateQueries({ queryKey: clientKey(tenantId, id) });
      opts?.onSuccess?.(client);
    },
  });
}
