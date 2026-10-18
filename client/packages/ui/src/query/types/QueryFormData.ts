import type { PhysicalColumn, AdhocColumn } from "./Column";
import { AdhocMetric, SavedMetric } from "./Metric";

export type QueryFormMetric = SavedMetric | AdhocMetric;
export type QueryFormColumn = PhysicalColumn | AdhocColumn;
export type QueryFormOrderBy =
  | [QueryFormColumn | QueryFormMetric | {}, boolean]
  | [];
