import { FetchRetryOptions } from "./types";

export const DEFAULT_APP_ROOT = "";
export const HTTP_STATUS_OK = 200;
export const HTTP_STATUS_NOT_MODIFIED = 304;
export const HTTP_STATUS_BAD_REQUEST = 400;
export const HTTP_STATUS_UNAUTHORIZED = 401;
export const CSRF_ERROR_TYPE = "CSRF_ERROR";

export const CACHE_AVAILABLE = "caches" in window;
export const CACHE_KEY = "TEST_CACHE_KEY";

export const DEFAULT_FETCH_RETRY_OPTIONS: FetchRetryOptions = {
  retries: 3,
  retryDelay: 1000,
  retryOn: [502, 503, 504],
};

export const COMMON_ERR_MESSAGES = {
  SESSION_TIMED_OUT:
    "Your session timed out, please refresh your page and try again.",
};
