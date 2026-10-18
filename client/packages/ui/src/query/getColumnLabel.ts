import { QueryFormColumn } from "@bi-metrics/ui/query/types";

export function getColumnLabel(column: QueryFormColumn): string {
  if (typeof column === "string") {
    return column;
  }
  return column.label ?? column.sqlExpression;
}
