import { http, HttpResponse, delay } from 'msw';
import { db, uid } from '../db';
import { bool, errorResponse, readJson, str } from './_helpers';

type UserEntity = ReturnType<typeof db.user.create>;

/** Shape a user entity into the API DTO: relations flattened to `roleIds`. */
const toUserDto = (user: UserEntity) => ({
  id: user.id,
  tenantId: user.tenantId,
  username: user.username,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  enabled: user.enabled,
  createdAt: user.createdAt,
  roleIds: (user.roles ?? []).map((r) => r.id),
});

const resolveRoles = (tenantId: string, roleIds: unknown) => {
  if (!Array.isArray(roleIds)) return [];
  const ids = roleIds.filter((x): x is string => typeof x === 'string');
  return db.role.findMany({ where: { tenantId: { equals: tenantId }, id: { in: ids } } });
};

export const userHandlers = [
  http.get('*/api/tenants/:tenantId/users', async ({ params }) => {
    await delay(150);
    const tenantId = String(params.tenantId);
    const users = db.user.findMany({ where: { tenantId: { equals: tenantId } } });
    return HttpResponse.json(users.map(toUserDto));
  }),

  http.post('*/api/tenants/:tenantId/users', async ({ params, request }) => {
    await delay(150);
    const tenantId = String(params.tenantId);
    const body = await readJson(request);
    const username = str(body?.username);
    if (!username) return errorResponse(400, 'Username is required');
    const clash = db.user.findFirst({
      where: { tenantId: { equals: tenantId }, username: { equals: username } },
    });
    if (clash) return errorResponse(409, `A user named "${username}" already exists`);
    const user = db.user.create({
      id: uid('user'),
      tenantId,
      username,
      email: str(body?.email),
      firstName: str(body?.firstName),
      lastName: str(body?.lastName),
      enabled: bool(body?.enabled, true),
      createdAt: 1_700_000_000_000,
      roles: resolveRoles(tenantId, body?.roleIds),
    });
    return HttpResponse.json(toUserDto(user), { status: 201 });
  }),

  http.get('*/api/tenants/:tenantId/users/:id', async ({ params }) => {
    await delay(100);
    const user = db.user.findFirst({ where: { id: { equals: String(params.id) } } });
    if (!user) return errorResponse(404, 'User not found');
    return HttpResponse.json(toUserDto(user));
  }),

  http.put('*/api/tenants/:tenantId/users/:id', async ({ params, request }) => {
    await delay(150);
    const id = String(params.id);
    const existing = db.user.findFirst({ where: { id: { equals: id } } });
    if (!existing) return errorResponse(404, 'User not found');
    const body = await readJson(request);
    const updated = db.user.update({
      where: { id: { equals: id } },
      data: {
        email: str(body?.email),
        firstName: str(body?.firstName),
        lastName: str(body?.lastName),
        enabled: bool(body?.enabled, existing.enabled),
      },
    });
    return HttpResponse.json(toUserDto(updated!));
  }),

  // Assign roles to a user (the dedicated role-assignment endpoint).
  http.put('*/api/tenants/:tenantId/users/:id/roles', async ({ params, request }) => {
    await delay(150);
    const id = String(params.id);
    const tenantId = String(params.tenantId);
    const existing = db.user.findFirst({ where: { id: { equals: id } } });
    if (!existing) return errorResponse(404, 'User not found');
    const body = await readJson(request);
    const updated = db.user.update({
      where: { id: { equals: id } },
      data: { roles: resolveRoles(tenantId, body?.roleIds) },
    });
    return HttpResponse.json(toUserDto(updated!));
  }),

  http.delete('*/api/tenants/:tenantId/users/:id', async ({ params }) => {
    await delay(100);
    const deleted = db.user.delete({ where: { id: { equals: String(params.id) } } });
    if (!deleted) return errorResponse(404, 'User not found');
    return new HttpResponse(null, { status: 204 });
  }),
];
