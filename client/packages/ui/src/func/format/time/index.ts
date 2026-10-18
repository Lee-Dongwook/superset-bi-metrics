export type TimeFormatter = (value: Date | number | null | undefined) => string;

const TS_WITHOUT_TZ = /^(\d{4}-\d{2}-\d{2})[\sT](\d{2}:\d{2}:\d{2}(\.\d+)?)$/;

export function normalizeTimestamp(value: string): string {
  return value.replace(TS_WITHOUT_TZ, "$1T$2Z");
}

// ponytail: mock ignores `format`, always ISO date (UTC); port d3-time-format when smart_date etc. matter
export function getTimeFormatter(_format?: string): TimeFormatter {
  return (value) =>
    value == null ? "" : new Date(value).toISOString().slice(0, 10);
}
