import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import { errorResponse } from './_helpers';

type SessionEntity = ReturnType<typeof db.userSession.create>;

const parseClients = (json: string): unknown[] => {
  try {
    const v = JSON.parse(json || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const toDto = (s: SessionEntity) => ({
  id: s.id,
  userId: s.userId,
  username: s.username,
  ipAddress: s.ipAddress,
  userAgent: s.userAgent,
  createdAt: s.createdAt,
  lastSeenAt: s.lastSeenAt,
  expiresAt: s.expiresAt,
  clients: parseClients(s.clientsJson),
});

export const sessionHandlers = [
  http.get('*/api/tenants/:tenantId/sessions', async ({ params }) => {
    await delay(150);
    const tenantId = String(params.tenantId);
    const sessions = db.userSession.findMany({ where: { tenantId: { equals: tenantId } } });
    return HttpResponse.json(sessions.map(toDto));
  }),

  http.delete('*/api/tenants/:tenantId/sessions/:id', async ({ params }) => {
    await delay(100);
    const deleted = db.userSession.delete({ where: { id: { equals: String(params.id) } } });
    if (!deleted) return errorResponse(404, 'Session not found');
    return new HttpResponse(null, { status: 204 });
  }),
];
