import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ChartSeries } from "../api/types";
import { TrendChart } from "./trend-chart";

const series: ChartSeries = {
  seriesId: "series-1",
  label: "Daily success rate",
  metricId: "successful-session-rate",
  unit: "percent",
  analysisUnit: "payment_session",
  points: [
    { x: "2026-01-01", y: 51, sampleSize: 10 },
    { x: "2026-01-02", y: 49, sampleSize: 11 },
    { x: "2026-01-03", y: 52, sampleSize: 12 },
  ],
  limitations: ["Descriptive series only."],
};

describe("TrendChart", () => {
  it("uses neutral min/max language and keeps an accessible data table", () => {
    render(<TrendChart series={series} onOpenTrace={vi.fn()} />);
    expect(screen.getByText(/کمینه مشاهده‌شده/u)).toBeInTheDocument();
    expect(screen.getByText(/بیشینه مشاهده‌شده/u)).toBeInTheDocument();
    expect(document.querySelector(".preview-anomaly")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("جدول دسترس‌پذیر داده‌ها"));
    expect(
      screen.getByRole("table", { name: /روند روزانه نرخ نشست موفق/u }),
    ).toBeInTheDocument();
    expect(screen.getByText("Descriptive series only.")).toBeInTheDocument();
  });
});
