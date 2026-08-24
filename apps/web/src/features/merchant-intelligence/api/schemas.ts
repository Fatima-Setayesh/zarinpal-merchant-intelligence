import type {
  AnalysisUnit,
  AnalysisProvenance,
  ChartSeries,
  DatasetProvenance,
  DateRange,
  Evidence,
  FilterDimension,
  FilterOptions,
  FilterOptionsResponse,
  FilterState,
  Insight,
  MerchantListItem,
  MerchantListResponse,
  MerchantSummary,
  Metric,
  Page,
  PagedResponse,
  Recommendation,
  ScopedResponse,
  Segment,
  Traceability,
} from "./types";

type UnknownRecord = Record<string, unknown>;

export class SchemaValidationError extends Error {
  readonly path: string;

  constructor(path: string, expectation: string) {
    super(`Invalid API response at ${path}: expected ${expectation}.`);
    this.name = "SchemaValidationError";
    this.path = path;
  }
}

const record = (value: unknown, path: string): UnknownRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SchemaValidationError(path, "object");
  }
  return value as UnknownRecord;
};

const string = (value: unknown, path: string): string => {
  if (typeof value !== "string") {
    throw new SchemaValidationError(path, "string");
  }
  return value;
};

const nonEmptyString = (value: unknown, path: string): string => {
  const parsed = string(value, path);
  if (parsed.trim().length === 0) {
    throw new SchemaValidationError(path, "non-empty string");
  }
  return parsed;
};

const finiteNumber = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SchemaValidationError(path, "finite number");
  }
  return value;
};

const nonNegativeInteger = (value: unknown, path: string): number => {
  const parsed = finiteNumber(value, path);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new SchemaValidationError(path, "non-negative safe integer");
  }
  return parsed;
};

const boolean = (value: unknown, path: string): boolean => {
  if (typeof value !== "boolean") {
    throw new SchemaValidationError(path, "boolean");
  }
  return value;
};

const nullableNumber = (value: unknown, path: string): number | null =>
  value === null ? null : finiteNumber(value, path);

const optional = <T>(
  value: unknown,
  path: string,
  parser: (item: unknown, itemPath: string) => T,
): T | undefined => (value === undefined ? undefined : parser(value, path));

const array = <T>(
  value: unknown,
  path: string,
  parser: (item: unknown, itemPath: string) => T,
): T[] => {
  if (!Array.isArray(value)) {
    throw new SchemaValidationError(path, "array");
  }
  return value.map((item, index) => parser(item, `${path}[${index}]`));
};

const stringArray = (value: unknown, path: string): string[] =>
  array(value, path, nonEmptyString);

const enumValue = <Value extends string>(
  value: unknown,
  path: string,
  allowed: readonly Value[],
): Value => {
  if (typeof value !== "string" || !allowed.includes(value as Value)) {
    throw new SchemaValidationError(path, allowed.join(" | "));
  }
  return value as Value;
};

const analysisUnit = (value: unknown, path: string): AnalysisUnit =>
  enumValue(value, path, ["payment_session", "payment_attempt"] as const);

const traceAnalysisUnit = (
  value: unknown,
  path: string,
): AnalysisUnit | "merchant" =>
  enumValue(value, path, [
    "payment_session",
    "payment_attempt",
    "merchant",
  ] as const);

const dateRange = (value: unknown, path: string): DateRange => {
  const source = record(value, path);
  const from = nonEmptyString(source.from, `${path}.from`);
  const to = nonEmptyString(source.to, `${path}.to`);
  const timezone = nonEmptyString(source.timezone, `${path}.timezone`);
  if (Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
    throw new SchemaValidationError(path, "valid date range");
  }
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
  } catch {
    throw new SchemaValidationError(
      `${path}.timezone`,
      "supported IANA timezone",
    );
  }
  return { from, to, timezone };
};

