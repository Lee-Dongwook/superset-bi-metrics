// import memoizeOne, { type MemoizedFn } from "memoize-one";
// import { isString, isBoolean } from "lodash-es";

export const round = (num: number, precision = 0) =>
  Number(`${Math.round(Number(`${num}e+${precision}`))}e-${precision}`);
