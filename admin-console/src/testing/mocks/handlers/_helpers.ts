import { HttpResponse } from 'msw';

export const errorResponse = (status: number, message: string) =>
  HttpResponse.json({ message }, { status });

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const data = await request.json();
    return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
export const bool = (v: unknown, fallback = false): boolean =>
  typeof v === 'boolean' ? v : fallback;
