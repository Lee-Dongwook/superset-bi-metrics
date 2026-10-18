export type NumberFormatter = (value: number | null | undefined) => string;
export type ValueFormatter = NumberFormatter;

export const NumberFormats = {
  PERCENT: ".1%",
  PERCENT_2_POINT: ".2%",
  PERCENT_3_POINT: ".3%",
  SMART_NUMBER: "SMART_NUMBER",
} as const;

// ponytail: mock on Intl.NumberFormat — only percent (".N%") and compact; port d3-format when control-panel formats matter
export function getNumberFormatter(format?: string): NumberFormatter {
  const percent = format?.match(/\.(\d)%$/);
  const intl = percent
    ? new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: Number(percent[1]),
        maximumFractionDigits: Number(percent[1]),
      })
    : new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 2,
      });
  return (value) => (value == null ? "" : intl.format(value));
}
