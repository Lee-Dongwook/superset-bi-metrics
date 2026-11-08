import { sanitizeUrl } from "@braintree/sanitize-url";

import { DEFAULT_APP_ROOT, DEFAULT_FETCH_RETRY_OPTIONS } from "./constants";
import {
  ClientConfig,
  ClientTimeout,
  Credentials,
  CsrfPromise,
  CsrfToken,
  FetchRetryOptions,
  Host,
  Mode,
  Protocol,
} from "./types";

const defaultUnauthorizedHandlerForPrefix = (appRoot: string) => () => {
  if (!window.location.pathname.startsWith(`${appRoot}/login`)) {
    window.location.href = `${appRoot}/login?next=${encodeURIComponent(
      window.location.href,
    )}`;
  }
};

export default class BiMetricsClientClass {
  credentials: Credentials;
  csrfToken?: CsrfToken;
  csrfPromise?: CsrfPromise;
  csrfRefreshPromise?: Promise<void>;
  guestToken?: string;
  guestTokenHeaderName: string;
  fetchRetryOptions?: FetchRetryOptions;
  appRoot?: string;
  protocol: Protocol;
  host: Host;
  headers: Headers;
  mode: Mode;
  timeout: ClientTimeout;
  handleUnauthorized: () => void;

  constructor({
    host,
    protocol,
    appRoot = DEFAULT_APP_ROOT,
    headers = {},
    fetchRetryOptions = {},
    mode = "same-origin",
    timeout,
    credentials = undefined,
    csrfToken = undefined,
    guestToken = undefined,
    guestTokenHeaderName = "X-GuestToken",
    unauthorizedHandler = undefined,
  }: ClientConfig = {}) {
    const url = new URL(`${protocol || "https:"}//${host || "localhost"}`);

    this.appRoot = appRoot.replace(/\/$/, "");
    this.host = url.host;
    this.protocol = url.protocol as Protocol;
    this.headers = { Accept: "application/json", ...headers };
    this.mode = mode;
    this.timeout = timeout;
    this.credentials = credentials;
    this.csrfToken = csrfToken;
    this.guestToken = guestToken;
    this.guestTokenHeaderName = guestTokenHeaderName;
    this.fetchRetryOptions = {
      ...DEFAULT_FETCH_RETRY_OPTIONS,
      ...fetchRetryOptions,
    };

    if (typeof this.csrfToken === "string") {
      this.headers = { ...this.headers, "X-CSRFToken": this.csrfToken };
      this.csrfPromise = Promise.resolve(this.csrfToken);
    }
    if (guestToken) {
      this.headers[guestTokenHeaderName] = guestToken;
    }

    this.handleUnauthorized =
      unauthorizedHandler ?? defaultUnauthorizedHandlerForPrefix(this.appRoot);
  }

  async init(force = false): CsrfPromise {
    if (this.isAuthenticated() && !force) {
      return this.csrfPromise as CsrfPromise;
    }
    return this.fetchCSRFToken();
  }

  async postForm(
    endpointOrConfig: string | { endpoint?: string; url?: string },
    payload: Record<string, any>,
    target = "_blank",
  ) {
    const { endpoint, url } =
      typeof endpointOrConfig === "string"
        ? {
            endpoint: endpointOrConfig,
            url: undefined,
          }
        : endpointOrConfig;

    if (endpoint || url) {
      const actionUrl = sanitizeUrl(this.getUrl({ endpoint, url }));
      if (url) {
        const target = new URL(actionUrl, window.location.origin);

        const allowedOrigins = [
          window.location.origin,
          `${this.protocol}//${this.host}`,
        ];

        if (!allowedOrigins.includes(target.origin)) {
          throw new Error("postForm url must be same-origin");
        }
      }
    }
  }
}
