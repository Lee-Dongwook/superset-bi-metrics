import { RefObject, Ref } from "react";
import type { EChartsCoreOption, EChartsType } from "echarts/core";

export type EchartsStylesProps = {
  height: number;
  width: number;
};

export type Refs = {
  echartRef?: Ref<any>;
  divRef?: RefObject<HTMLDivElement>;
};

export interface EchartsProps {
  height: number;
  width: number;
  echartOptions: EChartsCoreOption;
  //   eventHandlers?: EventHandlers;
  //   queryEventHandlers?: QueryEventHandlers;
  //   zrEventHandlers?: EventHandlers;
  selectedValues?: Record<number, string>;
  forceClear?: boolean;
  refs: Refs;
  vizType?: string;
}