const filterDimension = (value: unknown, path: string): FilterDimension => {
  const source = record(value, path);
  return {
    key: nonEmptyString(source.key, `${path}.key`),
    operator: enumValue(source.operator, `${path}.operator`, [
      "include",
      "exclude",
    ]),
    values: stringArray(source.values, `${path}.values`),
  };
};

const filterState = (value: unknown, path: string): FilterState => {
  const source = record(value, path);
  const merchantIds = optional(
    source.merchantIds,
    `${path}.merchantIds`,
    stringArray,
  );
  const parsedDateRange = optional(
    source.dateRange,
    `${path}.dateRange`,
    dateRange,
  );
  const segmentIds = optional(
    source.segmentIds,
    `${path}.segmentIds`,
    stringArray,
  );
  const parsedAnalysisUnit = optional(
    source.analysisUnit,
    `${path}.analysisUnit`,
    analysisUnit,
  );
  const dimensions = optional(
    source.dimensions,
    `${path}.dimensions`,
    (item, itemPath) => array(item, itemPath, filterDimension),
  );
  return {
    ...(merchantIds === undefined ? {} : { merchantIds }),
    ...(parsedDateRange === undefined ? {} : { dateRange: parsedDateRange }),
    ...(segmentIds === undefined ? {} : { segmentIds }),
    ...(parsedAnalysisUnit === undefined
      ? {}
      : { analysisUnit: parsedAnalysisUnit }),
    ...(dimensions === undefined ? {} : { dimensions }),
  };
};

const analysisProvenance = (
  value: unknown,
  path: string,
): AnalysisProvenance => {
  const source = record(value, path);
  const sourceReference = optional(
    source.sourceReference,
    `${path}.sourceReference`,
    nonEmptyString,
  );
  const methodologyReference = optional(
    source.methodologyReference,
    `${path}.methodologyReference`,
    nonEmptyString,
  );
  const timezone = optional(
    source.timezone,
    `${path}.timezone`,
    nonEmptyString,
  );
  return {
    datasetId: nonEmptyString(source.datasetId, `${path}.datasetId`),
    ...(sourceReference === undefined ? {} : { sourceReference }),
    ...(methodologyReference === undefined ? {} : { methodologyReference }),
    ...(timezone === undefined ? {} : { timezone }),
  };
};

const provenance = (value: unknown, path: string): DatasetProvenance => {
  const source = record(value, path);
  return {
    ...analysisProvenance(source, path),
    loadedAt: nonEmptyString(source.loadedAt, `${path}.loadedAt`),
  };
};

