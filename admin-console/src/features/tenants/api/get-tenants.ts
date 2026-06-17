import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { TenantSchema, type Tenant } from '../types';

export const tenantsKey = ['tenants'] as const;

export const getTenants = async (): Promise<Tenant[]> => {
  const data = await apiClient.get<unknown>('/tenants');
  return z.array(TenantSchema).parse(data);
};

export function useTenants() {
  return useQuery({ queryKey: tenantsKey, queryFn: getTenants });
}
