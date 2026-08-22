import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { App } from "@/app/app";
import { AppProviders } from "@/app/providers";

vi.mock("@/features/merchant-intelligence/merchant-intelligence-dashboard", () => ({
  MerchantIntelligenceDashboard: () => (
    <main>
      <h1>هوشمندی پذیرنده</h1>
    </main>
  ),
}));

describe("App", () => {
  it("renders the merchant intelligence experience at the application root", () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    expect(screen.getByRole("heading", { name: "هوشمندی پذیرنده" })).toBeInTheDocument();
  });
});
