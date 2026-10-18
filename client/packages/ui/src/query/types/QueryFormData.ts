import { TimeGranularity } from "@bi-metrics/ui/formats";
import type { PhysicalColumn, AdhocColumn } from "./Column";
import { AdhocMetric, SavedMetric } from "./Metric";
import { TimeRange } from "./Time";
import { AdhocFilter } from "./Filter";
import {
  BinaryOperator,
  SetOperator,
} from "@bi-metrics/ui/chart/types/Operator";
import { AnnotationLayer } from "./AnnotationLayer";
import { JsonObject } from "@bi-metrics/ui/connection";

export type QueryFormMetric = SavedMetric | AdhocMetric;
export type QueryFormColumn = PhysicalColumn | AdhocColumn;
export type QueryFormOrderBy =
  | [QueryFormColumn | QueryFormMetric | {}, boolean]
  | [];
export interface FormDataResidual {
  [key: string]: any;
}
export type SemanticSelectionSource = {
  datasource: string;
  version: string | null;
};
export type QueryFormExtraFilter = {
  col: string;
} & (
  | {
      op: BinaryOperator;
      val: string;
    }
  | {
      op: SetOperator;
      val: string[];
    }
);

export type ExtraFormDataOverrideExtras = Pick<
  QueryObjectExtras,
  "relative_start" | "relative_end" | "time_grain_sqla" | "time_compare"
>;

export type ExtraFormDataOverrideRegular = Partial<
  Pick<SqlaFormData, "granularity_sqla">
> &
  Partial<Pick<SqlaFormData, "granularity">> &
  Partial<Pick<BaseFormData, "time_range">> &
  Partial<Pick<QueryObject, "time_column" | "time_grain" | "time_compare">> & {
    visible_deckgl_layers?: number[];
  };

export type ExtraFormDataOverride = ExtraFormDataOverrideRegular &
  ExtraFormDataOverrideExtras;

export type ExtraFormDataAppend = {
  adhoc_filters?: AdhocFilter[];
  filters?: QueryObjectFilterClause[];
  interactive_drilldown?: string[];
  interactive_groupby?: string[];
  interactive_highlight?: string[];
  custom_form_data?: JsonObject;
};

export type ExtraFormData = ExtraFormDataAppend &
  ExtraFormDataOverride & {
    semantic_selection_sources?: SemanticSelectionSource[];
  };

export interface BaseFormData extends TimeRange, FormDataResidual {
  semantic_selection_version?: string;
  semantic_selection_sources?: SemanticSelectionSource[];
  datasource: string;
  viz_type: string;
  metrics?: QueryFormMetric[];
  where?: string;
  columns?: QueryFormColumn[];
  groupby?: QueryFormColumn[];
  all_columns?: QueryFormColumn[];
  adhoc_filters?: AdhocFilter[] | null;
  extra_filters?: QueryFormExtraFilter[] | null;
  extra_form_data?: ExtraFormData;
  order_desc?: boolean;
  limit?: number;
  row_limit?: string | number | null;
  row_offset?: string | number | null;
  timeseries_limit_metric?: QueryFormMetric;
  force?: boolean;
  force_nonce?: string;
  result_format?: string;
  result_type?: string;
  annotation_layers?: AnnotationLayer[];
  url_params?: Record<string, string>;
  custom_params?: Record<string, string>;
  series_columns?: QueryFormColumn[];
  series_limit?: number;
  series_limit_metric?: QueryFormMetric;
}

export interface SqlaFormData extends BaseFormData {
  granularity?: string;
  granularity_sqla?: string;
  time_grain_sqla?: TimeGranularity;
  having?: string;
}
export type QueryFormData = SqlaFormData;
