import type { EChartsCoreOption } from "echarts/core";
import type { PieSeriesOption } from "echarts/charts";
import type { CallbackDataParams } from "echarts/types/dist/shared";
import {
  CategoricalColorNamespace,
  getColumnLabel,
  getMetricLabel,
  getNumberFormatter,
  getTimeFormatter,
  NumberFormats,
  NumberFormatter,
  sanitizeHtml,
} from "@bi-metrics/ui";
import { t } from "@bi-metrics/core/translation";
import { OpacityEnum } from "@bi-metrics/plugin-echarts/constants";
import {
  DEFAULT_FORM_DATA,
  EchartsPieChartProps,
  EchartsPieFormData,
  EchartsPieLabelType,
  PieChartTransformedProps,
} from "@bi-metrics/plugin-echarts/Pie/types";
import { Refs } from "@bi-metrics/plugin-echarts/types";
import {
  extractGroupbyLabel,
  getChartPadding,
  getColtypesMapping,
  getLegendProps,
} from "@bi-metrics/plugin-echarts/utils/series";
import { getDefaultTooltip } from "@bi-metrics/plugin-echarts/utils/tooltip";

const percentFormatter = getNumberFormatter(NumberFormats.PERCENT_2_POINT);

export function formatPieLabel({
  params,
  labelType,
  numberFormatter,
  sanitizeName = false,
}: {
  params: Pick<CallbackDataParams, "name" | "value" | "percent">;
  labelType: EchartsPieLabelType;
  numberFormatter: NumberFormatter;
  sanitizeName?: boolean;
}): string {
  const { name: rawName = "", value, percent } = params;
  const name = sanitizeName ? sanitizeHtml(rawName) : rawName;
  const formattedValue = numberFormatter(value as number);
  const formattedPercent = percentFormatter((percent as number) / 100);

  switch (labelType) {
    case EchartsPieLabelType.Value:
      return formattedValue;
    case EchartsPieLabelType.Percent:
      return formattedPercent;
    case EchartsPieLabelType.KeyValue:
      return `${name}: ${formattedValue}`;
    case EchartsPieLabelType.KeyValuePercent:
      return `${name}: ${formattedValue} (${formattedPercent})`;
    case EchartsPieLabelType.KeyPercent:
      return `${name}: ${formattedPercent}`;
    case EchartsPieLabelType.ValuePercent:
      return `${formattedValue} (${formattedPercent})`;
    case EchartsPieLabelType.Key:
    default:
      return name;
  }
}

function getTotalValuePadding({
  chartPadding,
  donut,
  width,
  height,
}: {
  chartPadding: { bottom: number; left: number; right: number; top: number };
  donut: boolean;
  width: number;
  height: number;
}) {
  const padding: { left?: string; top?: string } = {
    top: donut ? "middle" : "0",
    left: "center",
  };
  if (chartPadding.top) {
    padding.top = donut
      ? `${50 + ((chartPadding.top - chartPadding.bottom) / height / 2) * 100}%`
      : `${(chartPadding.top / height) * 100}%`;
  }
  if (chartPadding.bottom) {
    padding.top = donut
      ? `${50 - ((chartPadding.bottom - chartPadding.top) / height / 2) * 100}%`
      : "0";
  }
  if (chartPadding.left) {
    padding.left = `${50 + ((chartPadding.left - chartPadding.right) / width / 2) * 100}%`;
  }
  if (chartPadding.right) {
    padding.left = `${50 - ((chartPadding.right - chartPadding.left) / width / 2) * 100}%`;
  }
  return padding;
}

