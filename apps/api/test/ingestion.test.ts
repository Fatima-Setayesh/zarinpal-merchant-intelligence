import { gzipSync } from "node:zlib";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ConfigurationError, loadConfig } from "../src/config.js";
import {
  CHALLENGE_DATA_COLUMNS,
  DomainValidationError,
} from "../src/domain.js";
import { FilePaymentAttemptRepository } from "../src/repository.js";

type ChallengeColumn = (typeof CHALLENGE_DATA_COLUMNS)[number];

const baseRow: Record<ChallengeColumn, string> = {
  session_key: "100",
  try_seq: "1",
  terminal_key: "T1",
  merchant_key: "M1",
  category_id: "48160002",
  category_title: "Retail, online",
  amount: "6390000",
  adjusted_fee: "56720",
  session_status: "Paid",
  try_status: "Failed",
  switch_response_code: "PSP-01:55",
  psp_code: "PSP-01",
  issuer_bank_code: "BANK-1",
  payer_card_key: "CARD-1",
  verify_type: "Automated",
  init_time_ms: "86",
  verify_time_ms: "",
  created_at: "2026-01-01 10:00:00",
  try_created_at: "2026-01-01 10:01:00",
  verified_at: "",
  settled_at: "",
  expire_in: "2026-01-01 10:30:00",
};

