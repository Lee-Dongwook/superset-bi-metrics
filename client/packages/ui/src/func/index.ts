import Mexp from "math-expression-evaluator";

export * from "./format";

const mexp = new Mexp();

const REPLACE_OPERATORS: [RegExp, string][] = [
  [/==/g, "Eq"],
  [/>=/g, "Gte"],
  [/<=/g, "Lte"],
  [/>/g, "Gt"],
  [/</g, "Lt"],
];

const TOKENS = [
  {
    type: 3,
    token: "x",
    show: "x",
    value: "x",
  },
  {
    type: 2,
    token: "&",
    show: "&",
    value: (a: number, b: number): number => a & b,
  },
  {
    type: 2,
    token: "|",
    show: "|",
    value: (a: number, b: number): number => a | b,
  },
  {
    type: 2,
    token: "and",
    show: "and",
    value: (a: number, b: number): number => a && b,
  },
  {
    type: 2,
    token: "xor",
    show: "xor",
    value: (a: number, b: number): number => a ^ b,
  },
  {
    type: 2,
    token: "or",
    show: "or",
    value: (a: number, b: number): number => Number(a || b),
  },
  {
    type: 2,
    token: "Eq",
    show: "Eq",
    value: (a: number, b: number): number => Number(a === b),
  },
  {
    type: 2,
    token: "Lt",
    show: "Lt",
    value: (a: number, b: number): number => Number(a < b),
  },
  {
    type: 2,
    token: "Lte",
    show: "Lte",
    value: (a: number, b: number): number => Number(a <= b),
  },
  {
    type: 2,
    token: "Gt",
    show: "Gt",
    value: (a: number, b: number): number => Number(a > b),
  },
  {
    type: 2,
    token: "Gte",
    show: "Gte",
    value: (a: number, b: number): number => Number(a >= b),
  },
];

export function evalExpression(expression: string, value: number): number {
  let parsedExpression = expression;

  REPLACE_OPERATORS.forEach(([pattern, operator]) => {
    parsedExpression = parsedExpression.replace(pattern, operator);
  });

  const subExpressions = String(parsedExpression).split("=");
  parsedExpression = subExpressions[1] ?? subExpressions[0];

  // @ts-expect-error
  return Number(mexp.eval(parsedExpression, TOKENS, { x: value }));
}

export function isValidExpression(expression: string): boolean {
  try {
    evalExpression(expression, 0);
  } catch {
    return false;
  }
  return true;
}
