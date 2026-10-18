import {
  BaseTransformedProps,
  ContextMenuTransformedProps,
  CrossFilterTransformedProps,
} from "../types";

export type EchartsPieFormData = QueryFormData & LegendFormData & {};

export type PieChartTransformedProps =
  BaseTransformedProps<EchartsPieFormData> &
    ContextMenuTransformedProps &
    CrossFilterTransformedProps;