const quoteCsv = (value: string): string =>
  /[",\r\n]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

const row = (
  overrides: Partial<Record<ChallengeColumn, string>> = {},
): string =>
  CHALLENGE_DATA_COLUMNS.map((column) =>
    quoteCsv(overrides[column] ?? baseRow[column]),
  ).join(",");

const withDataset = async (
  csv: string,
  run: (filePath: string) => Promise<void>,
): Promise<void> => {
  const directory = await mkdtemp(join(tmpdir(), "zarinpal-ingestion-"));
  const filePath = join(directory, "challenge_data.csv.gz");
  try {
    await writeFile(filePath, gzipSync(csv));
    await run(filePath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

describe("challenge dataset ingestion", () => {
  it("streams, validates, and maps challenge rows as IRR payment attempts", async () => {
    const csv = [
      CHALLENGE_DATA_COLUMNS.join(","),
      row(),
      row({
        try_seq: "2",
        try_status: "Paid",
        try_created_at: "2026-01-01 10:02:00",
        verified_at: "2026-01-01 10:03:00",
        settled_at: "2026-01-01 10:04:00",
      }),
      row({
        session_key: "200",
        try_seq: "0",
        session_status: "Failed",
        try_status: "NoAttempt",
        try_created_at: "",
        issuer_bank_code: "",
      }),
      row({
        session_key: "300",
        session_status: "Failed",
        try_status: "InBank",
        adjusted_fee: "NULL",
        issuer_bank_code: "\\N",
      }),
    ].join("\n");

    await withDataset(csv, async (filePath) => {
      const snapshot = await new FilePaymentAttemptRepository(filePath, {
        challengeDataUtcOffset: "+03:30",
      }).getSnapshot();

      expect(snapshot.attempts).toHaveLength(3);
      expect(snapshot.attempts.map((attempt) => attempt.status)).toEqual([
        "failed",
        "succeeded",
        "pending",
      ]);
      expect(
        snapshot.attempts.every((attempt) => attempt.currency === "IRR"),
      ).toBe(true);
      expect(snapshot.attempts[0]).toMatchObject({
        attemptId: "challenge:100:try:1",
        sessionId: "100",
        amount: 6_390_000,
        adjustedFee: 56_720,
        occurredAt: "2026-01-01T06:31:00.000Z",
        sourceAttemptStatus: "Failed",
        merchantCategory: { id: "48160002", label: "Retail, online" },
      });
      expect(snapshot.attempts[2]?.adjustedFee).toBeNull();
      expect(snapshot.attempts[2]?.issuer).toBeUndefined();
      expect(snapshot.sessions).toHaveLength(3);
      const attemptedSession = snapshot.sessions?.find(
        (session) => session.sessionId === "100",
      );
      const noAttemptSession = snapshot.sessions?.find(
        (session) => session.sessionId === "200",
      );
      expect(attemptedSession?.attempts[0]).toBe(snapshot.attempts[0]);
      expect(attemptedSession?.attempts[1]).toBe(snapshot.attempts[1]);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.attempts)).toBe(true);
      expect(Object.isFrozen(snapshot.attempts[0])).toBe(true);
      expect(Object.isFrozen(snapshot.sessions)).toBe(true);
      expect(Object.isFrozen(attemptedSession)).toBe(true);
      expect(Object.isFrozen(attemptedSession?.attempts)).toBe(true);
      expect(noAttemptSession).toMatchObject({
        merchantId: "M1",
        observedAt: "2026-01-01T06:30:00.000Z",
        representativeAmount: 6_390_000,
        currency: "IRR",
        outcome: "failed",
        attempts: [],
        sourceSessionStatus: "Failed",
        sourceAttemptStatus: "NoAttempt",
        terminalId: "T1",
        merchantCategory: { id: "48160002", label: "Retail, online" },
      });
      expect(Object.isFrozen(noAttemptSession)).toBe(true);
      expect(Object.isFrozen(noAttemptSession?.attempts)).toBe(true);
      expect(noAttemptSession?.firstAttemptAt).toBeUndefined();
      expect(snapshot.ingestion).toEqual({
        sourceFormat: "challenge_csv_gzip",
        sourceRowCount: 4,
        acceptedAttemptCount: 3,
        excludedNoAttemptCount: 1,
        preservedNoAttemptSessionCount: 1,
        missingAdjustedFeeCount: 1,
        missingIssuerCount: 1,
        sourceUtcOffset: "+03:30",
      });
      expect(snapshot.datasetId).toMatch(/^sha256:[a-f0-9]{64}$/u);
    });
  });

  it("maps a reversed challenge payment to failed without losing source statuses", async () => {
    const csv = [
      CHALLENGE_DATA_COLUMNS.join(","),
      row({
        session_key: "reversed-session",
        session_status: "Reversed",
        try_status: "Reversed",
      }),
    ].join("\n");

    await withDataset(csv, async (filePath) => {
      const snapshot = await new FilePaymentAttemptRepository(
        filePath,
      ).getSnapshot();

      expect(snapshot.attempts).toHaveLength(1);
      expect(snapshot.attempts[0]).toMatchObject({
        sessionId: "reversed-session",
        status: "failed",
        sourceSessionStatus: "Reversed",
        sourceAttemptStatus: "Reversed",
      });
      expect(snapshot.sessions?.[0]?.outcome).toBe("failed");
    });
  });

  it("rejects schema drift and malformed required values", async () => {
    const invalidHeader = CHALLENGE_DATA_COLUMNS.slice(0, -1).join(",");
    await withDataset(invalidHeader, async (filePath) => {
      await expect(
        new FilePaymentAttemptRepository(filePath).getSnapshot(),
      ).rejects.toBeInstanceOf(DomainValidationError);
    });

    const invalidAmount = [
      CHALLENGE_DATA_COLUMNS.join(","),
      row({ amount: "12.5" }),
    ].join("\n");
    await withDataset(invalidAmount, async (filePath) => {
      await expect(
        new FilePaymentAttemptRepository(filePath).getSnapshot(),
      ).rejects.toMatchObject({
        issues: [
          expect.objectContaining({
            path: "challengeData.rows[2].amount",
          }),
        ],
      });
    });
  });

  it("validates the explicit timezone offset for naive source timestamps", () => {
    expect(loadConfig({}).paymentsDataUtcOffset).toBe("+03:30");
    expect(
      loadConfig({ PAYMENTS_DATA_UTC_OFFSET: "Z" }).paymentsDataUtcOffset,
    ).toBe("Z");
    expect(() => loadConfig({ PAYMENTS_DATA_UTC_OFFSET: "+15:00" })).toThrow(
      ConfigurationError,
    );
  });
});
