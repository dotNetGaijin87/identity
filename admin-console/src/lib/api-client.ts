import { env } from '@/config/env';
import { notificationsStore } from '@/stores/notifications';
import { ApiError } from '@/types';

type QueryParams = Record<string, string | number | boolean | undefined>;

type RequestOptions = {
  params?: QueryParams;
  /** Set false to handle the error locally instead of raising a global notification. */
  notifyOnError?: boolean;
};

function buildUrl(path: string, params?: QueryParams): string {
  let base = env.API_URL.endsWith('/') ? env.API_URL.slice(0, -1) : env.API_URL;
  // Resolve a relative base (e.g. "/api") against the current origin so `fetch`
  // gets an absolute URL — required by Node's fetch in the test environment.
  if (base.startsWith('/') && typeof window !== 'undefined' && window.location?.origin) {
    base = `${window.location.origin}${base}`;
  }
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const { params, notifyOnError = true } = options;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // send the session/auth cookie the mock sets
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    const error = new ApiError('Network request failed', 0, cause);
    if (notifyOnError) raise(error);
    throw error;
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    const message =
      (isRecord(payload) && typeof payload.message === 'string' && payload.message) ||
      `Request failed with status ${response.status}`;
    const error = new ApiError(message, response.status, payload);
    if (notifyOnError) raise(error);
    throw error;
  }

  return payload as T;
}

function raise(error: ApiError) {
  notificationsStore.getState().showNotification({
    type: 'error',
    title: 'Something went wrong',
    message: error.message,
    duration: 5000,
  });
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};
