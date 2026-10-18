import { PieChartTransformedProps } from "@bi-metrics/plugin-echarts/Pie/types";
import Echart from "@bi-metrics/plugin-echarts/components/Echart";
import { allEventHandlers } from "@bi-metrics/plugin-echarts/utils/EventHandlers";
import { useLegendEventHandlers } from "@bi-metrics/plugin-echarts/utils/legendEventHandlers";

export default function EchartsPie(props: PieChartTransformedProps) {
  const {
    height,
    width,
    echartOptions,
    refs,
    formData,
    onLegendStateChanged,
    onLegendScroll,
  } = props;

  const legendEventHandlers = useLegendEventHandlers(
    onLegendStateChanged,
    onLegendScroll,
  );
  const eventHandlers = {
    ...legendEventHandlers,
    ...allEventHandlers(props),
  };
  return (
    <Echart
      refs={refs}
      height={height}
      width={width}
      echartOptions={echartOptions}
      eventHandlers={eventHandlers}
      vizType={formData.vizType}
    />
  );
}
