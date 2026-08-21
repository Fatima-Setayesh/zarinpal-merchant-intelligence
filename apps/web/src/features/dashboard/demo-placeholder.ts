import type { MerchantDashboardViewModel } from "./dashboard-view-model";

/**
 * Presentation-only fixture for the frontend demo. Values are illustrative and
 * must never be treated as merchant analysis or used by production queries.
 */
export const demoDashboard: MerchantDashboardViewModel = {
  isDemo: true,
  merchant: {
    displayName: "Demo merchant workspace",
    category: "Digital services · illustrative scope",
    reportingPeriod: "01–30 Mordad 1405",
    freshness: "Prototype data · not connected to analytics",
    statusLabel: "Attention recommended",
    statusSummary:
      "The prototype prioritizes a retry-friction story so the complete decision experience can be reviewed before API integration.",
  },
  decisionBrief: {
    currentStatus: "Payment completion is stable, with visible retry friction.",
    mainProblem:
      "A concentrated group of failed first attempts requires merchant attention.",
    opportunity:
      "A clearer retry journey could recover otherwise abandoned payment sessions.",
    firstAction:
      "Review the failed-first-attempt experience before changing broader checkout behavior.",
  },
  metrics: [
    {
      id: "payment-volume",
      label: "Payment volume",
      displayValue: "64.8M Toman",
      supportingText: "Illustrative processed volume for the selected period",
      analysisUnit: "Payment session",
      changeLabel: "+8.2% vs comparison period",
      tone: "positive",
      traceabilityId: "trace-volume",
    },
    {
      id: "success-rate",
      label: "Successful sessions",
      displayValue: "91.4%",
      supportingText: "Completed payment sessions, not individual attempts",
      analysisUnit: "Payment session",
      changeLabel: "+1.6 percentage points",
      tone: "positive",
      traceabilityId: "trace-success",
    },
    {
      id: "failed-sessions",
      label: "Failed sessions",
      displayValue: "1,284",
      supportingText:
        "Sessions that did not complete within the defined window",
      analysisUnit: "Payment session",
      changeLabel: "Primary attention area",
      tone: "critical",
      traceabilityId: "trace-failures",
    },
    {
      id: "retry-behavior",
      label: "Retry recovery",
      displayValue: "38.7%",
      supportingText: "Illustrative sessions recovered after another attempt",
      analysisUnit: "Payment attempt",
      changeLabel: "+4.1 percentage points",
      tone: "warning",
      traceabilityId: "trace-retry",
    },
    {
      id: "failure-rate",
      label: "Failed-session rate",
      displayValue: "8.6%",
      supportingText: "Incomplete sessions within the illustrative window",
      analysisUnit: "Payment session",
      changeLabel: "−1.6 percentage points",
      tone: "warning",
      traceabilityId: "trace-failures",
    },
    {
      id: "adjusted-fee",
      label: "Adjusted fee comparison",
      displayValue: "Relative only",
      supportingText:
        "Confidentially transformed; never presented as Zarinpal’s real fee",
      analysisUnit: "Adjusted fee",
      changeLabel: "No absolute pricing claim",
      tone: "neutral",
      traceabilityId: "trace-adjusted-fee",
    },
  ],
  insights: [
    {
      id: "retry-friction",
      priorityLabel: "Highest opportunity",
      priorityTone: "critical",
      title: "Failed first attempts are creating avoidable checkout friction",
      observation:
        "The illustrative view shows a meaningful share of incomplete sessions beginning with a failed first payment attempt.",
      evidence: {
        label: "Sessions with a failed first attempt",
        displayValue: "18.6%",
        comparison: "6.3 pp above the illustrative peer segment",
        analysisUnit: "Payment session",
      },
      businessImpact:
        "These sessions represent customers who reached payment but may leave before trying again.",
      recommendedAction:
        "Start by reviewing error clarity and the retry path for the most common first-attempt failure states.",
      actionLabel: "Review retry journey",
      limitations: [
        "The prototype does not establish causality between the retry experience and abandonment.",
        "Failure-category completeness must be confirmed by the analytical layer.",
      ],
      traceabilityId: "trace-retry",
    },
    {
      id: "issuer-concentration",
      priorityLabel: "Monitor",
      priorityTone: "warning",
      title: "Failure pressure appears concentrated, not evenly distributed",
      observation:
        "The illustrative comparison indicates that a small set of issuer contexts accounts for more failed attempts.",
      evidence: {
        label: "Concentrated failed attempts",
        displayValue: "42.1%",
        comparison: "Across the top three illustrative issuer contexts",
        analysisUnit: "Payment attempt",
      },
      businessImpact:
        "A targeted investigation may be more useful than changing the full checkout experience.",
      recommendedAction:
        "Validate issuer and terminal context before prioritizing a broad merchant-side intervention.",
      actionLabel: "Inspect concentration",
      limitations: [
        "Issuer availability and missingness can change the apparent concentration.",
        "No issuer is ranked as causal in this frontend prototype.",
      ],
      traceabilityId: "trace-failures",
    },
  ],
  traceability: [
    {
      id: "trace-volume",
      claimTitle: "Illustrative payment volume",
      statusLabel: "Demo evidence record",
      metricLabel: "Processed payment volume",
      metricDefinition:
        "Sum supplied by the analytical service for the approved session scope.",
      formulaLabel: "Backend-supplied aggregate",
      formulaExplanation:
        "The frontend formats the served value and does not aggregate payment records.",
      dataSubset: "Selected demo merchant and reporting period",
      appliedFilters: ["Demo merchant", "All payment statuses"],
      dateRange: "01–30 Mordad 1405 · Asia/Tehran",
      freshness: "Prototype fixture · no live source",
      sampleSize: "Unavailable until backend integration",
      analysisUnit: "Payment session",
      comparedGroups: ["Selected period", "Previous comparable period"],
      missingDataHandling: "Awaiting teammate-approved analytical metadata.",
      limitations: [
        "This value is illustrative and is not a verified merchant output.",
      ],
      provenance: "frontend-demo-v1",
    },
    {
      id: "trace-success",
      claimTitle: "Illustrative successful-session rate",
      statusLabel: "Demo evidence record",
      metricLabel: "Successful payment sessions",
      metricDefinition:
        "Share of payment sessions classified as completed by the analytical service.",
      formulaLabel: "Successful sessions ÷ eligible sessions",
      formulaExplanation:
        "The final numerator, denominator, eligibility rules, and value must be served by the backend.",
      dataSubset: "Selected demo merchant and reporting period",
      appliedFilters: ["Demo merchant", "Session-level view"],
      dateRange: "01–30 Mordad 1405 · Asia/Tehran",
      freshness: "Prototype fixture · no live source",
      sampleSize: "8,420 illustrative payment sessions",
      analysisUnit: "Payment session",
      comparedGroups: ["Current period", "Previous comparable period"],
      missingDataHandling:
        "Incomplete status records require teammate-approved handling.",
      limitations: [
        "This prototype value is not an analytical conclusion.",
        "Session eligibility rules are not defined by the frontend.",
      ],
      provenance: "frontend-demo-v1",
    },
    {
      id: "trace-adjusted-fee",
      claimTitle: "Adjusted fee comparison disclosure",
      statusLabel: "Demo evidence record",
      metricLabel: "Confidentially transformed adjusted fee",
      metricDefinition:
        "A transformed field that is not Zarinpal’s real fee and cannot support absolute pricing claims.",
      formulaLabel: "Backend-supplied relative comparison only",
      formulaExplanation:
        "The frontend will display a relative comparison only when the analytical layer explicitly marks it as justified.",
      dataSubset: "Selected demo merchant and reporting period",
      appliedFilters: ["Demo merchant", "Adjusted-fee disclosure required"],
      dateRange: "01–30 Mordad 1405 · Asia/Tehran",
      freshness: "Prototype fixture · no live source",
      sampleSize: "Unavailable until backend integration",
      analysisUnit: "Adjusted fee",
      comparedGroups: ["No approved comparison supplied"],
      missingDataHandling:
        "Missing and transformed-value semantics must come from the analytical layer.",
      limitations: [
        "Adjusted fee is confidentially transformed and is not Zarinpal’s real fee.",
        "Absolute real-pricing claims are prohibited.",
      ],
      provenance: "frontend-demo-v1",
    },
    {
      id: "trace-failures",
      claimTitle: "Illustrative failed-session concentration",
      statusLabel: "Partial demo evidence",
      metricLabel: "Incomplete payment sessions",
      metricDefinition:
        "Sessions classified as not completed within the teammate-defined observation window.",
      formulaLabel: "Backend-defined session classification",
      formulaExplanation:
        "Repeated attempts are grouped by the analytical layer before the frontend receives a result.",
      dataSubset: "Demo merchant · selected terminals and issuer contexts",
      appliedFilters: ["Failed status", "All attempts", "All terminals"],
      dateRange: "01–30 Mordad 1405 · Asia/Tehran",
      freshness: "Prototype fixture · no live source",
      sampleSize: "1,284 illustrative payment sessions",
      analysisUnit: "Payment session",
      comparedGroups: ["Selected merchant", "Illustrative peer segment"],
      missingDataHandling:
        "Issuer and terminal missingness must be supplied by the analytical layer.",
      limitations: [
        "Merchant concentration may limit broad comparison.",
        "The prototype does not claim a controlled or causal comparison.",
      ],
      provenance: "frontend-demo-v1",
    },
    {
      id: "trace-retry",
      claimTitle: "Illustrative retry recovery opportunity",
      statusLabel: "Partial demo evidence",
      metricLabel: "Recovery after another attempt",
      metricDefinition:
        "Share of eligible payment sessions completed after an initial failed attempt.",
      formulaLabel: "Recovered eligible sessions ÷ eligible retry sessions",
      formulaExplanation:
        "Session linking, retry windows, eligibility, and the final ratio are entirely backend-owned.",
      dataSubset:
        "Demo merchant · sessions with more than one eligible attempt",
      appliedFilters: ["Failed first attempt", "Attempt count: 2+"],
      dateRange: "01–30 Mordad 1405 · Asia/Tehran",
      freshness: "Prototype fixture · no live source",
      sampleSize: "486 illustrative payment sessions",
      analysisUnit: "Payment session",
      comparedGroups: ["Recovered after retry", "Not recovered after retry"],
      missingDataHandling:
        "Unlinked or incomplete attempt sequences require backend classification.",
      limitations: [
        "The prototype does not establish that interface changes cause recovery.",
        "The displayed comparison is illustrative until analytically validated.",
      ],
      provenance: "frontend-demo-v1",
    },
  ],
  trend: {
    title: "Payment completion trend",
    takeaway:
      "Completion remains broadly stable; the highlighted interval demonstrates how a backend-flagged change would receive attention.",
    unit: "Successful payment sessions (%)",
    points: [
      { id: "w1", label: "Week 1", value: 89.2, displayValue: "89.2%" },
      { id: "w2", label: "Week 2", value: 90.1, displayValue: "90.1%" },
      {
        id: "w3",
        label: "Week 3",
        value: 87.8,
        displayValue: "87.8%",
        emphasis: "outlier",
        annotation: "Backend-flagged exception preview",
      },
      { id: "w4", label: "Week 4", value: 91.4, displayValue: "91.4%" },
      {
        id: "w5",
        label: "Week 5",
        value: 92.1,
        displayValue: "92.1%",
        emphasis: "change",
        annotation: "Backend-flagged improvement preview",
      },
      { id: "w6", label: "Week 6", value: 91.7, displayValue: "91.7%" },
    ],
    limitations: [
      "Trend values and annotations are frontend demonstration content.",
      "The production chart will render backend-shaped series without deriving trends.",
    ],
    traceabilityId: "trace-success",
  },
  segments: [
    {
      id: "stable",
      label: "Stable completion",
      description:
        "Illustrates how a teammate-defined segment can be explained without exposing its algorithm.",
      badgeLabel: "Reference",
      badgeTone: "positive",
      displayValue: "93.2%",
      metricLabel: "Successful sessions",
      comparison: "Illustrative reference segment",
      sampleLabel: "4,120 payment sessions",
      limitations: ["Segment definition requires teammate approval."],
    },
    {
      id: "retry-sensitive",
      label: "Retry-sensitive",
      description:
        "Demonstrates a segment where additional payment attempts are relevant to the merchant story.",
      badgeLabel: "Opportunity",
      badgeTone: "warning",
      displayValue: "84.7%",
      metricLabel: "Successful sessions",
      comparison: "8.5 pp below the illustrative reference",
      sampleLabel: "1,860 payment sessions",
      limitations: [
        "The frontend does not assign merchants or sessions to segments.",
      ],
    },
    {
      id: "limited-context",
      label: "Limited context",
      description:
        "Shows how a segment with incomplete supporting context remains visibly qualified.",
      badgeLabel: "Use caution",
      badgeTone: "critical",
      displayValue: "—",
      metricLabel: "Comparison unavailable",
      comparison: "Additional context required",
      sampleLabel: "Sample not supplied",
      limitations: ["Required evidence is incomplete in this prototype."],
    },
  ],
  filterOptions: {
    merchants: [
      { value: "demo-merchant", label: "Demo merchant workspace" },
      { value: "all", label: "All supported merchants" },
    ],
    categories: [
      { value: "digital-services", label: "Digital services" },
      { value: "retail", label: "Retail" },
      { value: "marketplace", label: "Marketplace" },
    ],
    paymentStatuses: [
      { value: "all", label: "All statuses" },
      { value: "success", label: "Successful" },
      { value: "failed", label: "Failed" },
    ],
    attemptCounts: [
      { value: "all", label: "Any attempt count" },
      { value: "1", label: "One attempt" },
      { value: "2-plus", label: "Two or more attempts" },
    ],
    terminals: [
      { value: "all", label: "All terminals" },
      { value: "web-demo", label: "Web terminal · demo" },
      { value: "mobile-demo", label: "Mobile terminal · demo" },
    ],
    issuers: [
      { value: "all", label: "All issuers" },
      { value: "issuer-a", label: "Issuer group A · demo" },
      { value: "issuer-b", label: "Issuer group B · demo" },
    ],
  },
};
