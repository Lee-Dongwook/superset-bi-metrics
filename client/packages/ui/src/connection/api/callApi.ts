import fetchRetry from "fetch-retry";
import type { CallApi, Payload, JsonValue, JsonObject } from "../types";
import {
  CACHE_AVAILABLE,
  CACHE_KEY,
  HTTP_STATUS_NOT_MODIFIED,
  HTTP_STATUS_OK,
} from "../constants";

function tryParsePayload(payload: Payload) {
  try {
    return typeof payload === "string"
      ? (JSON.parse(payload) as JsonValue)
      : payload;
  } catch {
    throw new Error(`Invalid payload: ${payload}`);
  }
}

function getFullUrl(partialUrl: string, params: CallApi["searchParams"]) {
  if (!params) return partialUrl;

  const search =
    params instanceof URLSearchParams ? params : new URLSearchParams(params);
  const searchString = search.toString();

  if (!searchString) return partialUrl;

  const url = new URL(partialUrl, window.location.href);
  url.search = searchString;

  return url.href;
}

function processMutationPayload(
  method: string,
  postPayload: Payload | undefined,
  jsonPayload: JsonValue | undefined,
  stringify: boolean,
  url: string,
) {
  if (method !== "POST" && method !== "PATCH" && method !== "PUT") {
    return { body: undefined, headers: undefined };
  }

  if (postPayload && jsonPayload !== undefined) {
    throw new Error("Please provide only one of jsonPayload or postPayload");
  }

  if (jsonPayload !== undefined) {
    return {
      body: JSON.stringify(jsonPayload),
      headers: { "Content-Type": "application/json" },
    };
  }

  if (postPayload instanceof FormData) {
    return { body: postPayload, headers: undefined };
  }

  if (postPayload) {
    const payload = tryParsePayload(postPayload);
    if (payload && typeof payload === "object") {
      const formData = new FormData();
      Object.keys(payload).forEach((key) => {
        const value = (payload as JsonObject)[key] as JsonValue;
        if (value !== undefined) {
          let valueString: string | undefined;
          try {
            valueString = stringify ? JSON.stringify(value) : String(value);
          } catch (e) {
            console.error(
              `Unable to convert attribute '${key}' to a String(). '${key}' was not added to the formData in request.body for call to ${url}`,
              value,
              e,
            );
          }
          if (valueString !== undefined) {
            formData.append(key, valueString);
          }
        }
      });
      return { body: formData, headers: undefined };
    }
  }

  return { body: undefined, headers: undefined };
}

async function fetchWithCache(
  url: string,
  request: RequestInit,
  fetchWithRetry: ReturnType<typeof fetchRetry>,
): Promise<Response> {
  let clientCache: Cache | null = null;

  try {
    clientCache = await caches.open(CACHE_KEY);
    const cachedResponse = await clientCache.match(url);
    if (cachedResponse) {
      const etag = cachedResponse.headers.get("Etag") as string;
      request.headers = { ...request.headers, "If-None-Match": etag };
    }
  } catch {}

  const response = await fetchWithRetry(url, request);

  if (clientCache && response.status === HTTP_STATUS_NOT_MODIFIED) {
    const cachedFullResponse = await clientCache.match(url);
    if (cachedFullResponse) {
      return cachedFullResponse.clone();
    }
    throw new Error("Received 304 but no content is cached!");
  }

  if (
    clientCache &&
    response.status === HTTP_STATUS_OK &&
    response.headers.get("Etag")
  ) {
    clientCache.delete(url);
    clientCache.put(url, response.clone());
  }

  return response;
}

export default async function callApi({
  body,
  cache = "default",
  credentials = "same-origin",
  fetchRetryOptions,
  headers,
  method = "GET",
  mode = "same-origin",
  postPayload,
  jsonPayload,
  redirect = "follow",
  signal,
  stringify = true,
  url: url_,
  searchParams,
}: CallApi): Promise<Response> {
  const fetchWithRetry = fetchRetry(fetch, fetchRetryOptions);
  const url = `${getFullUrl(url_, searchParams)}`;

  const request: RequestInit = {
    body,
    cache,
    credentials,
    headers,
    method,
    mode,
    redirect,
    signal,
  };

  const isCacheEligible =
    method === "GET" &&
    cache !== "no-store" &&
    cache !== "reload" &&
    CACHE_AVAILABLE &&
    window.location?.protocol === "https:";

  if (isCacheEligible) {
    return fetchWithCache(url, request, fetchWithRetry);
  }

  const { body: processedBody, headers: processedHeaders } =
    processMutationPayload(method, postPayload, jsonPayload, stringify, url);

  if (processedBody !== undefined) {
    request.body = processedBody;
  }

  if (processedHeaders) {
    request.headers = { ...request.headers, ...processedHeaders };
  }

  return fetchWithRetry(url, request);
}
