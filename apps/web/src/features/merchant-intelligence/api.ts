import { useQuery } from "@tanstack/react-query";

export interface DateRange {
  from: string;
  to: string;
  timezone: string;
}

export interface FilterState {
  merchantIds?: string[];
  dateRange?: DateRange;
  analysisUnit?: "payment_session" | "payment_attempt";
  dimensions?: Array<{
    key: string;
    operator: "include" | "exclude";
    values: string[];
  }>;
}

interface Traceability {
  analysisUnit: string;
  formula: { label: string; explanation: string };
  sourceMetricIds: string[];
  filters: FilterState;
  dateRange: DateRange;
  sample: {
    size: number;
    analysisUnit: string;
    denominator?: { value?: number; unit: string; description: string };
  };
  referencePopulation?: {
    label: string;
    sampleSize: number;
    analysisUnit: "merchant";
    method: string;
  };
  missingDataHandling: string;
  assumptions: string[];
  limitations: string[];
  provenance: { datasetId: string; sourceReference: string };
}

export interface Metric {
  metricId: string;
  label: string;
  definition: string;
  value: number | null;
  unit: string;
  analysisUnit: string;
  period: DateRange;
  sampleSize?: number;
  comparison?: {
    referenceLabel: string;
    referenceValue: number | null;
    delta: number | null;
  };
  disclosure?: { code: string; message: string };
  traceability?: Traceability;
  limitations: string[];
}

export interface MerchantSummary {
  merchantId: string;
  displayName: string;
  category?: { id: string; label: string };
  reportingPeriod: DateRange;
  headlineMetrics: Metric[];
  limitations: string[];
}

export interface Evidence {
  evidenceId: string;
  metric: Metric;
  filters: FilterState;
  dateRange: DateRange;
  sample: { size: number; analysisUnit: string };
  formula: { label: string; explanation: string };
  comparedGroups?: Array<{ label: string; sampleSize?: number }>;
  missingDataHandling: string;
  limitations: string[];
  sourceReference?: string;
}

export interface Insight {
  insightId: string;
  merchantId: string;
  title: string;
  observation: string;
  businessImpact: string;
  priority?: string;
  evidence: Evidence[];
  recommendations: Array<{
    recommendationId: string;
    action: string;
    rationale: string;
    caveats: string[];
  }>;
  limitations: string[];
}

export interface ChartSeries {
  seriesId: string;
  label: string;
  metricId: string;
  unit: string;
  analysisUnit: string;
  points: Array<{ x: string | number; y: number | null; sampleSize?: number }>;
  traceability?: Traceability;
  limitations: string[];
}

export interface Segment {
  segmentId: string;
  label: string;
  description: string;
  memberCount: number;
  definingCharacteristics: string[];
  metrics: Metric[];
  limitations: string[];
}

interface Page<T> {
  items: T[];
  totalCount: number;
  nextCursor: string | null;
}

interface PageResponse<T> {
  page: Page<T>;
}

interface ScopedResponse<T> {
  data: T;
}

export interface FilterOptions {
  dateRange: DateRange;
  categories: Array<{ id: string; value: string; label: string }>;
  statuses: Array<{ value: string; label: string }>;
  terminals: Array<{ value: string; label: string }>;
  issuers: Array<{ value: string; label: string }>;
  attemptCountRange: { minimum: number | null; maximum: number | null };
}

export interface MerchantListItem {
  merchantId: string;
  displayName: string;
  category?: { id: string; label: string };
}

const apiBase =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/u, "") ??
  "http://localhost:3000/api/v1";

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${apiBase}${path}`, init);
  if (!response.ok) {
    const message = `API request failed with status ${response.status}`;
    throw new Error(message);
  }
  return (await response.json()) as T;
};

const postQuery = <T>(path: string, filters: FilterState): Promise<T> =>
  fetchJson<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filters, page: { limit: 100 } }),
  });

export function useMerchantBootstrap() {
  const merchants = useQuery({
    queryKey: ["merchant-intelligence", "merchants"],
    queryFn: () =>
      fetchJson<{ page: Page<MerchantListItem> }>("/merchants?limit=100"),
  });
  const filterOptions = useQuery({
    queryKey: ["merchant-intelligence", "filter-options"],
    queryFn: () => fetchJson<ScopedResponse<FilterOptions>>("/filter-options"),
  });
  return { merchants, filterOptions };
}

export function useMerchantIntelligence(
  merchantId: string | null,
  filters: FilterState | null,
) {
  const enabled = merchantId !== null && filters !== null;
  const summary = useQuery({
    queryKey: ["merchant-intelligence", "summary", merchantId, filters],
    enabled,
    queryFn: () =>
      fetchJson<ScopedResponse<MerchantSummary>>(
        `/merchants/${encodeURIComponent(merchantId ?? "")}/summary/query`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ filters }),
        },
      ),
  });
  const insights = useQuery({
    queryKey: ["merchant-intelligence", "insights", filters],
    enabled,
    queryFn: () => postQuery<PageResponse<Insight>>("/insights/query", filters ?? {}),
  });
  const trends = useQuery({
    queryKey: ["merchant-intelligence", "trends", filters],
    enabled,
    queryFn: () => postQuery<PageResponse<ChartSeries>>("/trends/query", filters ?? {}),
  });
  const segments = useQuery({
    queryKey: ["merchant-intelligence", "segments", filters?.dateRange],
    enabled: filters !== null,
    queryFn: () =>
      postQuery<PageResponse<Segment>>("/segments/query", {
        ...(filters?.dateRange === undefined ? {} : { dateRange: filters.dateRange }),
        analysisUnit: "payment_session",
      }),
  });
  return { summary, insights, trends, segments };
}
