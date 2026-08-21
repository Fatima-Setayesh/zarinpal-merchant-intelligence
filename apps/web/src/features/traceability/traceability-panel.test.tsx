import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { demoDashboard } from "../dashboard/demo-placeholder";
import { TraceabilityPanel } from "./traceability-panel";

describe("TraceabilityPanel", () => {
  it("exposes the complete evidence context supplied to the frontend", () => {
    const record = demoDashboard.traceability[3];

    if (!record) {
      throw new Error(
        "The retry traceability fixture is required for this test.",
      );
    }

    render(<TraceabilityPanel record={record} open onOpenChange={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "How was this calculated?" }),
    ).toBeVisible();
    expect(screen.getByText(record.dateRange)).toBeVisible();
    expect(screen.getByText(record.sampleSize)).toBeVisible();
    expect(screen.getByText(record.formulaExplanation)).toBeVisible();
    expect(screen.getByText(record.missingDataHandling)).toBeInTheDocument();
    expect(screen.getByText(record.limitations[0] ?? "")).toBeVisible();
    expect(screen.getByText(record.provenance)).toBeVisible();
  });

  it("provides an accessible close action", () => {
    const onOpenChange = vi.fn();
    const record = demoDashboard.traceability[0];

    if (!record) {
      throw new Error(
        "The volume traceability fixture is required for this test.",
      );
    }

    render(
      <TraceabilityPanel record={record} open onOpenChange={onOpenChange} />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Close How was this calculated?",
      }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
