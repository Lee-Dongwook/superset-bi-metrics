import _JSONbig from "json-bigint";
import { cloneDeepWith } from "lodash-es";

import type { ParseMethod, TextResponse, JsonResponse } from "../types";

const JSONbig = _JSONbig({
  constructorAction: "preserve",
});

function transformBigNumber(value: any) {
  if (
    value?.isInteger?.() === true &&
    (value?.isGreaterThan?.(Number.MAX_SAFE_INTEGER) ||
      value?.isLessThan?.(Number.MIN_SAFE_INTEGER))
  ) {
    return BigInt(value.toFixed());
  }

  if (value?.isNaN?.() === false) {
    return value?.toNumber?.();
  }

  return undefined;
}

export default async function parseResponse<T extends ParseMethod = "json">(
  apiPromise: Promise<Response>,
  parseMethod?: T,
) {
  type ReturnType = T extends "raw" | null
    ? Response
    : T extends "json" | "json-bigint" | undefined
      ? JsonResponse
      : T extends "text"
        ? TextResponse
        : never;

  const response = await apiPromise;

  if (!response.ok) {
    return Promise.reject(response);
  }

  switch (parseMethod) {
    case "raw":
    case null as unknown as T:
      return response as ReturnType;

    case "text": {
      const text = await response.text();
      return { response, text } as ReturnType;
    }

    case "json-bigint": {
      const rawData = await response.text();
      const json = JSONbig.parse(rawData);
      const decoded = cloneDeepWith(json, transformBigNumber);
      return { response, json: decoded } as ReturnType;
    }

    case "json":
    case undefined: {
      const json = await response.json();
      return { response, json } as ReturnType;
    }

    default:
      throw new Error(
        `Expected parseResponse=json|json-bigint|text|raw|null, got '${parseMethod}'.`,
      );
  }
}
