import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { demoDashboard } from "../dashboard/demo-placeholder";
import { AdvancedFilters } from "./advanced-filters";

describe("AdvancedFilters", () => {
  it("returns frontend selections without calculating analytical output", () => {
    const onApply = vi.fn();

    render(
      <AdvancedFilters
        options={demoDashboard.filterOptions}
        onApply={onApply}
      />,
    );

    fireEvent.change(screen.getByLabelText("Payment status"), {
      target: { value: "failed" },
    });
    fireEvent.change(screen.getByLabelText("Attempt count"), {
      target: { value: "2-plus" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply scope" }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: "failed",
        attemptCount: "2-plus",
      }),
    );
  });

  it("resets staged selections safely", () => {
    const onReset = vi.fn();

    render(
      <AdvancedFilters
        options={demoDashboard.filterOptions}
        onApply={vi.fn()}
        onReset={onReset}
      />,
    );

    fireEvent.change(screen.getByLabelText("Payment status"), {
      target: { value: "failed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByLabelText("Payment status")).toHaveValue("all");
    expect(onReset).toHaveBeenCalledOnce();
  });
});
