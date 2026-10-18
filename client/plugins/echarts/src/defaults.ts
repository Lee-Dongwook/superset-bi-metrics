import {
  LegendFormData,
  LegendOrientation,
  LegendType,
} from "@bi-metrics/plugin-echarts/types";

export const defaultLegendPadding: Record<LegendOrientation, number> = {
  [LegendOrientation.Top]: 20,
  [LegendOrientation.Bottom]: 20,
  [LegendOrientation.Left]: 170,
  [LegendOrientation.Right]: 170,
};

export const DEFAULT_LEGEND_FORM_DATA: LegendFormData = {
  legendMargin: null,
  legendOrientation: LegendOrientation.Top,
  legendType: LegendType.Scroll,
  showLegend: true,
};
