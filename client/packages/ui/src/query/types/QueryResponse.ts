import type { GenericDataType } from "@bi-metrics/core/common";

export type DataRecordValue = number | string | boolean | Date | null | bigint;

export interface DataRecord {
  [key: string]: DataRecordValue;
}

// mock: only the fields chart transformProps read today
export interface ChartDataResponseResult {
  data: DataRecord[];
  colnames: string[];
  coltypes: GenericDataType[];
  rowcount: number;
}
