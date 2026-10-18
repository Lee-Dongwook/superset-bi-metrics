import { JsonObject } from "@bi-metrics/ui/connection";
import { FilterState } from "@bi-metrics/ui/chart/types";
import {
  BinaryQueryObjectFilterClause,
  ExtraFormData,
} from "@bi-metrics/ui/query";

export type DataMask = {
  extraFormData?: ExtraFormData;
  filterState?: FilterState;
  ownState?: JsonObject;
};

export type SetDataMaskHook = {
  ({ filterState, extraFormData, ownState }: DataMask): void;
};

export interface ContextMenuFilters {
  crossFilter?: {
    dataMask: DataMask;
    isCurrentValueSelected?: boolean;
  };
  drillToDetail?: BinaryQueryObjectFilterClause[];
  drillBy?: {
    filters: BinaryQueryObjectFilterClause[];
    groupbyFieldName: string;
    adhocFilterFieldName?: string;
    xAxisFilters?: BinaryQueryObjectFilterClause[];
  };
}
