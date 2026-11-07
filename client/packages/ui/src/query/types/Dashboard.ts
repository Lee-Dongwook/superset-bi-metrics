import { DataMask } from "@bi-metrics/ui/chart";
import { DatasourceType } from "./Datasource";
import { AdhocFilter } from "./Filter";

export enum ChartCustomizationType {
  ChartCustomization = "CHART_CUSTOMIZATION",
  Divider = "CHART_CUSTOMIZATION_DIVIDER",
}

export enum NativeFilterType {
  NativeFilter = "NATIVE_FILTER",
  Divider = "DIVIDER",
}

export interface NativeFilterColumn {
  name: string;
  displayName?: string;
}

export interface NativeFilterScope {
  rootPath: string[];
  excluded: number[];
}

export interface NativeFilterTarget {
  semantic_selection_version?: string;
  datasetId: number;
  column: NativeFilterColumn;
  datasourceType?: DatasourceType;
}

export type Filter = {
  cascadeParentIds: string[];
  defaultDataMask: DataMask;
  id: string;
  name: string;
  scope: NativeFilterScope;
  filterType: string;
  targets: Partial<NativeFilterTarget>[];
  controlValues: {
    [key: string]: any;
  };
  sortMetric?: string | null;
  adhoc_filters?: AdhocFilter[];
  granularity_sqla?: string;
  granularity?: string;
  time_grain_sqla?: string;
  time_range?: string;
  time_grains?: string[];
  requiredFirst?: boolean;
  tabsInScope?: string[];
  chartsInScope?: number[];
  type: typeof NativeFilterType.NativeFilter;
  description: string;
};

export type Divider = Partial<Omit<Filter, "id" | "type">> & {
  id: string;
  title: string;
  description: string;
  type: typeof NativeFilterType.Divider;
};

export type ChartCustomization = {
  id: string;
  type: typeof ChartCustomizationType.ChartCustomization;
  name: string;
  filterType: string;
  targets: Partial<NativeFilterTarget>[];
  scope: NativeFilterScope;
  chartsInScope?: number[];
  tabsInScope?: string[];
  cascadeParentIds?: string[];
  defaultDataMask: DataMask;
  controlValues: {
    sortAscending?: boolean;
    [key: string]: any;
  };
  description?: string;
  removed?: boolean;
  time_grains?: string[];
};

export type ChartCustomizationDivider = Partial<
  Omit<ChartCustomization, "id" | "type">
> & {
  id: string;
  title: string;
  description: string;
  type: typeof ChartCustomizationType.Divider;
};

export type Filters = {
  [filterId: string]:
    | Filter
    | Divider
    | ChartCustomization
    | ChartCustomizationDivider;
};

export type PartialFilters = {
  [filterId: string]: Partial<Filters[keyof Filters]>;
};

export type DataMaskState = { [id: string]: DataMask };
export type DataMaskWithId = { id: string } & DataMask;
export type DataMaskStateWithId = { [filterId: string]: DataMaskWithId };
