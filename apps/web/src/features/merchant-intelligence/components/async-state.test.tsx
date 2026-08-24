import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiClientError } from "../api/errors";
import { SectionError } from "./async-state";

describe("SectionError", () => {
  it("shows dataset-unavailable recovery copy and the backend request ID", () => {
    render(
      <SectionError
        title="خلاصه دریافت نشد"
        error={
          new ApiClientError("unavailable", {
            kind: "unavailable",
            code: "DATA_UNAVAILABLE",
            status: 503,
            requestId: "request-503",
          })
        }
        onRetry={vi.fn()}
      />,
    );
    expect(
      screen.getByText("دیتاست پرداخت اکنون در دسترس نیست."),
    ).toBeInTheDocument();
    expect(screen.getByText(/request-503/u)).toBeInTheDocument();
  });
});
