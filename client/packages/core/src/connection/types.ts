import BiMetricsClientClass from "./class";

export type JsonObject = { [member: string]: any };

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

export type Payload = JsonObject | string | null;
export type Credentials = RequestInit["credentials"];
export type Method = RequestInit["method"];
export type Mode = RequestInit["mode"];
export type Signal = RequestInit["signal"];

export type CsrfToken = string;
export type Stringify = boolean;
export type CsrfPromise = Promise<string | undefined>;
export type Host = string;
export type Endpoint = string;
export type Url = string;
export type Protocol = "http:" | "https:";
export type ClientTimeout = number | undefined;

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
  | "isAutenticated"
  | "reAuthenticate"
  | "getGuestToken"
  | "getUrl"
> {
  configure: (config?: ClientConfig) => BiMetricsClientInterface;
  reset: () => void;
  getCSRFToken: () => CsrfPromise;
  guestTokenHeaderName?: string;
}
