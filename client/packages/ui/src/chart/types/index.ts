export type HandlerFunction = (...args: unknown[]) => void;

export enum Behavior {
  InteractiveChart = "INTERACTIVE_CHART",
  NativeFilter = "NATIVE_FILTER",
  ChartCustomization = "CHART_CUSTOMIZATION",
  DrillToDetail = "DRILL_TO_DETAIL",
  DrillBy = "DRILL_BY",
}

export enum AppSection {
  Explore = "EXPLORE",
  Dashboard = "DASHBOARD",
  FilterBar = "FILTER_BAR",
  FilterConfigModal = "FILTER_CONFIG_MODAL",
  Embedded = "EMBEDDED",
}

export type FilterState = {
  value?: any;
  customColumnLabel?: string;
  [key: string]: any;
};

export interface QueryFilterClause {
  col: string;
  op: string;
  val: string | number | string[] | number[];
}

export interface QuerySortBy {
  id: string;
  key: string;
  desc: boolean;
}

export interface ChartStateConverterOptions {
  forExport?: boolean;
}

export interface PlainObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export enum ChartLabel {
  Deprecated = "DEPRECATED",
  Featured = "FEATURED",
}

export enum AxisType {
  Category = "category",
  Value = "value",
  Time = "time",
  Log = "log",
}

export interface LegendState {
  [key: string]: boolean;
}
