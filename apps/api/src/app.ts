import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  IncomingMessage,
  RequestListener,
  ServerResponse,
} from "node:http";

import { DomainValidationError } from "./domain.js";
import {
  AppError,
  DataUnavailableError,
  MethodNotAllowedError,
  NotFoundError,
  ValidationError,
} from "./errors.js";
import { RepositoryError } from "./repository.js";
import type { MerchantIntelligenceService } from "./service.js";

const JSON_BODY_LIMIT_BYTES = 64 * 1024;
const API_PREFIX = "/api/v1";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Readonly<Record<string, unknown>>;
  };
  requestId: string;
}

interface HttpErrorOptions {
  statusCode: number;
  code: string;
  details?: Readonly<Record<string, unknown>>;
}

class HttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>> | undefined;

  constructor(message: string, options: HttpErrorOptions) {
    super(message);
    this.name = "HttpError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
  }
}

export interface ApiApplicationOptions {
  readonly service: MerchantIntelligenceService;
  readonly corsOrigin?: string;
  readonly authToken?: string;
  readonly requestIdFactory?: () => string;
  readonly onError?: (
    error: unknown,
    context: { readonly requestId: string; readonly statusCode: number },
  ) => void;
}

const setCommonHeaders = (
  response: ServerResponse,
  requestId: string,
  corsOrigin: string,
): void => {
  response.setHeader("access-control-allow-origin", corsOrigin);
  response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  response.setHeader(
    "access-control-allow-headers",
    "authorization, content-type, x-request-id",
  );
  response.setHeader("access-control-expose-headers", "x-request-id");
  response.setHeader("cache-control", "no-store");
  response.setHeader(
    "content-security-policy",
    "default-src 'none'; frame-ancestors 'none'",
  );
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("x-request-id", requestId);
  if (corsOrigin !== "*") {
    response.setHeader("vary", "origin");
  }
};

const sendJson = (
  response: ServerResponse,
  statusCode: number,
  value: unknown,
): void => {
  const body = JSON.stringify(value);
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("content-length", Buffer.byteLength(body));
  response.end(body);
};

const parseRequestId = (
  request: IncomingMessage,
  requestIdFactory: () => string,
): string => {
  const supplied = request.headers["x-request-id"];
  if (typeof supplied === "string" && REQUEST_ID_PATTERN.test(supplied)) {
    return supplied;
  }

  return requestIdFactory();
};

