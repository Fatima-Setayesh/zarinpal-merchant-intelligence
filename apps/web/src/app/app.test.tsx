import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "@/app/app";
import { AppProviders } from "@/app/providers";

describe("App", () => {
  it("renders the decision intelligence foundation without analytical claims", () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Turn payment evidence into confident merchant actions.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Raw data")).toBeInTheDocument();
    expect(screen.getAllByText("Demo / Placeholder")).toHaveLength(2);
    expect(
      screen.getByText(/does not contain merchant metrics/i),
    ).toBeInTheDocument();
  });
});
