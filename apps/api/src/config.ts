export interface ApiConfig {
  readonly host: string;
  readonly port: number;
  readonly paymentsDataPath: string | undefined;
  readonly corsOrigin: string;
  readonly authToken: string | undefined;
}

type ConfigVariable =
  | "API_HOST"
  | "API_PORT"
  | "PAYMENTS_DATA_PATH"
  | "CORS_ORIGIN"
  | "API_AUTH_TOKEN";

export class ConfigurationError extends Error {
  readonly variable: ConfigVariable;

  constructor(variable: ConfigVariable, message: string) {
    super(`${variable}: ${message}`);
    this.name = "ConfigurationError";
    this.variable = variable;
  }
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;
const DEFAULT_CORS_ORIGIN = "http://localhost:5173";
const MINIMUM_AUTH_TOKEN_LENGTH = 32;

function parseHost(value: string | undefined): string {
  if (value === undefined) {
    return DEFAULT_HOST;
  }

  const host = value.trim();
  if (host.length === 0 || /\s/u.test(host)) {
    throw new ConfigurationError(
      "API_HOST",
      "must be a non-empty hostname or IP address without whitespace",
    );
  }

  return host;
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const normalized = value.trim();
  if (!/^\d+$/u.test(normalized)) {
    throw new ConfigurationError(
      "API_PORT",
      "must be an integer from 1 to 65535",
    );
  }

  const port = Number(normalized);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new ConfigurationError(
      "API_PORT",
      "must be an integer from 1 to 65535",
    );
  }

  return port;
}

function parsePaymentsDataPath(value: string | undefined): string | undefined {
  if (value === undefined || value.trim().length === 0) {
    return undefined;
  }

  const dataPath = value.trim();
  if (dataPath.includes("\0")) {
    throw new ConfigurationError(
      "PAYMENTS_DATA_PATH",
      "must not contain null bytes",
    );
  }

  return dataPath;
}

function parseCorsOrigin(value: string | undefined): string {
  if (value === undefined) {
    return DEFAULT_CORS_ORIGIN;
  }

  const normalized = value.trim();
  if (normalized === "*") {
    return normalized;
  }

  let origin: URL;
  try {
    origin = new URL(normalized);
  } catch {
    throw new ConfigurationError(
      "CORS_ORIGIN",
      "must be * or an absolute HTTP(S) origin",
    );
  }

  const hasOnlyOrigin =
    origin.protocol === "http:" || origin.protocol === "https:";
  const hasUnsupportedParts =
    origin.username.length > 0 ||
    origin.password.length > 0 ||
    origin.pathname !== "/" ||
    origin.search.length > 0 ||
    origin.hash.length > 0;

  if (!hasOnlyOrigin || hasUnsupportedParts) {
    throw new ConfigurationError(
      "CORS_ORIGIN",
      "must be * or an absolute HTTP(S) origin without a path, query, or fragment",
    );
  }

  return origin.origin;
}

function parseAuthToken(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  if (value.length < MINIMUM_AUTH_TOKEN_LENGTH) {
    throw new ConfigurationError(
      "API_AUTH_TOKEN",
      `must contain at least ${MINIMUM_AUTH_TOKEN_LENGTH} characters`,
    );
  }
  if (/\s/u.test(value)) {
    throw new ConfigurationError(
      "API_AUTH_TOKEN",
      "must not contain whitespace because it is used as a Bearer token",
    );
  }
  return value;
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.toLowerCase();
  if (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "0:0:0:0:0:0:0:1"
  ) {
    return true;
  }
  const ipv4Match = /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u.exec(normalized);
  return (
    ipv4Match !== null &&
    ipv4Match.slice(1).every((part) => Number(part) <= 255)
  );
}

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ApiConfig {
  const host = parseHost(environment.API_HOST);
  const authToken = parseAuthToken(environment.API_AUTH_TOKEN);
  if (!isLoopbackHost(host) && authToken === undefined) {
    throw new ConfigurationError(
      "API_AUTH_TOKEN",
      "is required when API_HOST is not a loopback address",
    );
  }

  return Object.freeze({
    host,
    port: parsePort(environment.API_PORT),
    paymentsDataPath: parsePaymentsDataPath(environment.PAYMENTS_DATA_PATH),
    corsOrigin: parseCorsOrigin(environment.CORS_ORIGIN),
    authToken,
  });
}
