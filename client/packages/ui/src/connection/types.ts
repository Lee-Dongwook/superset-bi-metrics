import { ClientInstance } from "./ClientFactory";

export type Body = RequestInit["body"];
export type Cache = RequestInit["cache"];
export type Credentials = RequestInit["credentials"];
export type Endpoint = string;

export type FetchRetryOptionsRetryDelay = (
  attempt: number,
  error: Error | null,
  response: Response | null,
) => number;

export type FetchRetryOptionsRetryOn = (
  attempt: number,
  error: Error | null,
  response: Response | null,
) => boolean;

export type FetchRetryOptions = {
  retries?: number;
  retryDelay?: number | FetchRetryOptionsRetryDelay;
  retryOn?: number[] | FetchRetryOptionsRetryOn;
};

export type Headers = { [k: string]: string };
export type Host = string;
export type JsonPrimitive = string | number | boolean | null;

export type StrictJsonValue =
  | JsonPrimitive
  | StrictJsonObject
  | StrictJsonArray;

export type StrictJsonArray = StrictJsonValue[];
export type StrictJsonObject = { [member: string]: StrictJsonValue };
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonArray = JsonValue[];
export type JsonObject = { [member: string]: any };

export type Payload = JsonObject | string | null;

export type Method = RequestInit["method"];
export type Mode = RequestInit["mode"];
export type Redirect = RequestInit["redirect"];
export type ClientTimeout = number | undefined;
export type ParseMethod =
  | "json"
  | "json-bigint"
  | "text"
  | "raw"
  | null
  | undefined;

export type Signal = RequestInit["signal"];
export type Stringify = boolean;
export type Url = string;

export interface RequestBase {
  body?: Body;
  credentials?: Credentials;
  fetchRetryOptions?: FetchRetryOptions;
  headers?: Headers;
  host?: Host;
  ignoreUnauthorized?: boolean;
  mode?: Mode;
  method?: Method;
  jsonPayload?: Payload;
  postPayload?: Payload | FormData;
  searchParams?: Payload | URLSearchParams;
  signal?: Signal;
  stringify?: Stringify;
  timeout?: ClientTimeout;
}

export interface CallApi extends RequestBase {
  url: Url;
  cache?: Cache;
  redirect?: Redirect;
}

export interface RequestWithEndpoint extends RequestBase {
  endpoint: Endpoint;
  url?: Url;
}

export interface RequestWithUrl extends RequestBase {
  url: Url;
  endpoint?: Endpoint;
}

export type RequestConfig = RequestWithEndpoint | RequestWithUrl;

export interface JsonResponse {
  response: Response;
  json: JsonObject;
}

export interface TextResponse {
  response: Response;
  text: string;
}

export type CsrfToken = string;
export type CsrfPromise = Promise<string | undefined>;
export type Protocol = "http:" | "https:";

export interface ClientConfig {
  host?: Host;
  protocol?: Protocol;
  appRoot?: string;
  credentials?: Credentials;
  csrfToken?: CsrfToken;
  guestToken?: string;
  guestTokenHeaderName?: string;
  fetchRetryOptions?: FetchRetryOptions;
  headers?: Headers;
  mode?: Mode;
  timeout?: ClientTimeout;
  unauthorizedHandler?: () => void;
}

export interface ClientInterface extends Pick<
  ClientInstance,
  | "delete"
  | "get"
  | "post"
  | "postForm"
  | "postBlob"
  | "put"
  | "request"
  | "init"
  | "isAuthenticated"
  | "reAuthenticate"
  | "getGuestToken"
  | "getUrl"
> {
  configure: (config?: ClientConfig) => ClientInterface;
  reset: () => void;
  getCSRFToken: () => CsrfPromise;
  guestTokenHeaderName?: string;
}

export type ClientResponse = Response | JsonResponse | TextResponse;
