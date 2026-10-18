import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
  Ref,
  useState,
} from "react";
import { useSelector } from "react-redux";

import { cn } from "@bi-metrics/ui";
import { use, init, EChartsType, registerLocale } from "echarts/core";
import {
  SankeyChart,
  PieChart,
  BarChart,
  FunnelChart,
  GaugeChart,
  GraphChart,
  LineChart,
  ScatterChart,
  RadarChart,
  BoxplotChart,
  CandlestickChart,
  TreeChart,
  TreemapChart,
  HeatmapChart,
  SunburstChart,
  CustomChart,
} from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";
import {
  TooltipComponent,
  TitleComponent,
  GridComponent,
  VisualMapComponent,
  LegendComponent,
  DataZoomComponent,
  type DataZoomComponentOption,
  ToolboxComponent,
  GraphicComponent,
  AriaComponent,
  MarkAreaComponent,
  MarkLineComponent,
} from "echarts/components";
import { LabelLayout, LegacyGridContainLabel } from "echarts/features";
import { mergeEchartsThemeOverrides } from "@bi-metrics/plugin-echarts/utils/themeOverrides";
import { loadLocale } from "@bi-metrics/plugin-echarts/components/echartsLocale";
import { DEFAULT_LOCALE } from "@bi-metrics/plugin-echarts/constants";
import {
  EchartsHandler,
  EchartsProps,
  QueryEventHandlers,
} from "@bi-metrics/plugin-echarts/types";

interface ExplorePageState {
  common?: {
    locale?: string;
  };
  dashboardState?: {
    isRefreshing?: boolean;
  };
}

use([
  CanvasRenderer,
  BarChart,
  BoxplotChart,
  CandlestickChart,
  CustomChart,
  FunnelChart,
  GaugeChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
  TreeChart,
  TreemapChart,
  AriaComponent,
  DataZoomComponent,
  GraphicComponent,
  GridComponent,
  MarkAreaComponent,
  MarkLineComponent,
  LegendComponent,
  ToolboxComponent,
  TooltipComponent,
  TitleComponent,
  VisualMapComponent,
  LabelLayout,
  LegacyGridContainLabel,
]);

interface EChartsTheme {
  textStyle: {
    color: string;
    fontFamily: string;
  };
  title: {
    textStyle: { color: string };
  };
  legend: {
    textStyle: { color: string };
    pageTextStyle: { color: string };
    pageIconColor: string;
    pageIconInactiveColor: string;
    inactiveColor: string;
  };
  tooltip: {
    backgroundColor: string;
    textStyle: { color: string };
    borderColor: string;
  };
  axisPointer: {
    lineStyle: { color: string };
    label: { color: string };
  };
}

export function isReportScreenshotMode(): boolean {
  try {
    const standalone = new URLSearchParams(window.location.search).get(
      "standalone",
    );

    return standalone === "true" || standalone === "3";
  } catch {
    return false;
  }
}
export const ECHARTS_HOST_CLASS = "echarts-host";
export const ECHARTS_RENDER_FINISHED_CLASS = "echarts-render-finished";

