import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { ClientSchema, type Client } from '../types';

export const clientsKey = (tenantId: string) => ['tenants', tenantId, 'clients'] as const;

export const getClients = async (tenantId: string): Promise<Client[]> => {
  const data = await apiClient.get<unknown>(`/tenants/${tenantId}/clients`);
  return z.array(ClientSchema).parse(data);
};

export function useClients(tenantId: string) {
  return useQuery({
    queryKey: clientsKey(tenantId),
    queryFn: () => getClients(tenantId),
    enabled: Boolean(tenantId),
  });
}
