import { z } from 'zod';

export const CLIENT_SCOPES = [
  'openid',
  'profile',
  'email',
  'roles',
  'offline_access',
  'address',
  'phone',
] as const;

export const PKCE_METHODS = ['none', 'S256'] as const;
export const ID_TOKEN_ALGS = ['RS256', 'ES256', 'PS256'] as const;
export const LIFESPAN_UNITS = ['seconds', 'minutes', 'hours'] as const;
export type LifespanUnit = (typeof LIFESPAN_UNITS)[number];

const optionalUrl = z.union([z.literal(''), z.string().url('Must be a valid URL')]).optional();

export const ClientSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  clientId: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  // false = confidential (client authentication on)
  publicClient: z.boolean(),
  secret: z.string(),
  rootUrl: z.string(),
  homeUrl: z.string(),
  redirectUris: z.array(z.string()),
  postLogoutRedirectUris: z.array(z.string()),
  directAccessGrants: z.boolean(),
  serviceAccounts: z.boolean(),
  implicitFlow: z.boolean(),
  deviceFlow: z.boolean(),
  pkce: z.enum(PKCE_METHODS),
  consentRequired: z.boolean(),
  accessTokenLifespan: z.number(), // seconds
  idTokenSignatureAlg: z.enum(ID_TOKEN_ALGS),
  defaultScopes: z.array(z.string()),
  fullScopeAllowed: z.boolean(),
  createdAt: z.number(),
});
export type Client = z.infer<typeof ClientSchema>;

/** The API payload create/update send (server manages id/secret/createdAt). */
export type ClientInput = {
  clientId: string;
  name?: string;
  description?: string;
  enabled: boolean;
  publicClient: boolean;
  rootUrl?: string;
  homeUrl?: string;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  directAccessGrants: boolean;
  serviceAccounts: boolean;
  implicitFlow: boolean;
  deviceFlow: boolean;
  pkce: (typeof PKCE_METHODS)[number];
  consentRequired: boolean;
  accessTokenLifespan: number;
  idTokenSignatureAlg: (typeof ID_TOKEN_ALGS)[number];
  defaultScopes: string[];
  fullScopeAllowed: boolean;
};

/** Form shape: URI lists are objects (for useFieldArray) and the lifespan is value+unit. */
export const clientFormSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  name: z.string().optional(),
  description: z.string().optional(),
  enabled: z.boolean(),
  clientAuthentication: z.boolean(), // on = confidential
  rootUrl: optionalUrl,
  homeUrl: optionalUrl,
  redirectUris: z.array(z.object({ value: z.string() })),
  postLogoutRedirectUris: z.array(z.object({ value: z.string() })),
  directAccessGrants: z.boolean(),
  serviceAccounts: z.boolean(),
  implicitFlow: z.boolean(),
  deviceFlow: z.boolean(),
  pkce: z.enum(PKCE_METHODS),
  consentRequired: z.boolean(),
  accessTokenLifespanValue: z.number().int().positive('Must be a positive number'),
  accessTokenLifespanUnit: z.enum(LIFESPAN_UNITS),
  idTokenSignatureAlg: z.enum(ID_TOKEN_ALGS),
  defaultScopes: z.array(z.string()),
  fullScopeAllowed: z.boolean(),
});
export type ClientFormValues = z.infer<typeof clientFormSchema>;

const UNIT_SECONDS: Record<LifespanUnit, number> = { seconds: 1, minutes: 60, hours: 3600 };

export const lifespanToSeconds = (value: number, unit: LifespanUnit): number =>
  Math.round(value * UNIT_SECONDS[unit]);

export const secondsToLifespan = (total: number): { value: number; unit: LifespanUnit } => {
  if (total > 0 && total % 3600 === 0) return { value: total / 3600, unit: 'hours' };
  if (total > 0 && total % 60 === 0) return { value: total / 60, unit: 'minutes' };
  return { value: total > 0 ? total : 300, unit: 'seconds' };
};
