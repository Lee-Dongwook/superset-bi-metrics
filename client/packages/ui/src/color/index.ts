const BI_METRICS_COLORS = [
  "#1FA8C9",
  "#454E7C",
  "#5AC189",
  "#FF7F44",
  "#666666",
  "#E04355",
  "#FCC700",
  "#A868B7",
  "#3CCCCB",
  "#A38F79",
  "#8FD3E4",
  "#A1A6BD",
];

export type CategoricalColorScale = (value: string, sliceId?: number) => string;

// ponytail: mock, one palette for every scheme; add registry when color schemes are configurable
function getScale(_scheme?: string): CategoricalColorScale {
  const assigned = new Map<string, string>();
  return (value) => {
    if (!assigned.has(value)) {
      assigned.set(
        value,
        BI_METRICS_COLORS[assigned.size % BI_METRICS_COLORS.length],
      );
    }
    return assigned.get(value)!;
  };
}

export const CategoricalColorNamespace = { getScale };
