import { QueryFormColumn, QueryFormData } from "@bi-metrics/ui";
import { DEFAULT_LEGEND_FORM_DATA } from "@bi-metrics/plugin-echarts/defaults";
import {
  BaseChartProps,
  BaseTransformedProps,
  ContextMenuTransformedProps,
  CrossFilterTransformedProps,
  LegendFormData,
  LegendOrientation,
  LegendType,
} from "@bi-metrics/plugin-echarts/types";

export enum EchartsPieLabelType {
  Key = "key",
  Value = "value",
  Percent = "percent",
  KeyValue = "key_value",
  KeyPercent = "key_percent",
  KeyValuePercent = "key_value_percent",
  ValuePercent = "value_percent",
}

export type EchartsPieFormData = QueryFormData &
  LegendFormData & {
    colorScheme?: string;
    donut: boolean;
    groupby: QueryFormColumn[];
    innerRadius: number;
    labelLine: boolean;
    labelType: EchartsPieLabelType;
    labelsOutside: boolean;
    metric?: string;
    outerRadius: number;
    showLabels: boolean;
    showLabelsThreshold: number;
    dateFormat: string;
    numberFormat: string;
    sliceId?: number;
    showTotal: boolean;
    roseType: "radius" | "area" | null;
  };

export interface EchartsPieChartProps
  extends BaseChartProps<EchartsPieFormData> {
  formData: EchartsPieFormData;
}

export const DEFAULT_FORM_DATA: Partial<EchartsPieFormData> = {
  ...DEFAULT_LEGEND_FORM_DATA,
  donut: false,
  groupby: [],
  innerRadius: 30,
  labelLine: false,
  labelType: EchartsPieLabelType.Key,
  legendOrientation: LegendOrientation.Top,
  legendType: LegendType.Scroll,
  numberFormat: "SMART_NUMBER",
  outerRadius: 70,
  showLabels: true,
  labelsOutside: true,
  showLabelsThreshold: 5,
  dateFormat: "smart_date",
  showTotal: false,
  roseType: null,
};

export type PieChartTransformedProps =
  BaseTransformedProps<EchartsPieFormData> &
    ContextMenuTransformedProps &
    CrossFilterTransformedProps;
