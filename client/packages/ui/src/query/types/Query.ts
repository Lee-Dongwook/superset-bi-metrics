import { BinaryOperator } from "@bi-metrics/ui/chart/types/Operator";
import { QueryFormColumn, QueryFormMetric } from "./QueryFormData";
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
