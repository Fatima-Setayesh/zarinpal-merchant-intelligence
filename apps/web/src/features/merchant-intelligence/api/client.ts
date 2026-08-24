import { ApiClientError, errorKindForStatus } from "./errors";
import { SchemaValidationError, tryParseErrorEnvelope } from "./schemas";

export type ResponseParser<T> = (value: unknown) => T;

const normalizeApiBase = (value: string): string => value.replace(/\/+$/u, "");

const isValidApiBase = (value: string): boolean => {
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const resolveApiBase = (
  configured: string | undefined,
  development: boolean,
): string => {
  const candidate = configured?.trim();
  if (candidate && !isValidApiBase(candidate)) {
    throw new Error(
      "VITE_API_BASE_URL must be an absolute HTTP(S) URL or a same-origin path.",
    );
  }
  if (candidate) return normalizeApiBase(candidate);
  return development ? "http://localhost:3000/api/v1" : "/api/v1";
};

let apiConfigurationError: unknown;
export const apiBase = (() => {
  try {
    return resolveApiBase(
      import.meta.env.VITE_API_BASE_URL,
      import.meta.env.DEV,
    );
  } catch (error: unknown) {
    apiConfigurationError = error;
    return "";
  }
})();

const safeJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch (cause: unknown) {
    const requestId = response.headers.get("x-request-id") ?? undefined;
    throw new ApiClientError("The API returned unreadable JSON.", {
      kind: "invalid_response",
      code: "INVALID_RESPONSE",
      status: response.status,
      ...(requestId === undefined ? {} : { requestId }),
      cause,
    });
  }
};

export const fetchJson = async <T>(
  path: string,
  parser: ResponseParser<T>,
  init?: RequestInit,
): Promise<T> => {
  if (apiConfigurationError !== undefined) {
    throw new ApiClientError("The API base URL is invalid.", {
      kind: "configuration",
      code: "INVALID_API_CONFIGURATION",
      cause: apiConfigurationError,
    });
  }
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        ...init?.headers,
      },
    });
  } catch (cause: unknown) {
    if (cause instanceof DOMException && cause.name === "AbortError")
      throw cause;
    throw new ApiClientError("The API could not be reached.", {
      kind: "network",
      code: "NETWORK_ERROR",
      cause,
    });
  }

  const payload = await safeJson(response);
  if (!response.ok) {
    const envelope = tryParseErrorEnvelope(payload);
    const requestId =
      envelope?.requestId ?? response.headers.get("x-request-id") ?? undefined;
    const details = envelope?.error.details;
    throw new ApiClientError(
      envelope?.error.message ?? "The API request failed.",
      {
        kind: errorKindForStatus(response.status),
        code: envelope?.error.code ?? `HTTP_${response.status}`,
        status: response.status,
        ...(requestId === undefined ? {} : { requestId }),
        ...(details === undefined ? {} : { details }),
      },
    );
  }

  try {
    return parser(payload);
  } catch (cause: unknown) {
    if (!(cause instanceof SchemaValidationError)) throw cause;
    const requestId = response.headers.get("x-request-id") ?? undefined;
    throw new ApiClientError(
      "The API response did not match the expected contract.",
      {
        kind: "invalid_response",
        code: "INVALID_RESPONSE",
        status: response.status,
        ...(requestId === undefined ? {} : { requestId }),
        details: { path: cause.path },
        cause,
      },
    );
  }
};
