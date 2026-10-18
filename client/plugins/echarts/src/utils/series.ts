import {
  ValueFormatter,
  TimeFormatter,
  DataRecordValue,
  normalizeTimestamp,
  NumberFormatter,
} from "@bi-metrics/ui";
import { GenericDataType } from "packages/core/lib/common";
import { NULL_STRING } from "../constants";

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
