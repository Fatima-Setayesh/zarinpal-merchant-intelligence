export type AppErrorCode =
  "VALIDATION_ERROR" | "NOT_FOUND" | "DATA_UNAVAILABLE" | "METHOD_NOT_ALLOWED";

export type ErrorDetails = Readonly<Record<string, unknown>>;

interface AppErrorOptions {
  readonly statusCode: number;
  readonly code: AppErrorCode;
  readonly details?: ErrorDetails;
  readonly cause?: unknown;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: AppErrorCode;
  readonly details: ErrorDetails | undefined;

  constructor(message: string, options: AppErrorOptions) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Request validation failed.", details?: ErrorDetails) {
    super(message, {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      ...(details !== undefined ? { details } : {}),
    });
  }
}

export class NotFoundError extends AppError {
  constructor(
    message = "The requested resource was not found.",
    details?: ErrorDetails,
  ) {
    super(message, {
      statusCode: 404,
      code: "NOT_FOUND",
      ...(details !== undefined ? { details } : {}),
    });
  }
}

export class DataUnavailableError extends AppError {
  constructor(
    message = "Payment data is currently unavailable.",
    details?: ErrorDetails,
    cause?: unknown,
  ) {
    super(message, {
      statusCode: 503,
      code: "DATA_UNAVAILABLE",
      ...(details !== undefined ? { details } : {}),
      ...(cause !== undefined ? { cause } : {}),
    });
  }
}

export class MethodNotAllowedError extends AppError {
  readonly allowedMethods: readonly string[];

  constructor(method: string, allowedMethods: readonly string[]) {
    const normalizedAllowedMethods = Object.freeze([...allowedMethods]);
    super(`Method ${method} is not allowed for this resource.`, {
      statusCode: 405,
      code: "METHOD_NOT_ALLOWED",
      details: {
        method,
        allowedMethods: normalizedAllowedMethods,
      },
    });
    this.allowedMethods = normalizedAllowedMethods;
  }
}
