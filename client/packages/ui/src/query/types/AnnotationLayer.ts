import { TimeGranularity } from "@bi-metrics/ui/formats";

export enum AnnotationType {
  Event = "EVENT",
  Formula = "FORMULA",
  Interval = "INTERVAL",
  Timeseries = "TIME_SERIES",
}

export enum AnnotationSourceType {
  Line = "line",
  Native = "NATIVE",
  Table = "table",
  Undefined = "",
}

export enum AnnotationOpacity {
  High = "opacityHigh",
  Low = "opacityLow",
  Medium = "opacityMedium",
  Undefined = "",
}

export enum AnnotationStyle {
  Dashed = "dashed",
  Dotted = "dotted",
  Solid = "solid",
  LongDashed = "longDashed",
}

type BaseAnnotationLayer = {
  color?: string | null;
  name: string;
  opacity?: AnnotationOpacity;
  show: boolean;
  showLabel: boolean;
  style: AnnotationStyle;
  width?: number;
};

type AnnotationOverrides = {
  granularity?: string | null;
  time_grain_sqla?: TimeGranularity | null;
  time_range?: string | null;
  time_shift?: string | null;
};

type LineSourceAnnotationLayer = {
  hideLine?: boolean;
  overrides?: AnnotationOverrides;
  sourceType: AnnotationSourceType.Line;
  titleColumn?: string;
  value: number;
};

type NativeSourceAnnotationLayer = {
  sourceType: AnnotationSourceType.Native;
  value: number;
};

type TableSourceAnnotationLayer = {
  descriptionColumns?: string[];
  timeColumn?: string;
  intervalEndColumn?: string;
  overrides?: AnnotationOverrides;
  sourceType: AnnotationSourceType.Table;
  titleColumn?: string;
  value: number;
};

export type EventAnnotationLayer = BaseAnnotationLayer &
  (TableSourceAnnotationLayer | NativeSourceAnnotationLayer) & {
    annotationType: AnnotationType.Event;
  };

export type IntervalAnnotationLayer = BaseAnnotationLayer &
  (TableSourceAnnotationLayer | NativeSourceAnnotationLayer) & {
    annotationType: AnnotationType.Interval;
  };

export type TableAnnotationLayer = BaseAnnotationLayer &
  TableSourceAnnotationLayer & {
    annotationType: AnnotationType.Event | AnnotationType.Interval;
  };

export type FormulaAnnotationLayer = BaseAnnotationLayer & {
  annotationType: AnnotationType.Formula;
  sourceType?: AnnotationSourceType.Undefined;
  value: string;
};

export type TimeseriesAnnotationLayer = BaseAnnotationLayer &
  LineSourceAnnotationLayer & {
    annotationType: AnnotationType.Timeseries;
    showMarkers?: boolean;
    value: number;
  };

export type AnnotationLayer =
  | EventAnnotationLayer
  | IntervalAnnotationLayer
  | FormulaAnnotationLayer
  | TimeseriesAnnotationLayer
  | TableAnnotationLayer;
