import { sanitizeUrl } from "@braintree/sanitize-url";

import callApiAndParseWithTimeout from "./api";
import {
  CSRF_ERROR_TYPE,
  DEFAULT_APP_ROOT,
  DEFAULT_FETCH_RETRY_OPTIONS,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_UNAUTHORIZED,
} from "./constants";
import {
  ClientConfig,
  ClientTimeout,
  Credentials,
  CsrfPromise,
  CsrfToken,
  FetchRetryOptions,
  Host,
  Mode,
  ParseMethod,
  Protocol,
  RequestConfig,
  Headers,
} from "./types";

const defaultUnauthorizedHandlerForPrefix = (appRoot: string) => () => {
  if (!window.location.pathname.startsWith(`${appRoot}/login`)) {
    window.location.href = `${appRoot}/login?next=${encodeURIComponent(
      window.location.href,
    )}`;
  }
};

async function isCsrfError(rejection: unknown): Promise<boolean> {
  const response = rejection as Response | undefined;
  if (
    response?.status !== HTTP_STATUS_BAD_REQUEST ||
    typeof response.clone !== "function"
  ) {
    return false;
  }
  try {
    const body = await response.clone().json();
    return (
      body?.errors?.some(
        (error: { error_type?: string }) =>
          error?.error_type === CSRF_ERROR_TYPE,
      ) === true
    );
  } catch {
    return false;
  }
}

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

  isAuthenticated(): boolean {
    return this.csrfToken !== null && this.csrfToken !== undefined;
  }

  getGuestToken() {
    return this.guestToken;
  }

  async init(force = false): CsrfPromise {
    if (this.isAuthenticated() && !force) {
      return this.csrfPromise as CsrfPromise;
    }
    return this.fetchCSRFToken();
  }

  async reAuthenticate() {
    return this.init(true);
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

      await this.ensureAuth();
      const hiddenForm = document.createElement("form");

      hiddenForm.action = actionUrl;
      hiddenForm.method = "POST";
      hiddenForm.target = target;

      const payloadWithToken: Record<string, any> = {
        ...payload,
        csrf_token: this.csrfToken,
      };

      if (this.guestToken) {
        payloadWithToken.guest_token = this.guestToken;
      }

      Object.entries(payloadWithToken).forEach(([key, value]) => {
        const data = document.createElement("input");
        data.type = "hidden";
        data.name = key;
        data.value = value;
        hiddenForm.appendChild(data);
      });

      document.body.appendChild(hiddenForm);
      hiddenForm.submit();
      hiddenForm.remove();
    }
  }

  async request<T extends ParseMethod = "json">({
    credentials,
    mode,
    endpoint,
    host,
    url,
    headers,
    timeout,
    fetchRetryOptions,
    ignoreUnauthorized = false,
    ...rest
  }: RequestConfig & { parseMethod?: T }) {
    await this.ensureAuth();

    const call = () =>
      callApiAndParseWithTimeout({
        ...rest,
        credentials: credentials ?? this.credentials,
        mode: mode ?? this.mode,
        url: this.getUrl({ endpoint, host, url }),
        headers: { ...this.headers, ...headers },
        timeout: timeout ?? this.timeout,
        fetchRetryOptions: fetchRetryOptions ?? this.fetchRetryOptions,
      });

    const handleUnauthorized = (res: { status?: number }) => {
      if (res?.status === HTTP_STATUS_UNAUTHORIZED && !ignoreUnauthorized) {
        this.handleUnauthorized();
      }
      return Promise.reject(res);
    };

    return call().catch(async (res) => {
      if (res?.status === HTTP_STATUS_UNAUTHORIZED) {
        return handleUnauthorized(res);
      }
      if (!(await isCsrfError(res))) {
        return Promise.reject(res);
      }
      try {
        await this.refreshCSRFToken();
      } catch {
        return Promise.reject(res);
      }
      return call().catch(handleUnauthorized);
    });
  }

  async get<T extends ParseMethod = "json">(
    requestConfig: RequestConfig & { parseMethod?: T },
  ) {
    return this.request({ ...requestConfig, method: "GET" });
  }

  async delete<T extends ParseMethod = "json">(
    requestConfig: RequestConfig & { parseMethod?: T },
  ) {
    return this.request({ ...requestConfig, method: "DELETE" });
  }

  async put<T extends ParseMethod = "json">(
    requestConfig: RequestConfig & { parseMethod?: T },
  ) {
    return this.request({ ...requestConfig, method: "PUT" });
  }

  async post<T extends ParseMethod = "json">(
    requestConfig: RequestConfig & { parseMethod?: T },
  ) {
    return this.request({ ...requestConfig, method: "POST" });
  }

  async ensureAuth(): CsrfPromise {
    return (
      this.csrfPromise ??
      // eslint-disable-next-line prefer-promise-reject-errors
      Promise.reject({
        error: `Client has not been provided a CSRF token, ensure it is
        initialized with \`client.getCSRFToken()\` or try logging in at
        ${this.getUrl({ endpoint: "/login" })}`,
      })
    );
  }

  async postBlob(
    endpoint: string,
    payload: Record<string, any>,
  ): Promise<Response> {
    await this.ensureAuth();
    return this.post({
      endpoint,
      postPayload: payload,
      parseMethod: "raw",
      stringify: false,
    });
  }

  async refreshCSRFToken(): Promise<void> {
    this.csrfRefreshPromise ??= this.reAuthenticate()
      .then(() => undefined)
      .catch((error) => {
        this.csrfPromise = undefined;
        throw error;
      })
      .finally(() => {
        this.csrfRefreshPromise = undefined;
      });
    return this.csrfRefreshPromise;
  }

  async fetchCSRFToken() {
    this.csrfToken = undefined;
    this.csrfPromise = callApiAndParseWithTimeout({
      credentials: this.credentials,
      headers: {
        ...this.headers,
      },
      method: "GET",
      mode: this.mode,
      timeout: this.timeout,
      url: this.getUrl({ endpoint: "/api/v1/security/csrf_token/" }),
      parseMethod: "json",
    }).then(({ json }) => {
      if (typeof json === "object") {
        this.csrfToken = json.result as string;
        if (typeof this.csrfToken === "string") {
          this.headers = { ...this.headers, "X-CSRFToken": this.csrfToken };
        }
      }

      if (this.isAuthenticated()) {
        return this.csrfToken;
      }

      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject({ error: "Failed to fetch CSRF token" });
    });

    return this.csrfPromise;
  }

  async getCSRFToken() {
    return this.csrfToken || this.fetchCSRFToken();
  }

  getUrl({
    host: inputHost,
    endpoint = "",
    url,
  }: {
    endpoint?: string;
    host?: Host;
    url?: string;
  } = {}) {
    if (typeof url === "string") return url;

    const host = inputHost ?? this.host;
    const cleanHost = host.endsWith("/") ? host.slice(0, -1) : host;

    let cleanEndpoint = endpoint;

    const root = this.appRoot;

    if (root) {
      if (cleanEndpoint === root) {
        cleanEndpoint = "";
      } else if (cleanEndpoint.startsWith(`${root}/`)) {
        cleanEndpoint = cleanEndpoint.slice(root.length);
      }
    }

    return `${this.protocol}//${cleanHost}${this.appRoot}/${
      cleanEndpoint.startsWith("/") ? cleanEndpoint.slice(1) : cleanEndpoint
    }`;
  }
}
