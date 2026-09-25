import {
  ColumnAnalysis,
  ColumnRole,
  DatasetAnalysis,
  VisualizationType
} from './types';
import {
  formatCellValue,
  formatColumnLabel,
  formatNumber,
  isCurrencyColumn,
  isPercentageColumn
} from './formatters';

const ID_REGEX = /(^id$|_id$|uuid$|guid$|identifier$)/i;
const DATE_REGEX_NAME = /(date|time|timestamp|month|year|day|created_at|period|quarter)/i;
const ISO_DATE_REGEX_VAL = /^\d{4}[-/.]\d{2}([-/.]\d{2})?/;
const NUMERIC_METRIC_NAME = /(count|total|sum|avg|average|mean|fee|amount|price|cost|salary|score|rate|qty|quantity|num_)/i;

export function analyzeDataset(
  rows: Record<string, any>[],
  columns: string[],
  question: string = ''
): DatasetAnalysis {
  if (!rows || rows.length === 0 || !columns || columns.length === 0) {
    return {
      rowCount: 0,
      columns: [],
      recommendedType: 'no-data',
      availableTypes: ['no-data'],
      summary: 'No results to visualize'
    };
  }

  // 1. Analyze each column
  const columnAnalyses: ColumnAnalysis[] = columns.map((colName) => {
    const colLower = colName.toLowerCase();
    const nonNullValues = rows
      .map((r) => r[colName])
      .filter((v) => v !== null && v !== undefined && v !== '');

    const nullCount = rows.length - nonNullValues.length;
    const distinctSet = new Set(nonNullValues.map((v) => String(v)));
    const distinctCount = distinctSet.size;

    const isPrimaryKeyOrId = ID_REGEX.test(colLower);
    const isCurrency = isCurrencyColumn(colLower);
    const isPercentage = isPercentageColumn(colLower);

    let role: ColumnRole = 'unknown';

    // Numeric check
    const numericValues = nonNullValues.filter(
      (v) => typeof v === 'number' || (!isNaN(Number(v)) && typeof v !== 'boolean')
    );
    const isMostlyNumeric = nonNullValues.length > 0 && numericValues.length / nonNullValues.length > 0.8;

    // Date check
    const isDateName = DATE_REGEX_NAME.test(colLower);
    const isDateVal = nonNullValues.length > 0 && nonNullValues.every((v) => ISO_DATE_REGEX_VAL.test(String(v)));

    if (isDateName || isDateVal) {
      role = 'date';
    } else if (isPrimaryKeyOrId) {
      role = 'id';
    } else if (isMostlyNumeric) {
      // If it's a numeric column named like count, fee, total or numeric values
      if (NUMERIC_METRIC_NAME.test(colLower) || distinctCount > 1 || !isPrimaryKeyOrId) {
        role = 'numeric';
      } else {
        role = 'id';
      }
    } else {
      role = 'category';
    }

    return {
      name: colName,
      role,
      type: isMostlyNumeric ? 'number' : isDateName || isDateVal ? 'date' : 'string',
      sampleValues: nonNullValues.slice(0, 5),
      nullCount,
      distinctCount,
      isPrimaryKeyOrId,
      isCurrency,
      isPercentage
    };
  });

  // 2. Identify primary columns for visualization
  let primaryNumericCol = columnAnalyses.find(
    (c) => c.role === 'numeric' && !c.isPrimaryKeyOrId
  );
  // Fallback to any numeric column if none matched metric keywords
  if (!primaryNumericCol) {
    primaryNumericCol = columnAnalyses.find(
      (c) => c.type === 'number' && !c.isPrimaryKeyOrId
    );
  }

  let primaryDateCol = columnAnalyses.find((c) => c.role === 'date');

  let primaryCategoryCol = columnAnalyses.find(
    (c) => (c.role === 'category' || c.role === 'date') && !c.isPrimaryKeyOrId
  );

  // If no category column found, check for string columns or even ID if it's the only text column
  if (!primaryCategoryCol) {
    primaryCategoryCol = columnAnalyses.find((c) => c.type === 'string');
  }

  // 3. Determine Visualization Recommendation
  let recommendedType: VisualizationType = 'table-only';
  const availableTypes: VisualizationType[] = [];

  // Case A: 1 row with 1-2 aggregate columns (Single Metric KPI)
  if (rows.length === 1 && (primaryNumericCol || columns.length <= 2)) {
    recommendedType = 'kpi';
    availableTypes.push('kpi', 'table-only');
  }
  // Case B: Date column + Numeric metric (Time-series)
  else if (primaryDateCol && primaryNumericCol) {
    recommendedType = 'line';
    availableTypes.push('line', 'bar', 'horizontal-bar', 'table-only');
  }
  // Case C: Small category set (2-6 rows) with Category + Numeric metric
  else if (primaryCategoryCol && primaryNumericCol && rows.length >= 2 && rows.length <= 6) {
    recommendedType = 'donut';
    availableTypes.push('donut', 'bar', 'horizontal-bar', 'table-only');
  }
  // Case D: Ranking / Category + Numeric (> 6 rows or long labels)
  else if (primaryCategoryCol && primaryNumericCol && rows.length > 6) {
    const hasLongLabels = rows.some((r) => String(r[primaryCategoryCol!.name] || '').length > 12);
    recommendedType = hasLongLabels ? 'horizontal-bar' : 'bar';
    availableTypes.push('bar', 'horizontal-bar', 'line', 'table-only');
  }
  // Case E: Standard Category + Numeric (2-6 rows, vertical bar)
  else if (primaryCategoryCol && primaryNumericCol) {
    recommendedType = 'bar';
    availableTypes.push('bar', 'horizontal-bar', 'donut', 'table-only');
  }
  // Case F: Distribution of single numeric column without category (> 8 rows)
  else if (primaryNumericCol && rows.length >= 8 && !primaryCategoryCol) {
    recommendedType = 'histogram';
    availableTypes.push('histogram', 'bar', 'table-only');
  }
  // Case G: Raw record list
  else {
    recommendedType = 'table-only';
    availableTypes.push('table-only');
  }

  // 4. Build Dynamic Data-Driven Summary
  const summary = generateDataDrivenSummary(
    rows,
    columnAnalyses,
    primaryCategoryCol,
    primaryNumericCol,
    primaryDateCol
  );

  // Build KPI data structure if KPI card is active
  let kpiData: DatasetAnalysis['kpiData'];
  if (recommendedType === 'kpi' || rows.length === 1) {
    const metricCol = primaryNumericCol || columnAnalyses[0];
    const rawVal = rows[0][metricCol.name];
    const numVal = Number(rawVal);
    const formatted = !isNaN(numVal)
      ? formatNumber(numVal, metricCol.isCurrency, metricCol.isPercentage)
      : String(rawVal);

    kpiData = {
      label: formatColumnLabel(metricCol.name),
      value: formatted,
      colName: metricCol.name,
      subtext: `Single aggregate value from ${rows.length} row query`
    };
  }

  return {
    rowCount: rows.length,
    columns: columnAnalyses,
    primaryCategoryCol,
    primaryNumericCol,
    primaryDateCol,
    recommendedType,
    availableTypes,
    summary,
    kpiData
  };
}

