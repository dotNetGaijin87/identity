import { http, HttpResponse, delay } from 'msw';
import { db, session } from '../db';
import { errorResponse, readJson, str } from './_helpers';

const toAdminDto = (admin: { id: string; username: string; email: string }) => ({
  id: admin.id,
  username: admin.username,
  email: admin.email,
});

export const authHandlers = [
  http.post('*/api/auth/login', async ({ request }) => {
    await delay(150);
    const body = await readJson(request);
    const username = str(body?.username);
    const password = str(body?.password);

    const admin = db.adminUser.findFirst({ where: { username: { equals: username } } });
    if (!admin || admin.password !== password) {
      return errorResponse(401, 'Invalid username or password');
    }
    session.set(admin.id);
    return HttpResponse.json(toAdminDto(admin));
  }),

  http.post('*/api/auth/logout', async () => {
    await delay(50);
    session.set(null);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/auth/me', async () => {
    await delay(100);
    const id = session.get();
    const admin = id ? db.adminUser.findFirst({ where: { id: { equals: id } } }) : null;
    if (!admin) return errorResponse(401, 'Not authenticated');
    return HttpResponse.json(toAdminDto(admin));
  }),
];
