import { useCallback, useEffect, useMemo, useRef } from "react";
import { LegendState } from "@bi-metrics/ui";
import { EventHandlers } from "@bi-metrics/plugin-echarts/types";

export const LEGEND_DOUBLE_CLICK_INTERVAL = 300;

interface LegendSelectChangedPayload {
  name: string;
  selected: LegendState;
}

interface LegendSelectPayload {
  selected: LegendState;
}

interface LegendScrollPayload {
  scrollDataIndex: number;
}

interface PendingClick {
  name: string;
  timer: ReturnType<typeof setTimeout>;
}

export function isolateLegendSeries(
  selected: LegendState,
  name: string,
): LegendState {
  const names = Object.keys(selected);
  const isIsolated = names.every((key) => selected[key] === (key === name));
  return Object.fromEntries(
    names.map((key): [string, boolean] => [key, isIsolated || key === name]),
  );
}

export function useLegendEventHandlers(
  onLegendStateChanged?: (state: LegendState) => void,
  onLegendScroll?: (scrollDataIndex: number) => void,
): EventHandlers {
  const pending = useRef<PendingClick | null>(null);

  const clearPending = useCallback(() => {
    if (pending.current) {
      clearTimeout(pending.current.timer);
      pending.current = null;
    }
  }, []);

  useEffect(() => clearPending, [clearPending]);

  return useMemo(() => {
    const report = ({ selected }: LegendSelectPayload) => {
      clearPending();
      onLegendStateChanged?.(selected);
    };

    return {
      legendselectchanged: ({ name, selected }: LegendSelectChangedPayload) => {
        if (pending.current?.name === name) {
          clearPending();
          onLegendStateChanged?.(isolateLegendSeries(selected, name));
          return;
        }
        clearPending();
        pending.current = {
          name,
          timer: setTimeout(() => {
            pending.current = null;
            onLegendStateChanged?.(selected);
          }, LEGEND_DOUBLE_CLICK_INTERVAL),
        };
      },
      legendselectall: report,
      legendinverseselect: report,
      legendscroll: ({ scrollDataIndex }: LegendScrollPayload) => {
        onLegendScroll?.(scrollDataIndex);
      },
    };
  }, [clearPending, onLegendScroll, onLegendStateChanged]);
}
