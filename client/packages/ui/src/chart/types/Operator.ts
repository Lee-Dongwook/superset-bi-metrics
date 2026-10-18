const UNARY_OPERATORS = ["IS NOT NULL", "IS NULL"] as const;
const BINARY_OPERATORS = [
  "==",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "ILIKE",
  "LIKE",
  "NOT ILIKE",
  "NOT LIKE",
  "REGEX",
  "TEMPORAL_RANGE",
] as const;
const SET_OPERATORS = ["IN", "NOT IN"] as const;

export type UnaryOperator = (typeof UNARY_OPERATORS)[number];
export type BinaryOperator = (typeof BINARY_OPERATORS)[number];
export type SetOperator = (typeof SET_OPERATORS)[number];
