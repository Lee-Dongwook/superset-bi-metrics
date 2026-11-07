import { NativeFilterTarget, ExtraFormData } from "@bi-metrics/ui";

type ActiveFilter = {
  filterType?: string;
  targets: Partial<NativeFilterTarget>[];
  scope: number[];
  values: ExtraFormData;
  layerScope?: {
    [chartId: number]: number[];
  };
};

export type ActiveFilters = {
  [key: string]: ActiveFilter;
};
