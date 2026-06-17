import { http, HttpResponse, delay } from 'msw';
import { db, genSecret, uid } from '../db';
import { bool, errorResponse, readJson, str } from './_helpers';

type ClientEntity = ReturnType<typeof db.client.create>;

const PKCE = ['none', 'S256'];
const ALGS = ['RS256', 'ES256', 'PS256'];

const parseArr = (json: string): string[] => {
  try {
    const value = JSON.parse(json || '[]');
    return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const strArr = (v: unknown): string[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : fallback;

const oneOf = (v: unknown, allowed: string[], fallback: string): string =>
  typeof v === 'string' && allowed.includes(v) ? v : fallback;

/** Shape a client entity into the API DTO (JSON list fields → arrays, normalized enums). */
const toClientDto = (c: ClientEntity) => ({
  id: c.id,
  tenantId: c.tenantId,
  clientId: c.clientId,
  name: c.name,
  description: c.description,
  enabled: c.enabled,
  publicClient: c.publicClient,
  secret: c.publicClient ? '' : c.secret,
  rootUrl: c.rootUrl,
  homeUrl: c.homeUrl,
  redirectUris: parseArr(c.redirectUrisJson),
  postLogoutRedirectUris: parseArr(c.postLogoutRedirectUrisJson),
  directAccessGrants: c.directAccessGrants,
  serviceAccounts: c.serviceAccounts,
  implicitFlow: c.implicitFlow,
  deviceFlow: c.deviceFlow,
  pkce: oneOf(c.pkce, PKCE, 'none'),
  consentRequired: c.consentRequired,
  accessTokenLifespan: num(c.accessTokenLifespan, 300),
  idTokenSignatureAlg: oneOf(c.idTokenSignatureAlg, ALGS, 'RS256'),
  defaultScopes: parseArr(c.defaultScopesJson),
  fullScopeAllowed: c.fullScopeAllowed,
  createdAt: c.createdAt,
});

/** Fields shared by create and update, read from a request body. */
const readClientFields = (body: Record<string, unknown> | null, publicClient: boolean) => ({
  name: str(body?.name),
  description: str(body?.description),
  enabled: bool(body?.enabled, true),
  publicClient,
  rootUrl: str(body?.rootUrl),
  homeUrl: str(body?.homeUrl),
  redirectUrisJson: JSON.stringify(strArr(body?.redirectUris)),
  postLogoutRedirectUrisJson: JSON.stringify(strArr(body?.postLogoutRedirectUris)),
  defaultScopesJson: JSON.stringify(strArr(body?.defaultScopes)),
  directAccessGrants: bool(body?.directAccessGrants),
  serviceAccounts: bool(body?.serviceAccounts),
  implicitFlow: bool(body?.implicitFlow),
  deviceFlow: bool(body?.deviceFlow),
  pkce: oneOf(body?.pkce, PKCE, 'none'),
  consentRequired: bool(body?.consentRequired),
  accessTokenLifespan: num(body?.accessTokenLifespan, 300),
  idTokenSignatureAlg: oneOf(body?.idTokenSignatureAlg, ALGS, 'RS256'),
  fullScopeAllowed: bool(body?.fullScopeAllowed),
});

export const clientHandlers = [
  http.get('*/api/tenants/:tenantId/clients', async ({ params }) => {
    await delay(150);
    const tenantId = String(params.tenantId);
    const clients = db.client.findMany({ where: { tenantId: { equals: tenantId } } });
    return HttpResponse.json(clients.map(toClientDto));
  }),

  http.post('*/api/tenants/:tenantId/clients', async ({ params, request }) => {
    await delay(150);
    const tenantId = String(params.tenantId);
    const body = await readJson(request);
    const clientId = str(body?.clientId);
    if (!clientId) return errorResponse(400, 'Client ID is required');
    const clash = db.client.findFirst({
      where: { tenantId: { equals: tenantId }, clientId: { equals: clientId } },
    });
    if (clash) return errorResponse(409, `A client with ID "${clientId}" already exists`);

    const publicClient = bool(body?.publicClient, true);
    const client = db.client.create({
      id: uid('client'),
      tenantId,
      clientId,
      secret: publicClient ? '' : genSecret(),
      createdAt: 1_700_000_000_000,
      ...readClientFields(body, publicClient),
    });
    return HttpResponse.json(toClientDto(client), { status: 201 });
  }),

  http.get('*/api/tenants/:tenantId/clients/:id', async ({ params }) => {
    await delay(100);
    const client = db.client.findFirst({ where: { id: { equals: String(params.id) } } });
    if (!client) return errorResponse(404, 'Client not found');
    return HttpResponse.json(toClientDto(client));
  }),

  http.put('*/api/tenants/:tenantId/clients/:id', async ({ params, request }) => {
    await delay(150);
    const id = String(params.id);
    const existing = db.client.findFirst({ where: { id: { equals: id } } });
    if (!existing) return errorResponse(404, 'Client not found');
    const body = await readJson(request);
    const publicClient = bool(body?.publicClient, existing.publicClient);

    // Public clients have no secret; confidential ones get one on first switch.
    let secret = existing.secret;
    if (publicClient) secret = '';
    else if (!secret) secret = genSecret();

    const updated = db.client.update({
      where: { id: { equals: id } },
      data: { secret, ...readClientFields(body, publicClient) },
    });
    return HttpResponse.json(toClientDto(updated!));
  }),

  http.post('*/api/tenants/:tenantId/clients/:id/regenerate-secret', async ({ params }) => {
    await delay(150);
    const id = String(params.id);
    const existing = db.client.findFirst({ where: { id: { equals: id } } });
    if (!existing) return errorResponse(404, 'Client not found');
    if (existing.publicClient) {
      return errorResponse(400, 'Public clients do not have a secret');
    }
    const updated = db.client.update({
      where: { id: { equals: id } },
      data: { secret: genSecret() },
    });
    return HttpResponse.json(toClientDto(updated!));
  }),

  http.delete('*/api/tenants/:tenantId/clients/:id', async ({ params }) => {
    await delay(100);
    const deleted = db.client.delete({ where: { id: { equals: String(params.id) } } });
    if (!deleted) return errorResponse(404, 'Client not found');
    return new HttpResponse(null, { status: 204 });
  }),
];