const traceability = (value: unknown, path: string): Traceability => {
  const source = record(value, path);
  const formulaSource = record(source.formula, `${path}.formula`);
  const sampleSource = record(source.sample, `${path}.sample`);
  const denominatorSource = optional(
    sampleSource.denominator,
    `${path}.sample.denominator`,
    record,
  );
  const referenceSource = optional(
    source.referencePopulation,
    `${path}.referencePopulation`,
    record,
  );
  const methodReference = optional(
    formulaSource.methodologyReference,
    `${path}.formula.methodologyReference`,
    nonEmptyString,
  );
  return {
    analysisUnit: traceAnalysisUnit(
      source.analysisUnit,
      `${path}.analysisUnit`,
    ),
    formula: {
      label: nonEmptyString(formulaSource.label, `${path}.formula.label`),
      explanation: nonEmptyString(
        formulaSource.explanation,
        `${path}.formula.explanation`,
      ),
      ...(methodReference === undefined
        ? {}
        : { methodologyReference: methodReference }),
    },
    sourceMetricIds: stringArray(
      source.sourceMetricIds,
      `${path}.sourceMetricIds`,
    ),
    filters: filterState(source.filters, `${path}.filters`),
    dateRange: dateRange(source.dateRange, `${path}.dateRange`),
    sample: {
      size: nonNegativeInteger(sampleSource.size, `${path}.sample.size`),
      analysisUnit: traceAnalysisUnit(
        sampleSource.analysisUnit,
        `${path}.sample.analysisUnit`,
      ),
      ...(denominatorSource === undefined
        ? {}
        : {
            denominator: {
              ...(denominatorSource.value === undefined
                ? {}
                : {
                    value: nonNegativeInteger(
                      denominatorSource.value,
                      `${path}.sample.denominator.value`,
                    ),
                  }),
              unit: nonEmptyString(
                denominatorSource.unit,
                `${path}.sample.denominator.unit`,
              ),
              description: nonEmptyString(
                denominatorSource.description,
                `${path}.sample.denominator.description`,
              ),
            },
          }),
    },
    ...(referenceSource === undefined
      ? {}
      : {
          referencePopulation: {
            populationId: nonEmptyString(
              referenceSource.populationId,
              `${path}.referencePopulation.populationId`,
            ),
            label: nonEmptyString(
              referenceSource.label,
              `${path}.referencePopulation.label`,
            ),
            sampleSize: nonNegativeInteger(
              referenceSource.sampleSize,
              `${path}.referencePopulation.sampleSize`,
            ),
            analysisUnit: enumValue(
              referenceSource.analysisUnit,
              `${path}.referencePopulation.analysisUnit`,
              ["merchant"] as const,
            ),
            method: nonEmptyString(
              referenceSource.method,
              `${path}.referencePopulation.method`,
            ),
          },
        }),
    missingDataHandling: nonEmptyString(
      source.missingDataHandling,
      `${path}.missingDataHandling`,
    ),
    assumptions: stringArray(source.assumptions, `${path}.assumptions`),
    limitations: stringArray(source.limitations, `${path}.limitations`),
    provenance: analysisProvenance(source.provenance, `${path}.provenance`),
  };
};

const metric = (value: unknown, path: string): Metric => {
  const source = record(value, path);
  const comparisonSource = optional(
    source.comparison,
    `${path}.comparison`,
    record,
  );
  const populationSource = comparisonSource
    ? optional(
        comparisonSource.population,
        `${path}.comparison.population`,
        record,
      )
    : undefined;
  const disclosureSource = optional(
    source.disclosure,
    `${path}.disclosure`,
    record,
  );
  const parsedTraceability = optional(
    source.traceability,
    `${path}.traceability`,
    traceability,
  );
  const sampleSize = optional(
    source.sampleSize,
    `${path}.sampleSize`,
    nonNegativeInteger,
  );
  return {
    metricId: nonEmptyString(source.metricId, `${path}.metricId`),
    label: nonEmptyString(source.label, `${path}.label`),
    definition: nonEmptyString(source.definition, `${path}.definition`),
    value: nullableNumber(source.value, `${path}.value`),
    unit: nonEmptyString(source.unit, `${path}.unit`),
    analysisUnit: analysisUnit(source.analysisUnit, `${path}.analysisUnit`),
    period: dateRange(source.period, `${path}.period`),
    ...(sampleSize === undefined ? {} : { sampleSize }),
    ...(comparisonSource === undefined
      ? {}
      : {
          comparison: {
            referenceLabel: nonEmptyString(
              comparisonSource.referenceLabel,
              `${path}.comparison.referenceLabel`,
            ),
            referenceValue: nullableNumber(
              comparisonSource.referenceValue,
              `${path}.comparison.referenceValue`,
            ),
            delta: nullableNumber(
              comparisonSource.delta,
              `${path}.comparison.delta`,
            ),
            ...(populationSource === undefined
              ? {}
              : {
                  population: {
                    populationId: nonEmptyString(
                      populationSource.populationId,
                      `${path}.comparison.population.populationId`,
                    ),
                    label: nonEmptyString(
                      populationSource.label,
                      `${path}.comparison.population.label`,
                    ),
                    sampleSize: nonNegativeInteger(
                      populationSource.sampleSize,
                      `${path}.comparison.population.sampleSize`,
                    ),
                    analysisUnit: enumValue(
                      populationSource.analysisUnit,
                      `${path}.comparison.population.analysisUnit`,
                      ["merchant"] as const,
                    ),
                    method: nonEmptyString(
                      populationSource.method,
                      `${path}.comparison.population.method`,
                    ),
                  },
                }),
          },
        }),
    ...(disclosureSource === undefined
      ? {}
      : {
          disclosure: {
            code: nonEmptyString(
              disclosureSource.code,
              `${path}.disclosure.code`,
            ),
            message: nonEmptyString(
              disclosureSource.message,
              `${path}.disclosure.message`,
            ),
          },
        }),
    ...(parsedTraceability === undefined
      ? {}
      : { traceability: parsedTraceability }),
    limitations: stringArray(source.limitations, `${path}.limitations`),
  };
};

