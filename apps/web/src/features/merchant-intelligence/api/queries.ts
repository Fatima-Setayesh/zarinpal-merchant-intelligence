import { useQuery } from "@tanstack/react-query";

import { fetchJson } from "./client";
import {
  parseFilterOptionsResponse,
  parseInsightsResponse,
  parseMerchantListResponse,
  parseMerchantSummaryResponse,
  parseSegmentsResponse,
  parseTrendsResponse,
} from "./schemas";
import type { FilterState } from "./types";

export const merchantIntelligenceKeys = {
  root: ["merchant-intelligence"] as const,
  merchants: () => [...merchantIntelligenceKeys.root, "merchants"] as const,
  filterOptions: () =>
    [...merchantIntelligenceKeys.root, "filter-options"] as const,
  summary: (merchantId: string | null, filters: FilterState | null) =>
    [...merchantIntelligenceKeys.root, "summary", merchantId, filters] as const,
  insights: (filters: FilterState | null) =>
    [...merchantIntelligenceKeys.root, "insights", filters] as const,
  trends: (filters: FilterState | null) =>
    [...merchantIntelligenceKeys.root, "trends", filters] as const,
  segments: (dateRange: FilterState["dateRange"] | undefined) =>
    [...merchantIntelligenceKeys.root, "segments", dateRange] as const,
};

const queryBody = (filters: FilterState): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ filters, page: { limit: 100 } }),
});

export function useMerchantBootstrap() {
  const merchants = useQuery({
    queryKey: merchantIntelligenceKeys.merchants(),
    queryFn: ({ signal }) =>
      fetchJson("/merchants?limit=100", parseMerchantListResponse, { signal }),
  });
  const filterOptions = useQuery({
    queryKey: merchantIntelligenceKeys.filterOptions(),
    queryFn: ({ signal }) =>
      fetchJson("/filter-options", parseFilterOptionsResponse, { signal }),
  });
  return { merchants, filterOptions };
}

export function useMerchantIntelligence(
  merchantId: string | null,
  filters: FilterState | null,
) {
  const enabled = merchantId !== null && filters !== null;
  const summary = useQuery({
    queryKey: merchantIntelligenceKeys.summary(merchantId, filters),
    enabled,
    queryFn: ({ signal }) =>
      fetchJson(
        `/merchants/${encodeURIComponent(merchantId ?? "")}/summary/query`,
        parseMerchantSummaryResponse,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ filters }),
          signal,
        },
      ),
  });
  const insights = useQuery({
    queryKey: merchantIntelligenceKeys.insights(filters),
    enabled,
    queryFn: ({ signal }) =>
      fetchJson("/insights/query", parseInsightsResponse, {
        ...queryBody(filters ?? {}),
        signal,
      }),
  });
  const trends = useQuery({
    queryKey: merchantIntelligenceKeys.trends(filters),
    enabled,
    queryFn: ({ signal }) =>
      fetchJson("/trends/query", parseTrendsResponse, {
        ...queryBody(filters ?? {}),
        signal,
      }),
  });
  const segmentFilters: FilterState | null = filters
    ? {
        ...(filters.dateRange === undefined
          ? {}
          : { dateRange: filters.dateRange }),
        analysisUnit: "payment_session",
      }
    : null;
  const segments = useQuery({
    queryKey: merchantIntelligenceKeys.segments(segmentFilters?.dateRange),
    enabled: segmentFilters !== null,
    queryFn: ({ signal }) =>
      fetchJson("/segments/query", parseSegmentsResponse, {
        ...queryBody(segmentFilters ?? {}),
        signal,
      }),
  });
  return { summary, insights, trends, segments };
}
