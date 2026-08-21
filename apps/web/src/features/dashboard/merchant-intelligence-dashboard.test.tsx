import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { demoDashboard } from "./demo-placeholder";
import { MerchantIntelligenceDashboard } from "./merchant-intelligence-dashboard";

describe("MerchantIntelligenceDashboard", () => {
  it("shows an honest loading state without placeholder values", () => {
    render(
      <MerchantIntelligenceDashboard
        dashboard={demoDashboard}
        state="loading"
      />,
    );

    expect(
      screen.getByText("Loading merchant intelligence"),
    ).toBeInTheDocument();
    expect(screen.queryByText("64.8M Toman")).not.toBeInTheDocument();
  });

  it("shows unavailable output without inventing fallback metrics", () => {
    render(
      <MerchantIntelligenceDashboard
        dashboard={demoDashboard}
        state="unavailable"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Verified analytical output is unavailable",
      }),
    ).toBeVisible();
    expect(screen.queryByText("64.8M Toman")).not.toBeInTheDocument();
  });

  it("gives feedback when a presentation-only action is selected", () => {
    render(<MerchantIntelligenceDashboard dashboard={demoDashboard} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Review retry journey" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /frontend action preview/i,
    );
  });
});