/**
 * Generates a strictly data-supported natural language summary.
 */
function generateDataDrivenSummary(
  rows: Record<string, any>[],
  cols: ColumnAnalysis[],
  catCol?: ColumnAnalysis,
  numCol?: ColumnAnalysis,
  dateCol?: ColumnAnalysis
): string {
  const rowCount = rows.length;

  if (rowCount === 0) {
    return 'No records returned from the database.';
  }

  // 1-row metric result
  if (rowCount === 1) {
    const metric = numCol || cols[0];
    const val = rows[0][metric.name];
    const formatted = formatNumber(Number(val), metric.isCurrency, metric.isPercentage);
    return `${formatColumnLabel(metric.name)} is ${formatted}.`;
  }

  // Category + Numeric Aggregation (find top category)
  if (catCol && numCol) {
    let topRow = rows[0];
    let maxVal = Number(rows[0][numCol.name]) || 0;
    let totalVal = 0;

    rows.forEach((r) => {
      const v = Number(r[numCol.name]) || 0;
      totalVal += v;
      if (v > maxVal) {
        maxVal = v;
        topRow = r;
      }
    });

    const topCategoryName = String(topRow[catCol.name] || 'N/A');
    const topFormatted = formatNumber(maxVal, numCol.isCurrency, numCol.isPercentage);

    if (totalVal > 0 && maxVal > 0) {
      const pct = Math.round((maxVal / totalVal) * 100);
      return `${topCategoryName} has the highest ${formatColumnLabel(numCol.name).toLowerCase()} with ${topFormatted} (${pct}% of total).`;
    }

    return `${topCategoryName} leads with ${formatColumnLabel(numCol.name).toLowerCase()} of ${topFormatted}.`;
  }

  // Date analysis
  if (dateCol) {
    return `${rowCount} records returned across time period ${rows[0][dateCol.name] || ''} to ${rows[rowCount - 1][dateCol.name] || ''}.`;
  }

  return `Query returned ${rowCount} records.`;
}