const evidence = (value: unknown, path: string): Evidence => {
  const source = record(value, path);
  const sampleSource = record(source.sample, `${path}.sample`);
  const formulaSource = record(source.formula, `${path}.formula`);
  const comparedGroups = optional(
    source.comparedGroups,
    `${path}.comparedGroups`,
    (item, itemPath) =>
      array(item, itemPath, (group, groupPath) => {
        const groupSource = record(group, groupPath);
        const sampleSize = optional(
          groupSource.sampleSize,
          `${groupPath}.sampleSize`,
          nonNegativeInteger,
        );
        return {
          groupId: nonEmptyString(groupSource.groupId, `${groupPath}.groupId`),
          label: nonEmptyString(groupSource.label, `${groupPath}.label`),
          ...(sampleSize === undefined ? {} : { sampleSize }),
        };
      }),
  );
  const methodReference = optional(
    formulaSource.methodologyReference,
    `${path}.formula.methodologyReference`,
    nonEmptyString,
  );
  const sourceReference = optional(
    source.sourceReference,
    `${path}.sourceReference`,
    nonEmptyString,
  );
  return {
    evidenceId: nonEmptyString(source.evidenceId, `${path}.evidenceId`),
    metric: metric(source.metric, `${path}.metric`),
    filters: filterState(source.filters, `${path}.filters`),
    dateRange: dateRange(source.dateRange, `${path}.dateRange`),
    sample: {
      size: nonNegativeInteger(sampleSource.size, `${path}.sample.size`),
      analysisUnit: analysisUnit(
        sampleSource.analysisUnit,
        `${path}.sample.analysisUnit`,
      ),
    },
    formula: {
      label: nonEmptyString(formulaSource.label, `${path}.formula.label`),
      explanation: nonEmptyString(
        formulaSource.explanation,
        `${path}.formula.explanation`,
      ),
      ...(methodReference === undefined
        ? {}
        : { methodologyReference: methodReference }),
    },
    ...(comparedGroups === undefined ? {} : { comparedGroups }),
    missingDataHandling: nonEmptyString(
      source.missingDataHandling,
      `${path}.missingDataHandling`,
    ),
    limitations: stringArray(source.limitations, `${path}.limitations`),
    ...(sourceReference === undefined ? {} : { sourceReference }),
  };
};

const recommendation = (value: unknown, path: string): Recommendation => {
  const source = record(value, path);
  const impactSource = optional(
    source.expectedImpact,
    `${path}.expectedImpact`,
    record,
  );
  const metricId = impactSource
    ? optional(
        impactSource.metricId,
        `${path}.expectedImpact.metricId`,
        nonEmptyString,
      )
    : undefined;
  return {
    recommendationId: nonEmptyString(
      source.recommendationId,
      `${path}.recommendationId`,
    ),
    action: nonEmptyString(source.action, `${path}.action`),
    rationale: nonEmptyString(source.rationale, `${path}.rationale`),
    ...(impactSource === undefined
      ? {}
      : {
          expectedImpact: {
            statement: nonEmptyString(
              impactSource.statement,
              `${path}.expectedImpact.statement`,
            ),
            ...(metricId === undefined ? {} : { metricId }),
          },
        }),
    supportingEvidenceIds: stringArray(
      source.supportingEvidenceIds,
      `${path}.supportingEvidenceIds`,
    ),
    caveats: stringArray(source.caveats, `${path}.caveats`),
  };
};

