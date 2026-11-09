import BiMetricsClientClass from "./class";

export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [member: string]: any };
export type StrictJsonValue = JsonPrimitive | StrictJsonObject | StrictJsonArray;
export type StrictJsonArray = StrictJsonValue[];
export type StrictJsonObject = { [member: string]: StrictJsonValue };

export type FetchRetryOptionsRetryDelay =
  | number
  | ((
      attempt: number,
      error: Error | null,
      response: Response | null,
    ) => number);

export type FetchRetryOptionsRetryOn =
  | number[]
  | ((
      attempt: number,
      error: Error | null,
      response: Response | null,
    ) => boolean);

export type FetchRetryOptions = {
  retries?: number;
  retryDelay?: FetchRetryOptionsRetryDelay;
  retryOn?: FetchRetryOptionsRetryOn;
};

export type Body = RequestInit["body"];
export type Cache = RequestInit["cache"];
export type Headers = { [k: string]: string };
export type Payload = JsonObject | string | null;
export type Credentials = RequestInit["credentials"];
export type Method = RequestInit["method"];
export type Mode = RequestInit["mode"];
export type Signal = RequestInit["signal"];
export type Redirect = RequestInit["redirect"];

export type CsrfToken = string;
export type Stringify = boolean;
export type CsrfPromise = Promise<string | undefined>;
export type Host = string;
export type Endpoint = string;
export type Url = string;
export type Protocol = "http:" | "https:";
export type ClientTimeout = number | undefined;
export type ParseMethod =
  | "json"
  | "json-bigint"
  | "text"
  | "raw"
  | null
  | undefined;

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

export interface BiMetricsClientInterface extends Pick<
  BiMetricsClientClass,
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
  configure: (config?: ClientConfig) => BiMetricsClientInterface;
  reset: () => void;
  getCSRFToken: () => CsrfPromise;
  guestTokenHeaderName?: string;
}

export type BiMetricsClientResponse = Response | JsonResponse | TextResponse;
