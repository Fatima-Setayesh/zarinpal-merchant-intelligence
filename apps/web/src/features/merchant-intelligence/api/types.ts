export type AnalysisUnit = "payment_session" | "payment_attempt";

export interface DateRange {
  from: string;
  to: string;
  timezone: string;
}

export interface FilterDimension {
  key: string;
  operator: "include" | "exclude";
  values: string[];
}

export interface FilterState {
  merchantIds?: string[];
  dateRange?: DateRange;
  segmentIds?: string[];
  analysisUnit?: AnalysisUnit;
  dimensions?: FilterDimension[];
}

export interface AnalysisProvenance {
  datasetId: string;
  sourceReference?: string;
  methodologyReference?: string;
  timezone?: string;
}

export interface DatasetProvenance extends AnalysisProvenance {
  loadedAt: string;
}

export interface Traceability {
  analysisUnit: AnalysisUnit | "merchant";
  formula: {
    label: string;
    explanation: string;
    methodologyReference?: string;
  };
  sourceMetricIds: string[];
  filters: FilterState;
  dateRange: DateRange;
  sample: {
    size: number;
    analysisUnit: AnalysisUnit | "merchant";
    denominator?: { value?: number; unit: string; description: string };
  };
  referencePopulation?: {
    populationId: string;
    label: string;
    sampleSize: number;
    analysisUnit: "merchant";
    method: string;
  };
  missingDataHandling: string;
  assumptions: string[];
  limitations: string[];
  provenance: AnalysisProvenance;
}

export interface Metric {
  metricId: string;
  label: string;
  definition: string;
  value: number | null;
  unit: string;
  analysisUnit: AnalysisUnit;
  period: DateRange;
  sampleSize?: number;
  comparison?: {
    referenceLabel: string;
    referenceValue: number | null;
    delta: number | null;
    population?: {
      populationId: string;
      label: string;
      sampleSize: number;
      analysisUnit: "merchant";
      method: string;
    };
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
  analysisUnit: AnalysisUnit;
  headlineMetrics: Metric[];
  availableInsightCount?: number;
  limitations: string[];
}

export interface Evidence {
  evidenceId: string;
  metric: Metric;
  filters: FilterState;
  dateRange: DateRange;
  sample: { size: number; analysisUnit: AnalysisUnit };
  formula: {
    label: string;
    explanation: string;
    methodologyReference?: string;
  };
  comparedGroups?: Array<{
    groupId: string;
    label: string;
    sampleSize?: number;
  }>;
  missingDataHandling: string;
  limitations: string[];
  sourceReference?: string;
}

export interface Recommendation {
  recommendationId: string;
  action: string;
  rationale: string;
  expectedImpact?: { statement: string; metricId?: string };
  supportingEvidenceIds: string[];
  caveats: string[];
}

export interface Insight {
  insightId: string;
  merchantId: string;
  title: string;
  observation: string;
  businessImpact: string;
  priority?: string;
  evidence: Evidence[];
  recommendations: Recommendation[];
  limitations: string[];
  generatedAt?: string;
}

export interface ChartSeries {
  seriesId: string;
  label: string;
  metricId: string;
  unit: string;
  analysisUnit: AnalysisUnit | "merchant";
  group?: { id: string; label: string };
  points: Array<{
    x: string | number;
    y: number | null;
    sampleSize?: number;
    evidenceId?: string;
  }>;
  traceability?: Traceability;
  limitations: string[];
}

export interface Segment {
  segmentId: string;
  label: string;
  description: string;
  memberCount: number;
  analysisUnit: "merchant";
  definingCharacteristics: string[];
  metrics: Metric[];
  supportingEvidenceIds: string[];
  limitations: string[];
}

export interface Page<T> {
  items: T[];
  totalCount?: number;
  nextCursor: string | null;
}

export interface ScopedResponse<T> {
  data: T;
  appliedFilters: FilterState;
  warnings: string[];
  provenance: DatasetProvenance;
}

export interface PagedResponse<T> {
  page: Page<T>;
  appliedFilters: FilterState;
  warnings: string[];
  provenance: DatasetProvenance;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterOptions {
  dateRange: DateRange;
  categories: Array<FilterOption & { id: string }>;
  statuses: FilterOption[];
  terminals: FilterOption[];
  issuers: FilterOption[];
  amountRange: { minimum: number | null; maximum: number | null };
  attemptCountRange: { minimum: number | null; maximum: number | null };
  analysisUnits: Array<
    FilterOption & {
      supportedEndpoints: Array<"summary" | "insights" | "trends" | "segments">;
    }
  >;
  supportedDimensions: string[];
  optionLimit: number;
  truncated: { categories: boolean; terminals: boolean; issuers: boolean };
}

export interface MerchantListItem {
  merchantId: string;
  displayName: string;
  category?: { id: string; label: string };
}

export interface MerchantListResponse {
  page: Page<MerchantListItem>;
  provenance: DatasetProvenance;
}

export interface FilterOptionsResponse {
  data: FilterOptions;
  warnings: string[];
  provenance: DatasetProvenance;
}
