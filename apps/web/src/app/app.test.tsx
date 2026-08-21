import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "@/app/app";
import { AppProviders } from "@/app/providers";

describe("App", () => {
  it("renders a decision-first dashboard with explicit demo labeling", () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Know what matters before opening a chart.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Demo / Placeholder").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: "Evidence translated into next actions",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /session and attempt units remain explicitly separated/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no verified merchant analysis/i),
    ).toBeInTheDocument();
  });
});
