import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { demoDashboard } from "../dashboard/demo-placeholder";
import { InsightCard } from "./insight-card";

describe("InsightCard", () => {
  it("preserves the insight, evidence, impact, action, and limitation path", () => {
    const insight = demoDashboard.insights[0];
    const onOpenTraceability = vi.fn();
    const onAction = vi.fn();

    if (!insight) {
      throw new Error("The demo insight fixture is required for this test.");
    }

    render(
      <InsightCard
        insight={insight}
        onOpenTraceability={onOpenTraceability}
        onAction={onAction}
      />,
    );

    expect(screen.getByRole("heading", { name: insight.title })).toBeVisible();
    expect(screen.getByText("Evidence")).toBeVisible();
    expect(screen.getByText("Business impact")).toBeVisible();
    expect(screen.getByText("Recommended first action")).toBeVisible();
    expect(screen.getByText(insight.limitations[0] ?? "")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Trace calculation" }));
    expect(onOpenTraceability).toHaveBeenCalledWith(insight.traceabilityId);

    fireEvent.click(screen.getByRole("button", { name: insight.actionLabel }));
    expect(onAction).toHaveBeenCalledWith(insight);
  });
});