function EChart(
  {
    width,
    height,
    echartOptions,
    eventHandlers,
    queryEventHandlers,
    zrEventHandlers,
    refs,
    vizType,
    className,
  }: EchartsProps,
  ref: Ref<EchartsHandler>,
) {
  const divRef = useRef<HTMLDivElement>(null);

  if (refs) {
    refs.divRef = divRef;
  }

  const [didMount, setDidMount] = useState(false);
  const chartRef = useRef<EChartsType>(undefined);
  const previousQueryEventHandlers = useRef<QueryEventHandlers>([]);

  useImperativeHandle(ref, () => ({
    getEchartInstance: () => chartRef.current,
  }));

  const locale = useSelector(
    (state: ExplorePageState) => state?.common?.locale ?? DEFAULT_LOCALE,
  ).toUpperCase();
  const isDashboardRefreshing = useSelector((state: ExplorePageState) =>
    Boolean(state?.dashboardState?.isRefreshing),
  );

  const handleSizeChange = useCallback(
    ({ width, height }: { width: number; height: number }) => {
      if (chartRef.current) {
        chartRef.current.resize({ width, height });
      }
    },
    [],
  );

  const getEchartsTheme = () => {
    const rootStyle = getComputedStyle(document.documentElement);
    const getCssVariable = (variable: string) =>
      rootStyle.getPropertyValue(variable).trim();

    const fg = getCssVariable("--foreground");
    const mutedFg = getCssVariable("--muted-foreground");
    const primary = getCssVariable("--primary");
    const border = getCssVariable("--border");
    const cardBg = getCssVariable("--card");

    const echartsTheme: EChartsTheme = {
      textStyle: {
        color: fg,
        fontFamily: "inherit",
      },
      title: {
        textStyle: { color: fg },
      },
      legend: {
        textStyle: { color: mutedFg },
        pageTextStyle: { color: mutedFg },
        pageIconColor: mutedFg,
        pageIconInactiveColor: border,
        inactiveColor: border,
      },
      tooltip: {
        backgroundColor: cardBg,
        textStyle: { color: fg },
        borderColor: border,
      },
      axisPointer: {
        lineStyle: { color: primary },
        label: { color: fg },
      },
    };

    const axisConfig = {
      axisLine: { lineStyle: { color: border } },
      axisLabel: { color: mutedFg },
      splitLine: { lineStyle: { color: border } },
      minorSplitLine: { lineStyle: { color: border } },
    };

    // only theme axes the chart declares, otherwise ECharts draws empty ones (e.g. pie)
    const { xAxis, yAxis } = echartOptions as { xAxis?: unknown; yAxis?: unknown };
    return {
      ...echartsTheme,
      ...(xAxis ? { xAxis: axisConfig } : {}),
      ...(yAxis ? { yAxis: axisConfig } : {}),
    };
  };

  useEffect(() => {
    loadLocale(locale).then((localeObj) => {
      if (localeObj) {
        registerLocale(locale, localeObj);
      }
      if (!divRef.current) return;

      if (!chartRef.current) {
        chartRef.current = init(divRef.current, null, {
          locale,
          width,
          height,
        });
        chartRef.current.on("finished", () => {
          divRef.current?.classList.add(ECHARTS_RENDER_FINISHED_CLASS);
        });
      }
      handleSizeChange({ width, height });
      setDidMount(true);
    });
  }, [locale, width, height, handleSizeChange]);

  useEffect(() => {
    if (!didMount || !chartRef.current) return;

    previousQueryEventHandlers.current.forEach(({ name, handler }) => {
      chartRef.current?.off(name, handler);
    });

    Object.entries(eventHandlers || {}).forEach(([name, handler]) => {
      chartRef.current?.off(name);
      chartRef.current?.on(name, handler);
    });

    (queryEventHandlers || []).forEach(({ name, query, handler }) => {
      chartRef.current?.on(name, query, handler);
    });

    previousQueryEventHandlers.current = queryEventHandlers || [];

    Object.entries(zrEventHandlers || {}).forEach(([name, handler]) => {
      chartRef.current?.getZr().off(name);
      chartRef.current?.getZr().on(name, handler);
    });

    const baseTheme = getEchartsTheme();
    const globalOverrides = {};
    const chartOverrides = vizType ? {} : {};

    const animationOverride =
      isDashboardRefreshing || isReportScreenshotMode()
        ? { animation: false, animationDuration: 0 }
        : {};

    const ariaDefault = { aria: { enabled: false } };

    const themedEchartOptions = mergeEchartsThemeOverrides(
      ariaDefault,
      baseTheme,
      echartOptions,
      globalOverrides,
      chartOverrides,
      animationOverride,
    );

    const notMerge = !isDashboardRefreshing;
    chartRef.current.dispatchAction({ type: "hideTip" });

    const previousZoom = notMerge
      ? (
          chartRef.current.getOption() as {
            dataZoom?: DataZoomComponentOption[];
          }
        )?.dataZoom
      : undefined;

    divRef.current?.classList.remove(ECHARTS_RENDER_FINISHED_CLASS);

    chartRef.current.setOption(themedEchartOptions, {
      notMerge,
      replaceMerge: notMerge ? undefined : ["series"],
      lazyUpdate: false,
    });

    if (previousZoom?.length) {
      const newZoom = (
        chartRef.current.getOption() as {
          dataZoom?: DataZoomComponentOption[];
        }
      )?.dataZoom;
      if (newZoom?.length === previousZoom.length) {
        const batch = previousZoom
          .map((dz, dataZoomIndex) => ({
            dataZoomIndex,
            start: dz.start,
            end: dz.end,
            startValue: dz.startValue,
            endValue: dz.endValue,
          }))
          .filter((b) => {
            const hasAny =
              b.start !== undefined ||
              b.end !== undefined ||
              b.startValue !== undefined ||
              b.endValue !== undefined;
            if (!hasAny) return false;

            const isDefaultRange =
              b.start === 0 &&
              b.end === 100 &&
              b.startValue === undefined &&
              b.endValue === undefined;
            return !isDefaultRange;
          });

        if (batch.length) {
          chartRef.current.dispatchAction({ type: "dataZoom", batch });
        }
      }
    }
  }, [
    didMount,
    echartOptions,
    eventHandlers,
    queryEventHandlers,
    zrEventHandlers,
    vizType,
  ]);

  // width/height are runtime numbers; Tailwind can't generate classes for them, so use inline style
  return (
    <div
      ref={divRef}
      className={cn(ECHARTS_HOST_CLASS, "relative overflow-hidden", className)}
      style={{ width, height }}
    />
  );
}

export default forwardRef(EChart);
