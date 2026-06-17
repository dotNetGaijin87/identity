import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryClient } from '@/lib/react-query';
import { ClientSchema, type Client, type ClientInput } from '../types';
import { clientsKey } from './get-clients';

export const createClient = async (tenantId: string, input: ClientInput): Promise<Client> => {
  const data = await apiClient.post<unknown>(`/tenants/${tenantId}/clients`, input);
  return ClientSchema.parse(data);
};

export function useCreateClient(tenantId: string, opts?: { onSuccess?: (client: Client) => void }) {
  return useMutation({
    mutationFn: (input: ClientInput) => createClient(tenantId, input),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: clientsKey(tenantId) });
      opts?.onSuccess?.(client);
    },
  });
}
