import { z } from 'zod';

export const SessionClientSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  firstSeenAt: z.number(),
  lastSeenAt: z.number(),
});
export type SessionClient = z.infer<typeof SessionClientSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  ipAddress: z.string(),
  userAgent: z.string(),
  createdAt: z.number(),
  lastSeenAt: z.number(),
  expiresAt: z.number(),
  clients: z.array(SessionClientSchema),
});
export type Session = z.infer<typeof SessionSchema>;
