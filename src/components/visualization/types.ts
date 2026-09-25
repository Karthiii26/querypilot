export type VisualizationType =
  | 'kpi'
  | 'bar'
  | 'horizontal-bar'
  | 'line'
  | 'donut'
  | 'histogram'
  | 'table-only'
  | 'no-data';

export type ColumnRole = 'id' | 'category' | 'date' | 'numeric' | 'unknown';

export interface ColumnAnalysis {
  name: string;
  role: ColumnRole;
  type: string;
  sampleValues: any[];
  nullCount: number;
  distinctCount: number;
  isPrimaryKeyOrId: boolean;
  isCurrency: boolean;
  isPercentage: boolean;
}

export interface DatasetAnalysis {
  rowCount: number;
  columns: ColumnAnalysis[];
  primaryCategoryCol?: ColumnAnalysis;
  primaryNumericCol?: ColumnAnalysis;
  primaryDateCol?: ColumnAnalysis;
  recommendedType: VisualizationType;
  availableTypes: VisualizationType[];
  summary: string;
  kpiData?: {
    label: string;
    value: string | number;
    subtext?: string;
    colName: string;
  };
}

export interface ChartDataItem {
  label: string;
  fullName: string;
  value: number;
  formattedValue: string;
  dateVal?: Date;
  rawRow: Record<string, any>;
}