const insight = (value: unknown, path: string): Insight => {
  const source = record(value, path);
  const priority = optional(
    source.priority,
    `${path}.priority`,
    nonEmptyString,
  );
  const generatedAt = optional(
    source.generatedAt,
    `${path}.generatedAt`,
    nonEmptyString,
  );
  return {
    insightId: nonEmptyString(source.insightId, `${path}.insightId`),
    merchantId: nonEmptyString(source.merchantId, `${path}.merchantId`),
    title: nonEmptyString(source.title, `${path}.title`),
    observation: nonEmptyString(source.observation, `${path}.observation`),
    businessImpact: nonEmptyString(
      source.businessImpact,
      `${path}.businessImpact`,
    ),
    ...(priority === undefined ? {} : { priority }),
    evidence: array(source.evidence, `${path}.evidence`, evidence),
    recommendations: array(
      source.recommendations,
      `${path}.recommendations`,
      recommendation,
    ),
    limitations: stringArray(source.limitations, `${path}.limitations`),
    ...(generatedAt === undefined ? {} : { generatedAt }),
  };
};

const merchantSummary = (value: unknown, path: string): MerchantSummary => {
  const source = record(value, path);
  const categorySource = optional(source.category, `${path}.category`, record);
  const insightCount = optional(
    source.availableInsightCount,
    `${path}.availableInsightCount`,
    nonNegativeInteger,
  );
  return {
    merchantId: nonEmptyString(source.merchantId, `${path}.merchantId`),
    displayName: nonEmptyString(source.displayName, `${path}.displayName`),
    ...(categorySource === undefined
      ? {}
      : {
          category: {
            id: nonEmptyString(categorySource.id, `${path}.category.id`),
            label: nonEmptyString(
              categorySource.label,
              `${path}.category.label`,
            ),
          },
        }),
    reportingPeriod: dateRange(
      source.reportingPeriod,
      `${path}.reportingPeriod`,
    ),
    analysisUnit: analysisUnit(source.analysisUnit, `${path}.analysisUnit`),
    headlineMetrics: array(
      source.headlineMetrics,
      `${path}.headlineMetrics`,
      metric,
    ),
    ...(insightCount === undefined
      ? {}
      : { availableInsightCount: insightCount }),
    limitations: stringArray(source.limitations, `${path}.limitations`),
  };
};

const chartSeries = (value: unknown, path: string): ChartSeries => {
  const source = record(value, path);
  const groupSource = optional(source.group, `${path}.group`, record);
  const parsedTraceability = optional(
    source.traceability,
    `${path}.traceability`,
    traceability,
  );
  return {
    seriesId: nonEmptyString(source.seriesId, `${path}.seriesId`),
    label: nonEmptyString(source.label, `${path}.label`),
    metricId: nonEmptyString(source.metricId, `${path}.metricId`),
    unit: nonEmptyString(source.unit, `${path}.unit`),
    analysisUnit: traceAnalysisUnit(
      source.analysisUnit,
      `${path}.analysisUnit`,
    ),
    ...(groupSource === undefined
      ? {}
      : {
          group: {
            id: nonEmptyString(groupSource.id, `${path}.group.id`),
            label: nonEmptyString(groupSource.label, `${path}.group.label`),
          },
        }),
    points: array(source.points, `${path}.points`, (point, pointPath) => {
      const pointSource = record(point, pointPath);
      if (
        typeof pointSource.x !== "string" &&
        typeof pointSource.x !== "number"
      ) {
        throw new SchemaValidationError(`${pointPath}.x`, "string or number");
      }
      const sampleSize = optional(
        pointSource.sampleSize,
        `${pointPath}.sampleSize`,
        nonNegativeInteger,
      );
      const evidenceId = optional(
        pointSource.evidenceId,
        `${pointPath}.evidenceId`,
        nonEmptyString,
      );
      return {
        x: pointSource.x,
        y: nullableNumber(pointSource.y, `${pointPath}.y`),
        ...(sampleSize === undefined ? {} : { sampleSize }),
        ...(evidenceId === undefined ? {} : { evidenceId }),
      };
    }),
    ...(parsedTraceability === undefined
      ? {}
      : { traceability: parsedTraceability }),
    limitations: stringArray(source.limitations, `${path}.limitations`),
  };
};

