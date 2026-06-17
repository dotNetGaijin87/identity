import { HttpResponse } from 'msw';

/** Standard error response body shape: `{ message }`. */
export const errorResponse = (status: number, message: string) =>
  HttpResponse.json({ message }, { status });

/** Read & shallow-validate a JSON body; returns null if it isn't an object. */
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
