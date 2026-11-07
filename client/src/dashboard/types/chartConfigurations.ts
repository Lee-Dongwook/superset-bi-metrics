import type { NativeFilterScope } from "@bi-metrics/ui";

export const GLOBAL_SCOPE_POINTER = "global";
export type GlobalScopePointer = typeof GLOBAL_SCOPE_POINTER;

export type ChartCrossFiltersConfig = {
  scope: NativeFilterScope | GlobalScopePointer;
  chartsInScope: number[];
};

export type ChartConfiguration = {
  [chartId: number]: {
    id: number;
    crossFilters: ChartCrossFiltersConfig;
  };
};
