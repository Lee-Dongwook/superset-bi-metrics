import {
  BinaryQueryObjectFilterClause,
  ContextMenuFilters,
  DataMask,
  QueryFormColumn,
  QueryFormData,
  getColumnLabel,
  getNumberFormatter,
  getTimeFormatter,
} from "@bi-metrics/ui";
import {
  BaseTransformedProps,
  CrossFilterTransformedProps,
  EventHandlers,
} from "@bi-metrics/plugin-echarts/types";
import { formatSeriesName } from "@bi-metrics/plugin-echarts/utils/series";

export type Event = {
  name: string;
  event: { stop: () => void; event: PointerEvent };
};

interface GetCrossFilterDataMaskProps {
  selectedValues: Record<number, string>;
  groupby: QueryFormColumn[];
  labelMap: Record<string, string[]>;
}

interface ContextMenuEventHandlerProps {
  groupby: (BaseTransformedProps<any> & CrossFilterTransformedProps)["groupby"];
  onContextMenu: BaseTransformedProps<any>["onContextMenu"];
  labelMap: Record<string, string[]>;
  getCrossFilterDataMask: (value: string) => ContextMenuFilters["crossFilter"];
  formData: QueryFormData;
  coltypeMapping?: Record<string, number>;
}

const getCrossFilterDataMask =
  ({ selectedValues, groupby, labelMap }: GetCrossFilterDataMaskProps) =>
  (value: string) => {
    const selected = Object.values(selectedValues);
    const isCurrentValueSelected = selected.includes(value);

    if (!value || (!isCurrentValueSelected && !labelMap[value])) {
      return undefined;
    }

    const values = isCurrentValueSelected
      ? selected.filter((v) => v !== value)
      : [value];

    const groupbyValues = values
      .map((v) => labelMap[v])
      .filter(Boolean) as string[][];

    return {
      dataMask: {
        extraFormData: {
          filters:
            values.length === 0 || groupbyValues.length === 0
              ? []
              : groupby.map((col, idx) => {
                  const val = groupbyValues.map((v) => {
                    const metricsCount = v.length - groupby.length;
                    return v[metricsCount + idx];
                  });
                  if (val.every((vv) => vv == null)) {
                    return {
                      col,
                      op: "IS NULL" as const,
                    };
                  }
                  return {
                    col,
                    op: "IN" as const,
                    val: val as (string | number | boolean)[],
                  };
                }),
        },
        filterState: {
          value: groupbyValues.length ? groupbyValues : null,
          selectedValues: values.length ? values : null,
        },
      },
      isCurrentValueSelected,
    };
  };

export const contextMenuEventHandler =
  ({
    groupby,
    onContextMenu,
    labelMap,
    getCrossFilterDataMask,
    formData,
    coltypeMapping,
  }: ContextMenuEventHandlerProps) =>
  (e: Event) => {
    if (onContextMenu) {
      e.event.stop();
      const pointerEvent = e.event.event;
      const drillFilters: BinaryQueryObjectFilterClause[] = [];
      if (groupby.length > 0) {
        const values = labelMap[e.name];
        if (!values) {
          return;
        }
        groupby.forEach((dimension, i) => {
          drillFilters.push({
            col: dimension,
            op: "==",
            val: values[i],
            formattedVal: formatSeriesName({
              name: values[i],
              innerModule: {
                timeFormatter: getTimeFormatter(formData.dateFormat),
                numberFormatter: getNumberFormatter(formData.numberFormat),
                coltype: coltypeMapping?.[getColumnLabel(dimension)],
              },
            }),
          });
        });
      }
      onContextMenu(pointerEvent.clientX, pointerEvent.clientY, {
        drillToDetail: drillFilters,
        crossFilter:
          groupby.length > 0 ? getCrossFilterDataMask(e.name) : undefined,
        drillBy: { filters: drillFilters, groupbyFieldName: "groupby" },
      });
    }
  };

export const clickEventHandler =
  (
    getCrossFilterDataMask: (
      value: string,
    ) => ContextMenuFilters["crossFilter"],
    setDataMask: (dataMask: DataMask) => void,
    emitCrossFilters?: boolean,
  ) =>
  ({ name }: { name: string }) => {
    if (!emitCrossFilters) {
      return;
    }
    const dataMask = getCrossFilterDataMask(name)?.dataMask;
    if (dataMask) {
      setDataMask(dataMask);
    }
  };

export const allEventHandlers = (
  transformedProps: BaseTransformedProps<any> & CrossFilterTransformedProps,
) => {
  const {
    groupby,
    onContextMenu,
    setDataMask,
    labelMap,
    emitCrossFilters,
    selectedValues,
    coltypeMapping,
    formData,
  } = transformedProps;
  const eventHandlers: EventHandlers = {
    click:
      groupby.length > 0
        ? clickEventHandler(
            getCrossFilterDataMask({ selectedValues, groupby, labelMap }),
            setDataMask,
            emitCrossFilters,
          )
        : () => {},
    contextmenu: contextMenuEventHandler({
      groupby,
      onContextMenu,
      labelMap,
      getCrossFilterDataMask: getCrossFilterDataMask({
        selectedValues,
        groupby,
        labelMap,
      }),
      formData,
      coltypeMapping,
    }),
  };
  return eventHandlers;
};
