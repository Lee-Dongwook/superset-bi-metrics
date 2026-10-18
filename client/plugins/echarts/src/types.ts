import { RefObject, Ref } from "react";
import type {
  EChartsCoreOption,
  EChartsType,
} from "echarts/core";

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
