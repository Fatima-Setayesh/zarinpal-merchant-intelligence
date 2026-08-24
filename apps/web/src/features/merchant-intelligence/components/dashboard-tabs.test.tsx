import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { DashboardTabs, type DashboardTab } from "./dashboard-tabs";

function Harness() {
  const [selected, setSelected] = useState<DashboardTab>("overview");
  return <DashboardTabs selected={selected} onChange={setSelected} />;
}

describe("DashboardTabs", () => {
  it("supports roving focus, Home/End, and RTL-aware arrow keys", () => {
    render(<Harness />);
    const overview = screen.getByRole("tab", { name: "نمای کلی" });
    const insights = screen.getByRole("tab", { name: "بینش‌ها" });
    overview.focus();
    fireEvent.keyDown(overview, { key: "ArrowLeft" });
    expect(insights).toHaveAttribute("aria-selected", "true");
    expect(insights).toHaveFocus();
    fireEvent.keyDown(insights, { key: "Home" });
    expect(overview).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(overview, { key: "End" });
    expect(insights).toHaveAttribute("aria-selected", "true");
  });
});
