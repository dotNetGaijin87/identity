import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { SessionSchema, type Session } from '../types';

export const sessionsKey = (tenantId: string) => ['tenants', tenantId, 'sessions'] as const;

export const getSessions = async (tenantId: string): Promise<Session[]> => {
  const data = await apiClient.get<unknown>(`/tenants/${tenantId}/sessions`);
  return z.array(SessionSchema).parse(data);
};

export function useSessions(tenantId: string) {
  return useQuery({
    queryKey: sessionsKey(tenantId),
    queryFn: () => getSessions(tenantId),
    enabled: Boolean(tenantId),
  });
}
