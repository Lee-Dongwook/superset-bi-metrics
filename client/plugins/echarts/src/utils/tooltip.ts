import type { TooltipComponentOption } from "echarts/components";
import { Refs } from "@bi-metrics/plugin-echarts/types";

// ponytail: mock confines tooltip to the chart; port refs-based positioning when tooltips clip in dashboards
export function getDefaultTooltip(_refs: Refs): TooltipComponentOption {
  return { confine: true };
}
