import type { FilterOptions, FilterState } from "../api/types";

export const PRODUCT_TIMEZONE = "Asia/Tehran";

export interface FilterDraft {
  merchantId: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  attemptMin: string;
  attemptMax: string;
  amountMin: string;
  amountMax: string;
  issuer: string;
  terminal: string;
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const parseCalendarDate = (value: string): CalendarDate => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) throw new Error("Calendar date must use YYYY-MM-DD.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  ) {
    throw new Error("Calendar date is invalid.");
  }
  return { year, month, day };
};

const dateTimeParts = (
  instant: number,
  timezone: string,
): CalendarDate & {
  hour: number;
  minute: number;
  second: number;
} => {
  const formatter = new Intl.DateTimeFormat("en-CA-u-ca-gregory-nu-latn", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(new Date(instant))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year ?? 0,
    month: values.month ?? 0,
    day: values.day ?? 0,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
};

const offsetAt = (instant: number, timezone: string): number => {
  const parts = dateTimeParts(instant, timezone);
  return (
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ) -
    Math.trunc(instant / 1000) * 1000
  );
};

const startOfCalendarDay = (value: string, timezone: string): number => {
  const date = parseCalendarDate(value);
  const localAsUtc = Date.UTC(date.year, date.month - 1, date.day);
  let candidate = localAsUtc - offsetAt(localAsUtc, timezone);
  candidate = localAsUtc - offsetAt(candidate, timezone);
  const resolved = dateTimeParts(candidate, timezone);
  if (
    resolved.year !== date.year ||
    resolved.month !== date.month ||
    resolved.day !== date.day ||
    resolved.hour !== 0 ||
    resolved.minute !== 0 ||
    resolved.second !== 0
  ) {
    throw new Error(`The selected date cannot be represented in ${timezone}.`);
  }
  return candidate;
};

const nextCalendarDate = (value: string): string => {
  const date = parseCalendarDate(value);
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
  return [
    String(next.getUTCFullYear()).padStart(4, "0"),
    String(next.getUTCMonth() + 1).padStart(2, "0"),
    String(next.getUTCDate()).padStart(2, "0"),
  ].join("-");
};

export const serializeCalendarDayRange = (
  from: string,
  to: string,
  timezone = PRODUCT_TIMEZONE,
): NonNullable<FilterState["dateRange"]> => {
  const start = startOfCalendarDay(from, timezone);
  const end = startOfCalendarDay(nextCalendarDate(to), timezone) - 1;
  if (start > end) throw new Error("Start date must not be after end date.");
  return {
    from: new Date(start).toISOString(),
    to: new Date(end).toISOString(),
    timezone,
  };
};

export const calendarDateInTimezone = (
  instant: string,
  timezone: string,
): string => {
  const parsed = Date.parse(instant);
  if (Number.isNaN(parsed)) return instant.slice(0, 10);
  const parts = dateTimeParts(parsed, timezone);
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
};

export const createInitialDraft = (
  merchantId: string,
  options: FilterOptions,
): FilterDraft => ({
  merchantId,
  category: "all",
  dateFrom: calendarDateInTimezone(options.dateRange.from, PRODUCT_TIMEZONE),
  dateTo: calendarDateInTimezone(options.dateRange.to, PRODUCT_TIMEZONE),
  status: "all",
  attemptMin: "",
  attemptMax: "",
  amountMin: "",
  amountMax: "",
  issuer: "all",
  terminal: "all",
});

const addDimension = (
  dimensions: NonNullable<FilterState["dimensions"]>,
  supported: ReadonlySet<string>,
  key: string,
  value: string,
): void => {
  if (supported.has(key) && value.length > 0 && value !== "all") {
    dimensions.push({ key, operator: "include", values: [value] });
  }
};

export const toFilterState = (
  draft: FilterDraft,
  options: FilterOptions,
): FilterState => {
  const supported = new Set(options.supportedDimensions);
  const dimensions: NonNullable<FilterState["dimensions"]> = [];
  addDimension(dimensions, supported, "category", draft.category);
  addDimension(dimensions, supported, "status", draft.status);
  addDimension(dimensions, supported, "attempt_count_min", draft.attemptMin);
  addDimension(dimensions, supported, "attempt_count_max", draft.attemptMax);
  addDimension(dimensions, supported, "amount_min", draft.amountMin);
  addDimension(dimensions, supported, "amount_max", draft.amountMax);
  addDimension(dimensions, supported, "issuer", draft.issuer);
  addDimension(dimensions, supported, "terminal", draft.terminal);
  return {
    merchantIds: [draft.merchantId],
    analysisUnit: "payment_session",
    dateRange: serializeCalendarDayRange(draft.dateFrom, draft.dateTo),
    ...(dimensions.length === 0 ? {} : { dimensions }),
  };
};
