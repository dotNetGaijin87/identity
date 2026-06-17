import { http, HttpResponse, delay } from 'msw';
import { db, uid } from '../db';
import { bool, errorResponse, readJson, str } from './_helpers';

export const tenantHandlers = [
  http.get('*/api/tenants', async () => {
    await delay(150);
    return HttpResponse.json(db.tenant.getAll());
  }),

  http.post('*/api/tenants', async ({ request }) => {
    await delay(150);
    const body = await readJson(request);
    const name = str(body?.name);
    if (!name) return errorResponse(400, 'Tenant name is required');
    if (db.tenant.findFirst({ where: { name: { equals: name } } })) {
      return errorResponse(409, `A tenant named "${name}" already exists`);
    }
    const tenant = db.tenant.create({
      id: uid('tenant'),
      name,
      displayName: str(body?.displayName) || name,
      enabled: bool(body?.enabled, true),
      createdAt: 1_700_000_000_000,
    });
    return HttpResponse.json(tenant, { status: 201 });
  }),

  http.get('*/api/tenants/:id', async ({ params }) => {
    await delay(100);
    const tenant = db.tenant.findFirst({ where: { id: { equals: String(params.id) } } });
    if (!tenant) return errorResponse(404, 'Tenant not found');
    return HttpResponse.json(tenant);
  }),

  http.put('*/api/tenants/:id', async ({ params, request }) => {
    await delay(150);
    const id = String(params.id);
    const existing = db.tenant.findFirst({ where: { id: { equals: id } } });
    if (!existing) return errorResponse(404, 'Tenant not found');
    const body = await readJson(request);
    const updated = db.tenant.update({
      where: { id: { equals: id } },
      data: {
        displayName: str(body?.displayName) || existing.displayName,
        enabled: bool(body?.enabled, existing.enabled),
      },
    });
    return HttpResponse.json(updated);
  }),

  http.delete('*/api/tenants/:id', async ({ params }) => {
    await delay(100);
    const id = String(params.id);
    const deleted = db.tenant.delete({ where: { id: { equals: id } } });
    if (!deleted) return errorResponse(404, 'Tenant not found');
    return new HttpResponse(null, { status: 204 });
  }),
];
