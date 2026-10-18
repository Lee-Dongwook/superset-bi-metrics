import type { Column } from "./Column";

export type Aggregate =
  | "AVG"
  | "COUNT"
  | "COUNT_DISTINCT"
  | "MAX"
  | "MEDIAN"
  | "MIN"
  | "STDDEV_SAMP"
  | "SUM"
  | "VAR_SAMP";

export interface AdhocMetricBase {
  hasCustomLabel?: boolean;
  label?: string;
  optionName?: string;
}

export interface AdhocMetricSimple extends AdhocMetricBase {
  expressionType: "SIMPLE";
  column: Omit<Column, "column_name"> & {
    column_name?: string;
    columnName?: string;
  };
  aggregate: Aggregate;
}

export interface AdhocMetricSQL extends AdhocMetricBase {
  expressionType: "SQL";
  sqlExpression: string;
}

export type AdhocMetric = AdhocMetricSimple | AdhocMetricSQL;
export type SavedMetric = string;
