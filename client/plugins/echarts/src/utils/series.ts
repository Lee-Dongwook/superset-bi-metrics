import type { LegendComponentOption } from "echarts/components";
import {
  ChartDataResponseResult,
  DataRecord,
  DataRecordValue,
  LegendState,
  normalizeTimestamp,
  TimeFormatter,
  ValueFormatter,
} from "@bi-metrics/ui";
import { GenericDataType } from "@bi-metrics/core/common";
import {
  NULL_STRING,
  TIMESERIES_CONSTANTS,
} from "@bi-metrics/plugin-echarts/constants";
import { defaultLegendPadding } from "@bi-metrics/plugin-echarts/defaults";
import {
  LegendOrientation,
  LegendType,
} from "@bi-metrics/plugin-echarts/types";

interface FormatSeriesNameInnerModuleProps {
  numberFormatter?: ValueFormatter;
  timeFormatter?: TimeFormatter;
  coltype?: GenericDataType;
}

interface FormatSeriesNameProps {
  name: DataRecordValue | undefined;
  innerModule: FormatSeriesNameInnerModuleProps;
}

export function isDefined<T>(value: T | undefined | null): boolean {
  return value !== undefined && value !== null;
}

export function formatSeriesName({
  name,
  innerModule,
}: FormatSeriesNameProps): string {
  if (name === undefined || name === null) {
    return NULL_STRING;
  }
  if (typeof name === "boolean" || typeof name === "bigint") {
    return name.toString();
  }
  if (
    name instanceof Date ||
    innerModule.coltype === GenericDataType.Temporal
  ) {
    const normalizedName =
      typeof name === "string" ? normalizeTimestamp(name) : name;
    const d =
      normalizedName instanceof Date
        ? normalizedName
        : new Date(normalizedName);

    return innerModule.timeFormatter
      ? innerModule.timeFormatter(d)
      : d.toISOString();
  }
  if (typeof name === "number") {
    return innerModule.numberFormatter
      ? innerModule.numberFormatter(name)
      : name.toString();
  }
  return name;
}

export function extractGroupbyLabel({
  datum = {},
  groupby,
  numberFormatter,
  timeFormatter,
  coltypeMapping = {},
}: {
  datum?: DataRecord;
  groupby?: string[] | null;
  numberFormatter?: ValueFormatter;
  timeFormatter?: TimeFormatter;
  coltypeMapping?: Record<string, GenericDataType>;
}): string {
  return (groupby || [])
    .map((val) =>
      formatSeriesName({
        name: datum[val],
        innerModule: {
          numberFormatter,
          timeFormatter,
          coltype: coltypeMapping[val],
        },
      }),
    )
    .join(", ");
}

export function getColtypesMapping({
  coltypes = [],
  colnames = [],
}: Pick<ChartDataResponseResult, "coltypes" | "colnames">): Record<
  string,
  GenericDataType
> {
  return colnames.reduce(
    (accumulator, item, index) => ({ ...accumulator, [item]: coltypes[index] }),
    {},
  );
}

export function getLegendProps(
  type: LegendType,
  orientation: LegendOrientation,
  show: boolean,
  zoomable = false,
  legendState?: LegendState,
): LegendComponentOption {
  const legend: LegendComponentOption = {
    orient: [LegendOrientation.Top, LegendOrientation.Bottom].includes(
      orientation,
    )
      ? "horizontal"
      : "vertical",
    show,
    type,
    selected: legendState,
  };
  switch (orientation) {
    case LegendOrientation.Left:
      legend.left = 0;
      break;
    case LegendOrientation.Right:
      legend.right = 0;
      legend.top = zoomable ? TIMESERIES_CONSTANTS.legendRightTopOffset : 0;
      break;
    case LegendOrientation.Bottom:
      legend.bottom = 0;
      legend.left = "center";
      break;
    case LegendOrientation.Top:
    default:
      legend.top = 0;
      if (zoomable) {
        legend.right = TIMESERIES_CONSTANTS.legendTopRightOffset;
      } else {
        legend.left = "center";
      }
      break;
  }
  return legend;
}

export function getChartPadding(
  show: boolean,
  orientation: LegendOrientation,
  margin?: string | number | null,
  padding?: { top?: number; bottom?: number; left?: number; right?: number },
): { bottom: number; left: number; right: number; top: number } {
  let legendMargin: number;
  if (!show) {
    legendMargin = 0;
  } else if (margin === null || margin === undefined || typeof margin === "string") {
    legendMargin = defaultLegendPadding[orientation];
  } else {
    legendMargin = margin;
  }

  const { bottom = 0, left = 0, right = 0, top = 0 } = padding || {};
  return {
    left: left + (orientation === LegendOrientation.Left ? legendMargin : 0),
    right: right + (orientation === LegendOrientation.Right ? legendMargin : 0),
    top: top + (orientation === LegendOrientation.Top ? legendMargin : 0),
    bottom: bottom + (orientation === LegendOrientation.Bottom ? legendMargin : 0),
  };
}
