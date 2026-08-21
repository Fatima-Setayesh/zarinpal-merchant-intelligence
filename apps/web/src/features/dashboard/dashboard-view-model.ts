export type AnalysisUnit =
  "Payment session" | "Payment attempt" | "Merchant" | "Adjusted fee";

export type StatusTone = "positive" | "warning" | "critical" | "neutral";

export interface MerchantMetricView {
  id: string;
  label: string;
  displayValue: string;
  supportingText: string;
  analysisUnit: AnalysisUnit;
  changeLabel?: string;
  tone?: StatusTone;
  traceabilityId: string;
}

export interface InsightEvidenceView {
  label: string;
  displayValue: string;
  comparison: string;
  analysisUnit: AnalysisUnit;
}

export interface InsightView {
  id: string;
  priorityLabel: string;
  priorityTone: StatusTone;
  title: string;
  observation: string;
  evidence: InsightEvidenceView;
  businessImpact: string;
  recommendedAction: string;
  actionLabel: string;
  limitations: string[];
  traceabilityId: string;
}

export interface TraceabilityRecordView {
  id: string;
  claimTitle: string;
  statusLabel: string;
  metricLabel: string;
  metricDefinition: string;
  formulaLabel: string;
  formulaExplanation: string;
  dataSubset: string;
  appliedFilters: string[];
  dateRange: string;
  freshness: string;
  sampleSize: string;
  analysisUnit: AnalysisUnit;
  comparedGroups: string[];
  missingDataHandling: string;
  limitations: string[];
  provenance: string;
}

export interface TrendPointView {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  emphasis?: "change" | "outlier";
  annotation?: string;
}

export interface TrendView {
  title: string;
  takeaway: string;
  unit: string;
  points: TrendPointView[];
  limitations: string[];
  traceabilityId: string;
}

export interface SegmentView {
  id: string;
  label: string;
  description: string;
  badgeLabel: string;
  badgeTone: StatusTone;
  displayValue: string;
  metricLabel: string;
  comparison: string;
  sampleLabel: string;
  limitations: string[];
}

export interface FilterOptionView {
  value: string;
  label: string;
}

export interface FilterOptionsView {
  merchants: FilterOptionView[];
  categories: FilterOptionView[];
  paymentStatuses: FilterOptionView[];
  attemptCounts: FilterOptionView[];
  terminals: FilterOptionView[];
  issuers: FilterOptionView[];
}

export interface MerchantDashboardViewModel {
  isDemo: boolean;
  merchant: {
    displayName: string;
    category: string;
    reportingPeriod: string;
    freshness: string;
    statusLabel: string;
    statusSummary: string;
  };
  decisionBrief: {
    currentStatus: string;
    mainProblem: string;
    opportunity: string;
    firstAction: string;
  };
  metrics: MerchantMetricView[];
  insights: InsightView[];
  traceability: TraceabilityRecordView[];
  trend: TrendView;
  segments: SegmentView[];
  filterOptions: FilterOptionsView;
}
