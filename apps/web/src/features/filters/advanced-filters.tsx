import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

import type { FilterOptionsView } from "../dashboard/dashboard-view-model";

export interface FilterDraft {
  merchant: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  paymentStatus: string;
  attemptCount: string;
  amountMin: string;
  amountMax: string;
  terminal: string;
  issuer: string;
}

const initialFilters: FilterDraft = {
  merchant: "demo-merchant",
  category: "digital-services",
  dateFrom: "2026-07-23",
  dateTo: "2026-08-21",
  paymentStatus: "all",
  attemptCount: "all",
  amountMin: "",
  amountMax: "",
  terminal: "all",
  issuer: "all",
};

interface AdvancedFiltersProps {
  options: FilterOptionsView;
  onApply: (filters: FilterDraft) => void;
  onReset?: () => void;
  compact?: boolean;
}

export function AdvancedFilters({
  options,
  onApply,
  onReset,
  compact = false,
}: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterDraft>(initialFilters);
  const formId = useId();

  function updateFilter<Key extends keyof FilterDraft>(
    key: Key,
    value: FilterDraft[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply(filters);
  }

  function handleReset() {
    setFilters(initialFilters);
    onReset?.();
  }

  const fieldClass = compact ? "grid gap-1.5" : "grid gap-2";

  return (
    <form
      aria-label="Advanced merchant intelligence filters"
      className={compact ? "grid gap-4" : "grid gap-5"}
      onSubmit={handleSubmit}
    >
      <div className={fieldClass}>
        <label htmlFor={`${formId}-merchant`} className="filter-label">
          Merchant
        </label>
        <Select
          id={`${formId}-merchant`}
          value={filters.merchant}
          onChange={(event) => updateFilter("merchant", event.target.value)}
        >
          {options.merchants.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className={fieldClass}>
        <label htmlFor={`${formId}-category`} className="filter-label">
          Category
        </label>
        <Select
          id={`${formId}-category`}
          value={filters.category}
          onChange={(event) => updateFilter("category", event.target.value)}
        >
          {options.categories.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="grid gap-2">
        <legend className="filter-label mb-2">Date range</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div>
            <label className="sr-only" htmlFor={`${formId}-from`}>
              From date
            </label>
            <Input
              id={`${formId}-from`}
              type="date"
              value={filters.dateFrom}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
            />
          </div>
          <div>
            <label className="sr-only" htmlFor={`${formId}-to`}>
              To date
            </label>
            <Input
              id={`${formId}-to`}
              type="date"
              value={filters.dateTo}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <div className={fieldClass}>
        <label htmlFor={`${formId}-status`} className="filter-label">
          Payment status
        </label>
        <Select
          id={`${formId}-status`}
          value={filters.paymentStatus}
          onChange={(event) =>
            updateFilter("paymentStatus", event.target.value)
          }
        >
          {options.paymentStatuses.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className={fieldClass}>
        <label htmlFor={`${formId}-attempts`} className="filter-label">
          Attempt count
        </label>
        <Select
          id={`${formId}-attempts`}
          value={filters.attemptCount}
          onChange={(event) => updateFilter("attemptCount", event.target.value)}
        >
          {options.attemptCounts.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <fieldset className="grid gap-2">
        <legend className="filter-label mb-2">Amount range (Toman)</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Input
            inputMode="numeric"
            aria-label="Minimum amount"
            placeholder="Minimum"
            value={filters.amountMin}
            onChange={(event) => updateFilter("amountMin", event.target.value)}
          />
          <Input
            inputMode="numeric"
            aria-label="Maximum amount"
            placeholder="Maximum"
            value={filters.amountMax}
            onChange={(event) => updateFilter("amountMax", event.target.value)}
          />
        </div>
      </fieldset>

      <div className={fieldClass}>
        <label htmlFor={`${formId}-terminal`} className="filter-label">
          Terminal
        </label>
        <Select
          id={`${formId}-terminal`}
          value={filters.terminal}
          onChange={(event) => updateFilter("terminal", event.target.value)}
        >
          {options.terminals.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className={fieldClass}>
        <label htmlFor={`${formId}-issuer`} className="filter-label">
          Bank / issuer
        </label>
        <Select
          id={`${formId}-issuer`}
          value={filters.issuer}
          onChange={(event) => updateFilter("issuer", event.target.value)}
        >
          {options.issuers.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          className="sm:flex-1"
          onClick={handleReset}
        >
          Reset
        </Button>
        <Button type="submit" className="sm:flex-[1.4]">
          Apply scope
        </Button>
      </div>
    </form>
  );
}
