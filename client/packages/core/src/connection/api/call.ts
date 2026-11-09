import fetchRetry from "fetch-retry";
import { CallApi, JsonObject, JsonValue, Payload } from "../types";
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
  } catch (error) {
    throw new Error(`Invalid payload:\n\n${payload}`);
  }
}

function getFullUrl(partialUrl: string, params: CallApi["searchParams"]) {
  if (params) {
    const search =
      params instanceof URLSearchParams ? params : new URLSearchParams(params);
    const searchString = search.toString();
    if (searchString) {
      const url = new URL(partialUrl, window.location.href);
      url.search = searchString;
      return url.href;
    }
  }
  return partialUrl;
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

  const request = {
    body,
    cache,
    credentials,
    headers,
    method,
    mode,
    redirect,
    signal,
  };

  if (
    method === "GET" &&
    cache !== "no-store" &&
    cache !== "reload" &&
    CACHE_AVAILABLE &&
    window.location?.protocol === "https:"
  ) {
    let Cache: Cache | null = null;

    try {
      Cache = await caches.open(CACHE_KEY);
      const cachedResponse = await Cache.match(url);

      if (cachedResponse) {
        const etag = cachedResponse.headers.get("Etag") as string;
        request.headers = { ...request.headers, "If-None-Match": etag };
      }
    } catch {}

    const response = await fetchWithRetry(url, request);

    if (Cache && response.status === HTTP_STATUS_NOT_MODIFIED) {
      const cachedFullResponse = await Cache.match(url);
      if (cachedFullResponse) {
        return cachedFullResponse.clone();
      }
      throw new Error("Received 304 but no content is cached!");
    }

    if (
      Cache &&
      response.status === HTTP_STATUS_OK &&
      response.headers.get("Etag")
    ) {
      void Cache.delete(url);
      void Cache.put(url, response.clone());
    }

    return response;
  }

  if (method === "POST" || method === "PATCH" || method === "PUT") {
    if (postPayload && jsonPayload) {
      throw new Error("Please provide only one of jsonPayload or postPayload");
    }

    if (postPayload instanceof FormData) {
      request.body = postPayload;
    } else if (postPayload) {
      const payload = tryParsePayload(postPayload);
      if (payload && typeof payload === "object") {
        const formData: FormData = new FormData();
        Object.keys(payload).forEach((key) => {
          const value = (payload as JsonObject)[key] as JsonValue;
          if (typeof value !== "undefined") {
            let valueString;
            try {
              valueString = stringify ? JSON.stringify(value) : String(value);
            } catch (e) {
              // eslint-disable-next-line no-console
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
        request.body = formData;
      }
    }
    if (jsonPayload !== undefined) {
      request.body = JSON.stringify(jsonPayload);
      request.headers = {
        ...request.headers,
        "Content-Type": "application/json",
      };
    }
  }

  return fetchWithRetry(url, request);
}
