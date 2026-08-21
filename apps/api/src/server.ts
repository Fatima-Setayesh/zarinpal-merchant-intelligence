import { createServer, type Server } from "node:http";
import { pathToFileURL } from "node:url";

import { createApp } from "./app.js";
import { loadConfig, type ApiConfig } from "./config.js";
import {
  FilePaymentAttemptRepository,
  UnavailablePaymentAttemptRepository,
  type PaymentAttemptRepository,
} from "./repository.js";
import { createMerchantIntelligenceService } from "./service.js";

const HEADERS_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 30_000;
const KEEP_ALIVE_TIMEOUT_MS = 5_000;
const SHUTDOWN_GRACE_MS = 10_000;

const errorDescription = (error: unknown, depth = 0): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const description = `${error.name}: ${error.message}`;
  return error.cause !== undefined && error.cause !== error && depth < 3
    ? `${description}; caused by ${errorDescription(error.cause, depth + 1)}`
    : description;
};

const logOperationalError = (
  event: string,
  error: unknown,
  context: Readonly<Record<string, unknown>> = {},
): void => {
  process.stderr.write(
    `${JSON.stringify({
      level: "error",
      event,
      ...context,
      error: errorDescription(error),
    })}\n`,
  );
};

export const createConfiguredRepository = (
  config: ApiConfig,
): PaymentAttemptRepository =>
  config.paymentsDataPath === undefined
    ? new UnavailablePaymentAttemptRepository()
    : new FilePaymentAttemptRepository(config.paymentsDataPath);

export const startServer = async (
  config: ApiConfig = loadConfig(),
): Promise<Server> => {
  const repository = createConfiguredRepository(config);
  const service = createMerchantIntelligenceService(
    repository,
    config.paymentsDataPath === undefined
      ? {}
      : {
          onHealthError: (error) => {
            logOperationalError("health_storage_failed", error);
          },
        },
  );
  const server = createServer(
    createApp({
      service,
      corsOrigin: config.corsOrigin,
      ...(config.authToken !== undefined
        ? { authToken: config.authToken }
        : {}),
      onError: (error, context) => {
        logOperationalError("request_failed", error, context);
      },
    }),
  );
  server.headersTimeout = HEADERS_TIMEOUT_MS;
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
  server.setTimeout(REQUEST_TIMEOUT_MS);
  server.maxHeadersCount = 100;
  server.maxRequestsPerSocket = 1_000;

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(config.port, config.host);
  });

  return server;
};

export const closeServerGracefully = async (
  server: Server,
  gracePeriodMs = SHUTDOWN_GRACE_MS,
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }
    let settled = false;
    const finish = (error?: Error): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(forceCloseTimer);
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    };
    const forceCloseTimer = setTimeout(() => {
      server.closeAllConnections();
      finish();
    }, gracePeriodMs);
    forceCloseTimer.unref();

    server.close((error) => finish(error));
    server.closeIdleConnections();
  });

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(entryPath).href
) {
  startServer()
    .then((server) => {
      const address = server.address();
      const location =
        typeof address === "object" && address !== null
          ? `${address.address}:${address.port}`
          : String(address);
      process.stdout.write(
        `Merchant intelligence API listening on ${location}\n`,
      );

      let shutdown: Promise<void> | undefined;
      const close = (): void => {
        shutdown ??= closeServerGracefully(server).catch((error: unknown) => {
          logOperationalError("shutdown_failed", error);
          process.exitCode = 1;
        });
      };
      process.once("SIGINT", close);
      process.once("SIGTERM", close);
    })
    .catch((error: unknown) => {
      logOperationalError("startup_failed", error);
      process.exitCode = 1;
    });
}
