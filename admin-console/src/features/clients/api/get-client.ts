import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ClientSchema, type Client } from '../types';

export const clientKey = (tenantId: string, id: string) =>
  ['tenants', tenantId, 'clients', id] as const;

export const getClient = async (tenantId: string, id: string): Promise<Client> => {
  const data = await apiClient.get<unknown>(`/tenants/${tenantId}/clients/${id}`);
  return ClientSchema.parse(data);
};

export function useClient(tenantId: string, id: string) {
  return useQuery({
    queryKey: clientKey(tenantId, id),
    queryFn: () => getClient(tenantId, id),
    enabled: Boolean(tenantId && id),
  });
}
