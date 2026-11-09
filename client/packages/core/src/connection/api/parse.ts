import _JSONbig from "json-bigint";
import { cloneDeepWith } from "lodash-es";

import { JsonResponse, ParseMethod, TextResponse } from "../types";

const JSONbig = _JSONbig({ constructorAction: "preserve" });

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

  // reject failed HTTP requests with the raw response
  if (!response.ok) {
    return Promise.reject(response);
  }

  if (parseMethod === null || parseMethod === "raw") {
    return response as ReturnType;
  }

  if (parseMethod === "text") {
    const text = await response.text();
    return { response, text } as TextResponse as ReturnType;
  }

  if (parseMethod === "json-bigint") {
    const json = JSONbig.parse(await response.text());
    const decoded = cloneDeepWith(json, (value: any) => {
      if (
        value?.isInteger?.() === true &&
        (value?.isGreaterThan?.(Number.MAX_SAFE_INTEGER) ||
          value?.isLessThan?.(Number.MIN_SAFE_INTEGER))
      ) {
        // toFixed() avoids scientific notation, which BigInt() rejects
        return BigInt(value.toFixed());
      }
      // json-bigint handles floats poorly (sidorares/json-bigint#62)
      if (value?.isNaN?.() === false) {
        return value?.toNumber?.();
      }
      return undefined;
    });
    return { response, json: decoded } as JsonResponse as ReturnType;
  }

  if (parseMethod === undefined || parseMethod === "json") {
    const json = await response.json();
    return { response, json } as JsonResponse as ReturnType;
  }

  throw new Error(
    `Expected parseResponse=json|json-bigint|text|raw|null, got '${parseMethod}'.`,
  );
}
