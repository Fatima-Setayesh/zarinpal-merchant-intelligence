import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ProductErrorBoundary } from "./error-boundary";

function Broken(): ReactNode {
  throw new Error("render failed");
}

describe("ProductErrorBoundary", () => {
  it("renders a Persian safe fallback without exposing diagnostics", () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    render(
      <ProductErrorBoundary>
        <Broken />
      </ProductErrorBoundary>,
    );
    expect(
      screen.getByRole("heading", {
        name: "نمایش این صفحه با مشکل روبه‌رو شد",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("render failed")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "بارگذاری دوباره" }),
    ).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