const segment = (value: unknown, path: string): Segment => {
  const source = record(value, path);
  return {
    segmentId: nonEmptyString(source.segmentId, `${path}.segmentId`),
    label: nonEmptyString(source.label, `${path}.label`),
    description: nonEmptyString(source.description, `${path}.description`),
    memberCount: nonNegativeInteger(source.memberCount, `${path}.memberCount`),
    analysisUnit: enumValue(source.analysisUnit, `${path}.analysisUnit`, [
      "merchant",
    ]),
    definingCharacteristics: stringArray(
      source.definingCharacteristics,
      `${path}.definingCharacteristics`,
    ),
    metrics: array(source.metrics, `${path}.metrics`, metric),
    supportingEvidenceIds: stringArray(
      source.supportingEvidenceIds,
      `${path}.supportingEvidenceIds`,
    ),
    limitations: stringArray(source.limitations, `${path}.limitations`),
  };
};

const page = <T>(
  value: unknown,
  path: string,
  parser: (item: unknown, itemPath: string) => T,
): Page<T> => {
  const source = record(value, path);
  const totalCount = optional(
    source.totalCount,
    `${path}.totalCount`,
    nonNegativeInteger,
  );
  const nextCursor =
    source.nextCursor === null
      ? null
      : nonEmptyString(source.nextCursor, `${path}.nextCursor`);
  return {
    items: array(source.items, `${path}.items`, parser),
    nextCursor,
    ...(totalCount === undefined ? {} : { totalCount }),
  };
};

const scopedResponse = <T>(
  value: unknown,
  parser: (item: unknown, itemPath: string) => T,
): ScopedResponse<T> => {
  const source = record(value, "$response");
  return {
    data: parser(source.data, "$response.data"),
    appliedFilters: filterState(
      source.appliedFilters,
      "$response.appliedFilters",
    ),
    warnings: stringArray(source.warnings, "$response.warnings"),
    provenance: provenance(source.provenance, "$response.provenance"),
  };
};

const pagedResponse = <T>(
  value: unknown,
  parser: (item: unknown, itemPath: string) => T,
): PagedResponse<T> => {
  const source = record(value, "$response");
  return {
    page: page(source.page, "$response.page", parser),
    appliedFilters: filterState(
      source.appliedFilters,
      "$response.appliedFilters",
    ),
    warnings: stringArray(source.warnings, "$response.warnings"),
    provenance: provenance(source.provenance, "$response.provenance"),
  };
};

const filterOption = (
  value: unknown,
  path: string,
): { value: string; label: string } => {
  const source = record(value, path);
  return {
    value: nonEmptyString(source.value, `${path}.value`),
    label: nonEmptyString(source.label, `${path}.label`),
  };
};

const nullableRange = (
  value: unknown,
  path: string,
): { minimum: number | null; maximum: number | null } => {
  const source = record(value, path);
  return {
    minimum: nullableNumber(source.minimum, `${path}.minimum`),
    maximum: nullableNumber(source.maximum, `${path}.maximum`),
  };
};

