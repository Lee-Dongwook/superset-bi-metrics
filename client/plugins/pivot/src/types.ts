import {
  TimeFormatter,
  NumberFormatter,
  DataRecord,
  DataRecordValue,
  SetDataMaskHook,
  JsonObject,
  QueryFormData,
  QueryFormColumn,
  QueryFormMetric,
  TimeGranularity,
  ContextMenuFilters,
  Currency,
} from "@bi-metrics/ui";
import { ColorFormatters } from "@bi-metrics/chart-control";

export interface PivotTableStylesProps {
  height: number;
  width: number | string;
  margin: number;
}

export type FilterType = Record<string, DataRecordValue>;
export type SelectedFiltersType = Record<string, DataRecordValue[]>;

export type DateFormatter =
  | TimeFormatter
  | NumberFormatter
  | ((value: DataRecordValue) => string);

export enum MetricsLayoutEnum {
  ROWS = "ROWS",
  COLUMNS = "COLUMNS",
}

export enum ShowValuesAsEnum {
  ACTUAL = "actual",
  PERCENT_OF_ROW = "percent_row",
  PERCENT_OF_COLUMN = "percent_col",
  PERCENT_OF_TOTAL = "percent_total",
}

export interface Groupby {
  rows: QueryFormColumn[];
  columns: QueryFormColumn[];
}

export interface QueryData {
  data: DataRecord[];
  groupby: Groupby;
}

interface PivotTableCustomizeProps {
  groupbyRows: QueryFormColumn[];
  groupbyColumns: QueryFormColumn[];
  metrics: QueryFormMetric[];
  tableRenderer: string;
  colOrder: string;
  rowOrder: string;
  transposePivot: boolean;
  combineMetric: boolean;
  rowSubtotalPosition: boolean;
  colSubtotalPosition: boolean;
  colTotals: boolean;
  colSubTotals: boolean;
  rowTotals: boolean;
  rowSubTotals: boolean;
  collapseRows?: boolean;
  valueFormat: string;
  currencyFormat: Currency;
  currencyCodeColumn?: string;
  detectedCurrency?: string | null;
  setDataMask: SetDataMaskHook;
  emitCrossFilters?: boolean;
  selectedFilters?: SelectedFiltersType;
  verboseMap: JsonObject;
  columnFormats: JsonObject;
  currencyFormats: Record<string, Currency>;
  metricsLayout?: MetricsLayoutEnum;
  showValuesAs?: ShowValuesAsEnum;
  metricColorFormatters: ColorFormatters;
  dateFormatters: Record<string, DateFormatter | undefined>;
  legacy_order_by: QueryFormMetric[] | QueryFormMetric | null;
  order_desc: boolean;
  onContextMenu?: (
    clientX: number,
    clientY: number,
    filters?: ContextMenuFilters,
  ) => void;
  timeGrainSqla?: TimeGranularity;
  time_grain_sqla?: TimeGranularity;
  granularity_sqla?: string;
  allowRenderHtml?: boolean;
}

export type PivotTableQueryFormData = QueryFormData &
  PivotTableStylesProps &
  PivotTableCustomizeProps;

export type PivotTableProps = PivotTableStylesProps &
  PivotTableCustomizeProps & {
    data: QueryData[];
  };
