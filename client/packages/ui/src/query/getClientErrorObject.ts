import { t } from "@bi-metrics/core/translation";
// import { COMMON_ERR_MESSAGES } from "../connection/constants";
import { ClientResponse } from "../connection";
import { BiMetricsError } from "./types/Query";
import { isJsonString, isProbablyHTML } from "../utils/html";

export type ClientErrorObject = {
  error: string;
  errors?: BiMetricsError[];
  link?: string;
  message?: string;
  severity?: string;
  stacktrace?: string;
  status?: number;
  statusText?: string;
} & Partial<ClientResponse>;

interface TimeoutError {
  statusText: "timeout";
  timeout: number;
}

// type ErrorType =
//   | ClientResponse
//   | TimeoutError
//   | { response: Response }
//   | string;

// type ErrorTextSource = "dashboard" | "chart" | "query" | "dataset" | "database";

const ERROR_CODE_LOOKUP = {
  400: "Bad request",
  401: "Unauthorized",
  402: "Payment required",
  403: "Forbidden",
  404: "Not found",
  405: "Method not allowed",
  406: "Not acceptable",
  407: "Proxy authentication required",
  408: "Request timeout",
  409: "Conflict",
  410: "Gone",
  411: "Length required",
  412: "Precondition failed",
  413: "Payload too large",
  414: "URI too long",
  415: "Unsupported media type",
  416: "Range not satisfiable",
  417: "Expectation failed",
  418: "I'm a teapot",
  500: "Server error",
  501: "Not implemented",
  502: "Bad gateway",
  503: "Service unavailable",
  504: "Gateway timeout",
  505: "HTTP version not supported",
  506: "Variant also negotiates",
  507: "Insufficient storage",
  508: "Loop detected",
  510: "Not extended",
  511: "Network authentication required",
  599: "Network error",
};

export function checkForHtml(str: string): boolean {
  if (isJsonString(str)) {
    return false;
  }
  const trimmed = str.trimStart();
  if (!trimmed.startsWith("<")) {
    return false;
  }
  if (!/^<!doctype html>/i.test(trimmed)) {
    const leadingTag = trimmed.match(/^<([a-z][a-z0-9]*)\b/i)?.[1];
    if (!leadingTag || !new RegExp(`</${leadingTag}\\s*>`, "i").test(str)) {
      return false;
    }
  }
  return isProbablyHTML(str);
}

export function parseStringResponse(str: string): string {
  if (checkForHtml(str)) {
    for (const [code, message] of Object.entries(ERROR_CODE_LOOKUP)) {
      const regex = new RegExp(`${code}|${message}`, "i");
      if (regex.test(str)) {
        return t(message);
      }
    }
    return t("Unknown error");
  }
  return str;
}

export function getErrorFromStatusCode(status: number): string | null {
  return ERROR_CODE_LOOKUP[status as keyof typeof ERROR_CODE_LOOKUP] || null;
}

export function getClientErrorObject(
  response: ClientResponse | TimeoutError | { response: Response } | string,
): Promise<ClientErrorObject> {
  return new Promise((resolve) => {
    if (typeof response === "string") {
      resolve({ error: parseStringResponse(response) });
      return;
    }
  });
}