const filterOptions = (value: unknown, path: string): FilterOptions => {
  const source = record(value, path);
  const truncatedSource = record(source.truncated, `${path}.truncated`);
  return {
    dateRange: dateRange(source.dateRange, `${path}.dateRange`),
    categories: array(
      source.categories,
      `${path}.categories`,
      (item, itemPath) => {
        const parsed = filterOption(item, itemPath);
        const itemSource = record(item, itemPath);
        return {
          ...parsed,
          id: nonEmptyString(itemSource.id, `${itemPath}.id`),
        };
      },
    ),
    statuses: array(source.statuses, `${path}.statuses`, filterOption),
    terminals: array(source.terminals, `${path}.terminals`, filterOption),
    issuers: array(source.issuers, `${path}.issuers`, filterOption),
    amountRange: nullableRange(source.amountRange, `${path}.amountRange`),
    attemptCountRange: nullableRange(
      source.attemptCountRange,
      `${path}.attemptCountRange`,
    ),
    analysisUnits: array(
      source.analysisUnits,
      `${path}.analysisUnits`,
      (item, itemPath) => {
        const parsed = filterOption(item, itemPath);
        const itemSource = record(item, itemPath);
        return {
          ...parsed,
          supportedEndpoints: array(
            itemSource.supportedEndpoints,
            `${itemPath}.supportedEndpoints`,
            (endpoint, endpointPath) =>
              enumValue(endpoint, endpointPath, [
                "summary",
                "insights",
                "trends",
                "segments",
              ]),
          ),
        };
      },
    ),
    supportedDimensions: stringArray(
      source.supportedDimensions,
      `${path}.supportedDimensions`,
    ),
    optionLimit: nonNegativeInteger(source.optionLimit, `${path}.optionLimit`),
    truncated: {
      categories: boolean(
        truncatedSource.categories,
        `${path}.truncated.categories`,
      ),
      terminals: boolean(
        truncatedSource.terminals,
        `${path}.truncated.terminals`,
      ),
      issuers: boolean(truncatedSource.issuers, `${path}.truncated.issuers`),
    },
  };
};

const merchantListItem = (value: unknown, path: string): MerchantListItem => {
  const source = record(value, path);
  const categorySource = optional(source.category, `${path}.category`, record);
  return {
    merchantId: nonEmptyString(source.merchantId, `${path}.merchantId`),
    displayName: nonEmptyString(source.displayName, `${path}.displayName`),
    ...(categorySource === undefined
      ? {}
      : {
          category: {
            id: nonEmptyString(categorySource.id, `${path}.category.id`),
            label: nonEmptyString(
              categorySource.label,
              `${path}.category.label`,
            ),
          },
        }),
  };
};

export const parseMerchantListResponse = (
  value: unknown,
): MerchantListResponse => {
  const source = record(value, "$response");
  return {
    page: page(source.page, "$response.page", merchantListItem),
    provenance: provenance(source.provenance, "$response.provenance"),
  };
};

export const parseFilterOptionsResponse = (
  value: unknown,
): FilterOptionsResponse => {
  const source = record(value, "$response");
  return {
    data: filterOptions(source.data, "$response.data"),
    warnings: stringArray(source.warnings, "$response.warnings"),
    provenance: provenance(source.provenance, "$response.provenance"),
  };
};

export const parseMerchantSummaryResponse = (
  value: unknown,
): ScopedResponse<MerchantSummary> => scopedResponse(value, merchantSummary);

export const parseInsightsResponse = (value: unknown): PagedResponse<Insight> =>
  pagedResponse(value, insight);

export const parseTrendsResponse = (
  value: unknown,
): PagedResponse<ChartSeries> => pagedResponse(value, chartSeries);

export const parseSegmentsResponse = (value: unknown): PagedResponse<Segment> =>
  pagedResponse(value, segment);

export interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Readonly<Record<string, unknown>>;
  };
  requestId: string;
}

export const tryParseErrorEnvelope = (value: unknown): ErrorEnvelope | null => {
  try {
    const source = record(value, "$errorResponse");
    const errorSource = record(source.error, "$errorResponse.error");
    const details = optional(
      errorSource.details,
      "$errorResponse.error.details",
      record,
    );
    return {
      error: {
        code: nonEmptyString(errorSource.code, "$errorResponse.error.code"),
        message: nonEmptyString(
          errorSource.message,
          "$errorResponse.error.message",
        ),
        ...(details === undefined ? {} : { details }),
      },
      requestId: nonEmptyString(source.requestId, "$errorResponse.requestId"),
    };
  } catch {
    return null;
  }
};
