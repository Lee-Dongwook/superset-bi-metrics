import { PieChartTransformedProps } from "./types";
import Echart from "../components/Echart";
import { allEventHandlers } from "../utils/EventHandlers";
import { useLegendEventHandlers } from "../utils/legendEventHandlers";

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