const readJsonBody = async (request: IncomingMessage): Promise<unknown> => {
  const contentType = request.headers["content-type"];
  if (
    typeof contentType !== "string" ||
    !/^application\/json(?:\s*;|$)/iu.test(contentType)
  ) {
    throw new HttpError("Content-Type must be application/json.", {
      statusCode: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  }

  const declaredLength = request.headers["content-length"];
  if (typeof declaredLength === "string") {
    const parsedLength = Number(declaredLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > JSON_BODY_LIMIT_BYTES
    ) {
      throw new HttpError("JSON request body exceeds 64 KiB.", {
        statusCode: 413,
        code: "PAYLOAD_TOO_LARGE",
      });
    }
  }

  const chunks: Buffer[] = [];
  let byteCount = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteCount += buffer.byteLength;
    if (byteCount > JSON_BODY_LIMIT_BYTES) {
      throw new HttpError("JSON request body exceeds 64 KiB.", {
        statusCode: 413,
        code: "PAYLOAD_TOO_LARGE",
      });
    }
    chunks.push(buffer);
  }

  if (byteCount === 0) {
    throw new ValidationError("A JSON request body is required.");
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new ValidationError("Request body must contain valid JSON.");
  }
};

const readUrl = (request: IncomingMessage): URL => {
  try {
    return new URL(request.url ?? "/", "http://api.local");
  } catch {
    throw new ValidationError("Request URL is invalid.");
  }
};

const knownMethods = (pathname: string): readonly string[] | undefined => {
  if (
    pathname === `${API_PREFIX}/health` ||
    pathname === `${API_PREFIX}/merchants` ||
    pathname === `${API_PREFIX}/filter-options`
  ) {
    return ["GET"];
  }
  if (
    pathname === `${API_PREFIX}/insights/query` ||
    pathname === `${API_PREFIX}/trends/query` ||
    pathname === `${API_PREFIX}/segments/query` ||
    /^\/api\/v1\/merchants\/[^/]+\/summary\/query$/u.test(pathname)
  ) {
    return ["POST"];
  }
  return undefined;
};

const hasValidBearerToken = (
  request: IncomingMessage,
  expectedToken: string,
): boolean => {
  const authorization = request.headers.authorization;
  const match =
    typeof authorization === "string"
      ? /^Bearer ([^\s]+)$/iu.exec(authorization)
      : null;
  const suppliedToken = match?.[1] ?? "";
  const expectedDigest = createHash("sha256").update(expectedToken).digest();
  const suppliedDigest = createHash("sha256").update(suppliedToken).digest();
  return match !== null && timingSafeEqual(expectedDigest, suppliedDigest);
};

const routeRequest = async (
  request: IncomingMessage,
  service: MerchantIntelligenceService,
  authToken: string | undefined,
): Promise<unknown> => {
  const method = request.method ?? "GET";
  const url = readUrl(request);
  const { pathname } = url;

  const allowedMethods = knownMethods(pathname);
  if (allowedMethods === undefined) {
    throw new NotFoundError();
  }
  if (!allowedMethods.includes(method)) {
    throw new MethodNotAllowedError(method, allowedMethods);
  }
  if (pathname !== `${API_PREFIX}/merchants` && url.search.length > 0) {
    throw new ValidationError(
      "This endpoint does not accept query parameters.",
    );
  }
  if (
    pathname !== `${API_PREFIX}/health` &&
    authToken !== undefined &&
    !hasValidBearerToken(request, authToken)
  ) {
    throw new HttpError("A valid Bearer token is required.", {
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  }

  if (pathname === `${API_PREFIX}/health`) {
    return service.getHealth();
  }
  if (pathname === `${API_PREFIX}/merchants`) {
    return service.listMerchants(url.searchParams);
  }
  if (pathname === `${API_PREFIX}/filter-options`) {
    return service.getFilterOptions();
  }

  const body = await readJsonBody(request);
  if (pathname === `${API_PREFIX}/insights/query`) {
    return service.queryInsights(body);
  }
  if (pathname === `${API_PREFIX}/trends/query`) {
    return service.queryTrends(body);
  }
  if (pathname === `${API_PREFIX}/segments/query`) {
    return service.querySegments(body);
  }

  const merchantMatch = /^\/api\/v1\/merchants\/([^/]+)\/summary\/query$/u.exec(
    pathname,
  );
  if (merchantMatch !== null) {
    const encodedMerchantId = merchantMatch[1];
    if (encodedMerchantId === undefined) {
      throw new NotFoundError();
    }
    let merchantId: string;
    try {
      merchantId = decodeURIComponent(encodedMerchantId);
    } catch {
      throw new ValidationError("Merchant identifier is malformed.");
    }
    return service.queryMerchantSummary(merchantId, body);
  }

  throw new NotFoundError();
};

const toErrorResponse = (
  error: unknown,
  requestId: string,
): {
  statusCode: number;
  envelope: ErrorEnvelope;
  allowedMethods?: readonly string[];
} => {
  if (error instanceof DomainValidationError) {
    return {
      statusCode: 400,
      envelope: {
        error: {
          code: "VALIDATION_ERROR",
          message: error.message,
          details: { issues: error.issues },
        },
        requestId,
      },
    };
  }
  if (error instanceof RepositoryError) {
    error = new DataUnavailableError(
      "Payment data is currently unavailable.",
      undefined,
      error,
    );
  }
  if (error instanceof AppError || error instanceof HttpError) {
    return {
      statusCode: error.statusCode,
      envelope: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
        requestId,
      },
      ...(error instanceof MethodNotAllowedError
        ? { allowedMethods: error.allowedMethods }
        : {}),
    };
  }

  return {
    statusCode: 500,
    envelope: {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected server error occurred.",
      },
      requestId,
    },
  };
};

const isDegradedHealthResult = (
  result: unknown,
): result is { status: "degraded" } =>
  typeof result === "object" &&
  result !== null &&
  "status" in result &&
  result.status === "degraded";

export const createApp = (options: ApiApplicationOptions): RequestListener => {
  const corsOrigin = options.corsOrigin ?? "http://localhost:5173";
  const requestIdFactory = options.requestIdFactory ?? randomUUID;

  return (request, response): void => {
    const requestId = parseRequestId(request, requestIdFactory);
    setCommonHeaders(response, requestId, corsOrigin);

    void (async (): Promise<void> => {
      try {
        if (request.method === "OPTIONS") {
          const pathname = readUrl(request).pathname;
          if (knownMethods(pathname) === undefined) {
            throw new NotFoundError();
          }
          response.statusCode = 204;
          response.setHeader("content-length", "0");
          response.end();
          return;
        }

        const result = await routeRequest(
          request,
          options.service,
          options.authToken,
        );
        sendJson(response, isDegradedHealthResult(result) ? 503 : 200, result);
      } catch (error: unknown) {
        const mapped = toErrorResponse(error, requestId);
        if (mapped.statusCode >= 500) {
          options.onError?.(error, {
            requestId,
            statusCode: mapped.statusCode,
          });
        }
        if (mapped.allowedMethods !== undefined) {
          response.setHeader("allow", mapped.allowedMethods.join(", "));
        }
        if (mapped.statusCode === 401) {
          response.setHeader(
            "www-authenticate",
            'Bearer realm="merchant-intelligence-api"',
          );
        }
        sendJson(response, mapped.statusCode, mapped.envelope);
      }
    })();
  };
};
