import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { demoDashboard } from "../dashboard/demo-placeholder";
import { PerformanceTrendChart } from "./performance-trend-chart";

describe("PerformanceTrendChart", () => {
  it("provides a textual alternative and backend-supplied emphasis labels", () => {
    render(
      <PerformanceTrendChart
        trend={demoDashboard.trend}
        onOpenTraceability={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("img", { name: /payment completion trend/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/accessible data summary/i)).toBeVisible();
    expect(
      screen.getByRole("listitem", {
        name: /week 3.*backend-flagged exception preview/i,
      }),
    ).toBeInTheDocument();
  });
});
