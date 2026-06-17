import { http, HttpResponse, delay } from 'msw';
import { db, uid } from '../db';
import { errorResponse, readJson, str } from './_helpers';

export const roleHandlers = [
  http.get('*/api/tenants/:tenantId/roles', async ({ params }) => {
    await delay(150);
    const tenantId = String(params.tenantId);
    return HttpResponse.json(db.role.findMany({ where: { tenantId: { equals: tenantId } } }));
  }),

  http.post('*/api/tenants/:tenantId/roles', async ({ params, request }) => {
    await delay(150);
    const tenantId = String(params.tenantId);
    const body = await readJson(request);
    const name = str(body?.name);
    if (!name) return errorResponse(400, 'Role name is required');
    const clash = db.role.findFirst({
      where: { tenantId: { equals: tenantId }, name: { equals: name } },
    });
    if (clash) return errorResponse(409, `A role named "${name}" already exists in this tenant`);
    const role = db.role.create({
      id: uid('role'),
      tenantId,
      name,
      description: str(body?.description),
      createdAt: 1_700_000_000_000,
    });
    return HttpResponse.json(role, { status: 201 });
  }),

  http.get('*/api/tenants/:tenantId/roles/:id', async ({ params }) => {
    await delay(100);
    const role = db.role.findFirst({ where: { id: { equals: String(params.id) } } });
    if (!role) return errorResponse(404, 'Role not found');
    return HttpResponse.json(role);
  }),

  http.put('*/api/tenants/:tenantId/roles/:id', async ({ params, request }) => {
    await delay(150);
    const id = String(params.id);
    const existing = db.role.findFirst({ where: { id: { equals: id } } });
    if (!existing) return errorResponse(404, 'Role not found');
    const body = await readJson(request);
    const updated = db.role.update({
      where: { id: { equals: id } },
      data: {
        name: str(body?.name) || existing.name,
        description: str(body?.description),
      },
    });
    return HttpResponse.json(updated);
  }),

  http.delete('*/api/tenants/:tenantId/roles/:id', async ({ params }) => {
    await delay(100);
    const deleted = db.role.delete({ where: { id: { equals: String(params.id) } } });
    if (!deleted) return errorResponse(404, 'Role not found');
    return new HttpResponse(null, { status: 204 });
  }),
];
