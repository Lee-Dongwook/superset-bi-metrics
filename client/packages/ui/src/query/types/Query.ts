import {
  BinaryOperator,
  SetOperator,
  UnaryOperator,
} from "@bi-metrics/ui/chart/types/Operator";
import {
  QueryFormColumn,
  QueryFormMetric,
  QueryFormOrderBy,
} from "./QueryFormData";
import { DataRecordValue } from "./QueryResponse";
import { TimeGranularity } from "@bi-metrics/ui/formats/time/types";
import { AnnotationLayer } from "./AnnotationLayer";
import { JsonObject } from "@bi-metrics/ui/connection";
import { Maybe } from "@bi-metrics/ui/types";
import { TimeRange } from "./Time";

export const ErrorTypeEnum = {
  FRONTEND_CSRF_ERROR: "FRONTEND_CSRF_ERROR",
  //TODO
};

type ValueOf<T> = T[keyof T];
export type ErrorType = ValueOf<typeof ErrorTypeEnum>;

export type ErrorLevel = "info" | "warning" | "error";
export type ErrorSource = "dashboard" | "explore" | "sqllab" | "crud";

export type BiMetricsError<ExtraType = Record<string, any> | null> = {
  error_type: ErrorType;
  extra: ExtraType;
  level: ErrorLevel;
  message: string;
};
// mock: minimal shapes until the full query object types are ported
export type QueryFields = {
  columns?: QueryFormColumn[];
  metrics?: QueryFormMetric[];
  orderby?: QueryFormOrderBy[];
};

export type ResidualQueryObjectData = {
  [key: string]: unknown;
};

export type AppliedTimeExtras = {
  [key: string]: string;
};

export type QueryObjectExtras = Partial<{
  relative_start?: string;
  relative_end?: string;
  time_grain_sqla?: TimeGranularity;
  time_compare?: string;
  having?: string;
  where?: string;
}>;

export type PostProcessingRule = {
  operation: string;
  options?: JsonObject;
};

export interface QueryObject
  extends QueryFields, TimeRange, ResidualQueryObjectData {
  annotation_layers?: AnnotationLayer[];
  applied_time_extras?: AppliedTimeExtras;
  apply_fetch_values_predicate?: boolean;
  extras?: QueryObjectExtras;
  filters?: QueryObjectFilterClause[];
  granularity?: string;
  is_timeseries?: boolean;
  is_rowcount?: boolean;
  having?: string;
  post_processing?: (PostProcessingRule | undefined)[];
  row_limit?: number;
  row_offset?: number;
  time_column?: string;
  time_grain?: string;
  time_compare?: string;
  order_desc?: boolean;
  url_params?: Record<string, string>;
  custom_params?: JsonObject;
  where?: string;
  series_columns?: QueryFormColumn[];
  series_limit?: number;
  series_limit_metric?: Maybe<QueryFormMetric>;
  visible_deckgl_layers?: number[];
}

export type BaseQueryObjectFilterClause = {
  col: QueryFormColumn;
  grain?: TimeGranularity;
  isExtra?: boolean;
};

export type BinaryQueryObjectFilterClause = BaseQueryObjectFilterClause & {
  op: BinaryOperator;
  val: DataRecordValue;
  formattedVal?: string;
};

export type SetQueryObjectFilterClause = BaseQueryObjectFilterClause & {
  op: SetOperator;
  val: DataRecordValue[];
  formattedVal?: string[];
};

export type UnaryQueryObjectFilterClause = BaseQueryObjectFilterClause & {
  op: UnaryOperator;
  formattedVal?: string;
};

export type QueryObjectFilterClause =
  | BinaryQueryObjectFilterClause
  | SetQueryObjectFilterClause
  | UnaryQueryObjectFilterClause;
