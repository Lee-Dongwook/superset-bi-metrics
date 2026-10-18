import type { GenericDataType } from "@bi-metrics/core/common";

export interface AdhocColumn {
  hasCustomLabel?: boolean;
  label?: string;
  optionName?: string;
  sqlExpression: string;
  expressionType: "SQL";
  isColumnReference?: boolean;
  columnType?: "BASE_AXIS" | "SERIES";
  timeGrain?: string;
  datasourceWarning?: boolean;
}

export type PhysicalColumn = string;

export interface Column {
  id?: number;
  type?: string;
  type_generic?: GenericDataType;
  column_name: string;
  groupby?: boolean;
  is_dttm?: boolean;
  filterable?: boolean;
  verbose_name?: string | null;
  description?: string | null;
  expression?: string | null;
  database_expression?: string | null;
  python_date_format?: string | null;
  optionName?: string;
  filterBy?: string;
  value?: string;
  advanced_data_type?: string;
}
