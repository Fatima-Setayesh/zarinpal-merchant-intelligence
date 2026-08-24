export type ApiErrorKind =
  | "configuration"
  | "validation"
  | "unauthorized"
  | "not_found"
  | "payload_too_large"
  | "unavailable"
  | "server"
  | "invalid_response"
  | "network"
  | "http";

export interface ApiClientErrorOptions {
  kind: ApiErrorKind;
  code: string;
  status?: number;
  requestId?: string;
  details?: Readonly<Record<string, unknown>>;
  cause?: unknown;
}

export class ApiClientError extends Error {
  readonly kind: ApiErrorKind;
  readonly code: string;
  readonly status: number | undefined;
  readonly requestId: string | undefined;
  readonly details: Readonly<Record<string, unknown>> | undefined;

  constructor(message: string, options: ApiClientErrorOptions) {
    super(message, { cause: options.cause });
    this.name = "ApiClientError";
    this.kind = options.kind;
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

export const isApiClientError = (error: unknown): error is ApiClientError =>
  error instanceof ApiClientError;

export const errorKindForStatus = (status: number): ApiErrorKind => {
  if (status === 400) return "validation";
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 404) return "not_found";
  if (status === 413) return "payload_too_large";
  if (status === 503) return "unavailable";
  if (status >= 500) return "server";
  return "http";
};
