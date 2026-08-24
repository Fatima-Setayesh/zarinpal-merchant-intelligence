import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import type { FilterOptions, MerchantListItem } from "../api/types";
import type { FilterDraft } from "../model/filters";
import { formatDate, numberFormatter } from "../model/formatters";
import { DashboardDrawer } from "./dashboard-drawer";

const statusLabel = (value: string, fallback: string): string => {
  if (value === "succeeded") return "موفق";
  if (value === "failed") return "ناموفق";
  if (value === "pending") return "در انتظار";
  return fallback;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="preview-field-label">{label}</span>
      {children}
    </label>
  );
}

export function FilterDrawer({
  open,
  draft,
  merchants,
  options,
  warnings,
  onChange,
  onApply,
  onReset,
  onClose,
}: {
  open: boolean;
  draft: FilterDraft;
  merchants: MerchantListItem[];
  options: FilterOptions;
  warnings: string[];
  onChange: (draft: FilterDraft) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const supported = new Set(options.supportedDimensions);
  const update = <Key extends keyof FilterDraft>(
    key: Key,
    value: FilterDraft[Key],
  ) => onChange({ ...draft, [key]: value });
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onApply();
  };
  return (
    <DashboardDrawer
      open={open}
      side="right"
      title="فیلترها"
      description="گزینه‌ها و دامنه‌ها از قابلیت‌های اعلام‌شده API می‌آیند."
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex min-h-full flex-col">
        <div className="grid flex-1 gap-5 p-5 sm:p-6">
          {warnings.length > 0 ? (
            <ul className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-6">
              {warnings.map((warning) => (
                <li key={warning} dir="auto">
                  {warning}
                </li>
              ))}
            </ul>
          ) : null}
          <Field label="پذیرنده">
            <Select
              value={draft.merchantId}
              onChange={(event) => update("merchantId", event.target.value)}
            >
              {merchants.map((merchant) => (
                <option key={merchant.merchantId} value={merchant.merchantId}>
                  {merchant.displayName}
                </option>
              ))}
            </Select>
          </Field>
          {supported.has("category") ? (
            <Field label="دسته‌بندی">
              <Select
                value={draft.category}
                onChange={(event) => update("category", event.target.value)}
              >
                <option value="all">همه</option>
                {options.categories.map((option) => (
                  <option key={option.id} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <fieldset>
            <legend className="preview-field-label">
              بازه زمانی در Asia/Tehran
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="grid gap-1.5 text-xs text-muted-foreground">
                از تاریخ
                <Input
                  required
                  type="date"
                  value={draft.dateFrom}
                  onChange={(event) => update("dateFrom", event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-xs text-muted-foreground">
                تا تاریخ
                <Input
                  required
                  type="date"
                  min={draft.dateFrom}
                  value={draft.dateTo}
                  onChange={(event) => update("dateTo", event.target.value)}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatDate(draft.dateFrom)} تا {formatDate(draft.dateTo)}
            </p>
          </fieldset>
          {supported.has("status") ? (
            <Field label="وضعیت پرداخت">
              <Select
                value={draft.status}
                onChange={(event) => update("status", event.target.value)}
              >
                <option value="all">همه</option>
                {options.statuses.map((option) => (
                  <option key={option.value} value={option.value}>
                    {statusLabel(option.value, option.label)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {supported.has("attempt_count_min") ||
          supported.has("attempt_count_max") ? (
            <fieldset>
              <legend className="preview-field-label">بازه تعداد تلاش</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input
                  aria-label="حداقل تعداد تلاش"
                  type="number"
                  inputMode="numeric"
                  min={options.attemptCountRange.minimum ?? 0}
                  max={options.attemptCountRange.maximum ?? undefined}
                  placeholder="حداقل"
                  value={draft.attemptMin}
                  onChange={(event) => update("attemptMin", event.target.value)}
                />
                <Input
                  aria-label="حداکثر تعداد تلاش"
                  type="number"
                  inputMode="numeric"
                  min={
                    draft.attemptMin || options.attemptCountRange.minimum || 0
                  }
                  max={options.attemptCountRange.maximum ?? undefined}
                  placeholder="حداکثر"
                  value={draft.attemptMax}
                  onChange={(event) => update("attemptMax", event.target.value)}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                دامنه API:{" "}
                {numberFormatter.format(options.attemptCountRange.minimum ?? 0)}{" "}
                تا{" "}
                {options.attemptCountRange.maximum === null
                  ? "نامشخص"
                  : numberFormatter.format(options.attemptCountRange.maximum)}
              </p>
            </fieldset>
          ) : null}
          {supported.has("amount_min") || supported.has("amount_max") ? (
            <fieldset>
              <legend className="preview-field-label">بازه مبلغ</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Input
                  aria-label="حداقل مبلغ"
                  type="number"
                  inputMode="numeric"
                  min={options.amountRange.minimum ?? 0}
                  max={options.amountRange.maximum ?? undefined}
                  placeholder="حداقل"
                  value={draft.amountMin}
                  onChange={(event) => update("amountMin", event.target.value)}
                />
                <Input
                  aria-label="حداکثر مبلغ"
                  type="number"
                  inputMode="numeric"
                  min={draft.amountMin || options.amountRange.minimum || 0}
                  max={options.amountRange.maximum ?? undefined}
                  placeholder="حداکثر"
                  value={draft.amountMax}
                  onChange={(event) => update("amountMax", event.target.value)}
                />
              </div>
            </fieldset>
          ) : null}
          {supported.has("issuer") ? (
            <Field label="صادرکننده (Issuer)">
              <Select
                value={draft.issuer}
                onChange={(event) => update("issuer", event.target.value)}
              >
                <option value="all">همه</option>
                {options.issuers.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {supported.has("terminal") ? (
            <Field label="پایانه">
              <Select
                value={draft.terminal}
                onChange={(event) => update("terminal", event.target.value)}
              >
                <option value="all">همه</option>
                {options.terminals.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>
        <footer className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-border bg-card p-4 sm:p-5">
          <Button type="button" variant="secondary" onClick={onReset}>
            پاک‌کردن فیلترها
          </Button>
          <Button type="submit">اعمال فیلترها</Button>
        </footer>
      </form>
    </DashboardDrawer>
  );
}
