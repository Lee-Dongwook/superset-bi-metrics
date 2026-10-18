import { RefObject, Ref } from "react";
import type { EChartsCoreOption, EChartsType } from "echarts/core";
import {
  ChartDataResponseResult,
  ChartProps,
  ContextMenuFilters,
  FilterState,
  HandlerFunction,
  LegendState,
  PlainObject,
  QueryFormColumn,
  SetDataMaskHook,
} from "@bi-metrics/ui";

export type Refs = {
  echartRef?: Ref<any>;
  divRef?: RefObject<HTMLDivElement | null>;
};

export type EventHandlers = Record<string, { (props: any): void }>;

export type QueryEventHandlers = {
  name: string;
  query: string;
  handler: (props: any) => void;
}[];

export interface EchartsProps {
  height: number;
  width: number;
  echartOptions: EChartsCoreOption;
  eventHandlers?: EventHandlers;
  queryEventHandlers?: QueryEventHandlers;
  zrEventHandlers?: EventHandlers;
  forceClear?: boolean;
  refs: Refs;
  vizType?: string;
  className?: string;
}

export interface EchartsHandler {
  getEchartInstance: () => EChartsType | undefined;
}

export interface BaseTransformedProps<F> {
  echartOptions: EChartsCoreOption;
  formData: F;
  height: number;
  isRefreshing?: boolean;
  onContextMenu?: (
    clientX: number,
    clientY: number,
    filters?: ContextMenuFilters,
  ) => void;
  setDataMask?: SetDataMaskHook;
  onLegendStateChanged?: (state: LegendState) => void;
  filterState?: FilterState;
  refs: Refs;
  width: number;
  emitCrossFilters?: boolean;
  coltypeMapping?: Record<string, number>;
  onLegendScroll?: (currentIndex: number) => void;
}

export type ContextMenuTransformedProps = {
  onContextMenu?: (
    clientX: number,
    clientY: number,
    filters?: ContextMenuFilters,
  ) => void;
  setDataMask?: SetDataMaskHook;
};

export type CrossFilterTransformedProps = {
  groupby: QueryFormColumn[];
  labelMap: Record<string, string[]>;
  setControlValue?: HandlerFunction;
  setDataMask: SetDataMaskHook;
  selectedValues: Record<number, string>;
  emitCrossFilters?: boolean;
};

export enum LegendOrientation {
  Top = "top",
  Bottom = "bottom",
  Left = "left",
  Right = "right",
}

export enum LegendType {
  Scroll = "scroll",
  Plain = "plain",
}

export type LegendFormData = {
  legendMargin: number | null | string;
  legendOrientation: LegendOrientation;
  legendType: LegendType;
  showLegend: boolean;
  legendSort?: "asc" | "desc" | null;
};

export interface BaseChartProps<T extends PlainObject> extends ChartProps<T> {
  queriesData: ChartDataResponseResult[];
}
