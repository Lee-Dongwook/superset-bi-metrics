import { QueryFormMetric } from "@bi-metrics/ui/query/types";

export function getMetricLabel(metric: QueryFormMetric): string {
  if (typeof metric === "string") {
    return metric;
  }
  if (metric.label) {
    return metric.label;
  }
  if (metric.expressionType === "SIMPLE") {
    const columnName =
      metric.column.column_name ?? metric.column.columnName ?? "";
    return `${metric.aggregate}(${columnName})`;
  }
  return metric.sqlExpression;
}
