/** Shared, cross-feature base types. */

/** Error thrown by the API client for any non-2xx response. */
export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/** Shape every mock endpoint uses for a failure body. */
export type ApiErrorBody = { message: string };
