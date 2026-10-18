import { QueryFormColumn, QueryFormOrderBy } from "@bi-metrics/ui";

export function buildColumnsOrderBy(
  columns: (QueryFormColumn | string | undefined | null)[],
  ascending: boolean = true,
): QueryFormOrderBy[] {
  return columns
    .filter((col): col is string => typeof col === "string" && col !== "")
    .map((col) => [col, ascending]);
}

export function applyOrderBy(
  orderby: QueryFormOrderBy[],
  rowLimit: string | number | undefined | null,
): { orderby: QueryFormOrderBy[] } | Record<string, never> {
  const parsedRowLimit =
    typeof rowLimit === "string" ? Number(rowLimit) : rowLimit;
  const shouldApply =
    rowLimit !== undefined &&
    rowLimit !== null &&
    (Number.isNaN(parsedRowLimit) || parsedRowLimit !== 0);
  return shouldApply && orderby.length > 0 ? { orderby } : {};
}