export default function transformProps(
  chartProps: EchartsPieChartProps,
): PieChartTransformedProps {
  const {
    formData,
    height,
    hooks,
    filterState,
    queriesData,
    width,
    inContextMenu,
    emitCrossFilters,
  } = chartProps;
  const { data = [] } = queriesData[0];
  const coltypeMapping = getColtypesMapping(queriesData[0]);

  const {
    colorScheme,
    donut,
    groupby,
    innerRadius,
    labelsOutside,
    labelLine,
    labelType,
    legendMargin,
    legendOrientation,
    legendType,
    metric = "",
    numberFormat,
    dateFormat,
    outerRadius,
    showLabels,
    showLegend,
    showLabelsThreshold,
    sliceId,
    showTotal,
    roseType,
  }: EchartsPieFormData = { ...DEFAULT_FORM_DATA, ...formData };

  const refs: Refs = {};
  const metricLabel = getMetricLabel(metric);
  const groupbyLabels = groupby.map(getColumnLabel);
  const minShowLabelAngle = (showLabelsThreshold || 0) * 3.6;
  const numberFormatter = getNumberFormatter(numberFormat);
  const timeFormatter = getTimeFormatter(dateFormat);

  const labelMap = data.reduce((acc: Record<string, string[]>, datum) => {
    const label = extractGroupbyLabel({
      datum,
      groupby: groupbyLabels,
      coltypeMapping,
      timeFormatter,
    });
    return {
      ...acc,
      [label]: groupbyLabels.map((col) => datum[col] as string),
    };
  }, {});

  const { setDataMask = () => {}, onContextMenu } = hooks;
  const colorFn = CategoricalColorNamespace.getScale(colorScheme);

  let totalValue = 0;
  const transformedData: PieSeriesOption["data"] = data.map((datum) => {
    const name = extractGroupbyLabel({
      datum,
      groupby: groupbyLabels,
      coltypeMapping,
      timeFormatter,
    });
    const isFiltered =
      filterState.selectedValues && !filterState.selectedValues.includes(name);
    const value = datum[metricLabel];
    totalValue += Number(value) || 0;

    return {
      value: value as number,
      name,
      itemStyle: {
        color: colorFn(name, sliceId),
        opacity: isFiltered
          ? OpacityEnum.SemiTransparent
          : OpacityEnum.NonTransparent,
      },
    };
  });

  const selectedValues = (filterState.selectedValues || []).reduce(
    (acc: Record<number, string>, selectedValue: string) => {
      const index = transformedData.findIndex(
        (datum) => (datum as { name: string }).name === selectedValue,
      );
      return { ...acc, [index]: selectedValue };
    },
    {},
  );

  const formatter = (params: CallbackDataParams) =>
    formatPieLabel({ params, numberFormatter, labelType });

  const defaultLabel = { formatter, show: showLabels };
  const chartPadding = getChartPadding(
    showLegend,
    legendOrientation,
    legendMargin,
  );

  const series: PieSeriesOption[] = [
    {
      type: "pie",
      ...chartPadding,
      animation: false,
      roseType: roseType || undefined,
      radius: [`${donut ? innerRadius : 0}%`, `${outerRadius}%`],
      center: ["50%", "50%"],
      avoidLabelOverlap: true,
      labelLine: { show: labelsOutside && labelLine },
      minShowLabelAngle,
      label: labelsOutside
        ? {
            ...defaultLabel,
            position: "outer",
            alignTo: "none",
            bleedMargin: 5,
          }
        : { ...defaultLabel, position: "inner" },
      emphasis: {
        label: { show: true, fontWeight: "bold" },
      },
      data: transformedData,
    },
  ];

  const echartOptions: EChartsCoreOption = {
    tooltip: {
      ...getDefaultTooltip(refs),
      show: !inContextMenu,
      trigger: "item",
      formatter: (params: CallbackDataParams) =>
        formatPieLabel({
          params,
          numberFormatter,
          labelType: EchartsPieLabelType.KeyValuePercent,
          sanitizeName: true,
        }),
    },
    legend: {
      ...getLegendProps(legendType, legendOrientation, showLegend),
      data: transformedData.map((datum) => (datum as { name: string }).name),
    },
    graphic: showTotal
      ? {
          type: "text",
          ...getTotalValuePadding({ chartPadding, donut, width, height }),
          style: {
            text: t("Total: %s", numberFormatter(totalValue)),
            fontSize: 16,
            fontWeight: "bold",
          },
          z: 10,
        }
      : null,
    series,
  };

  return {
    formData,
    width,
    height,
    echartOptions,
    setDataMask,
    labelMap,
    groupby,
    selectedValues,
    onContextMenu,
    refs,
    emitCrossFilters,
    coltypeMapping,
    onLegendStateChanged: hooks.onLegendStateChanged,
    onLegendScroll: hooks.onLegendScroll,
  };
}
