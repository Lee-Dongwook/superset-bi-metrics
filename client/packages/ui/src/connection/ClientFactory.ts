import { sanitizeUrl } from "@braintree/sanitize-url";
import callApiAndParseWithTimeout from "./callApi/callApiAndParseWithTimeout";
import type {
  ClientConfig,
  ClientTimeout,
  Credentials,
  CsrfPromise,
  CsrfToken,
  FetchRetryOptions,
  Headers,
  Host,
  Mode,
  Protocol,
  RequestConfig,
  ParseMethod,
} from "./types";
import {
  CSRF_ERROR_TYPE,
  DEFAULT_APP_ROOT,
  DEFAULT_FETCH_RETRY_OPTIONS,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_UNAUTHORIZED,
} from "./constants";

const defaultUnauthorizedHandlerForPrefix = (appRoot: string) => () => {
  if (!window.location.pathname.startsWith(`${appRoot}/login`)) {
    window.location.href = `${appRoot}/login?next=${window.location.href}`;
  }
};

async function isCsrfError(rejection: unknown): Promise<boolean> {
  const response = rejection as Response | undefined;

  if (
    response?.status !== HTTP_STATUS_BAD_REQUEST ||
    typeof response?.clone !== "function"
  ) {
    return false;
  }

  try {
    const body = await response?.clone().json();
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

export function createClient(config: ClientConfig = {}) {
  const {
    host = "localhost",
    protocol = "https:",
    appRoot = DEFAULT_APP_ROOT,
    headers = {},
    fetchRetryOptions = {},
    mode = "same-origin",
    timeout,
    credentials = undefined,
    csrfToken: initialCsrfToken = undefined,
    guestToken = undefined,
    guestTokenHeaderName = "X-GuestToken",
    unauthorizedHandler = undefined,
  } = config;

  const url = new URL(`${protocol}//${host}`);
  const cleanedAppRoot = appRoot.replace(/\/$/, "");
  const clientHost = url.host;
  const clientProtocol = url.protocol as Protocol;

  let csrfToken: CsrfToken | undefined = initialCsrfToken;
  let csrfPromise: CsrfPromise | undefined =
    typeof csrfToken === "string" ? Promise.resolve(csrfToken) : undefined;
  let csrfRefreshPromise: Promise<void> | undefined;

  let currentHeaders: Headers = {
    Accept: "application/json",
    ...headers,
    ...(typeof csrfToken === "string" ? { "X-CSRFToken": csrfToken } : {}),
    ...(guestToken ? { [guestTokenHeaderName]: guestToken } : {}),
  };

  const resolvedFetchRetryOptions: FetchRetryOptions = {
    ...DEFAULT_FETCH_RETRY_OPTIONS,
    ...fetchRetryOptions,
  };

  const handleUnauthorized =
    unauthorizedHandler !== undefined
      ? unauthorizedHandler
      : defaultUnauthorizedHandlerForPrefix(cleanedAppRoot);

  const getUrl = ({
    host: inputHost,
    endpoint = "",
    url: targetUrl,
  }: {
    endpoint?: string;
    host?: Host;
    url?: string;
  } = {}) => {
    if (typeof targetUrl === "string") return targetUrl;

    const h = inputHost ?? clientHost;
    const cleanHost = h.endsWith("/") ? h.slice(0, -1) : h;

    let cleanEndpoint = endpoint;
    if (cleanedAppRoot) {
      if (cleanEndpoint === cleanedAppRoot) {
        cleanEndpoint = "";
      } else if (cleanEndpoint.startsWith(`${cleanedAppRoot}/`)) {
        cleanEndpoint = cleanEndpoint.slice(cleanedAppRoot.length);
      }
    }

    return `${clientProtocol}//${cleanHost}${cleanedAppRoot}/${
      cleanEndpoint.startsWith("/") ? cleanEndpoint.slice(1) : cleanEndpoint
    }`;
  };

  const isAuthenticated = (): boolean =>
    csrfToken !== null && csrfToken !== undefined;

  const getGuestToken = () => guestToken;

  const ensureAuth = async (): CsrfPromise => {
    return (
      csrfPromise ??
      // eslint-disable-next-line prefer-promise-reject-errors
      Promise.reject({
        error: `SupersetClient has not been provided a CSRF token, ensure it is initialized with client.getCSRFToken() or try logging in at ${getUrl({ endpoint: "/login" })}`,
      })
    );
  };

  const fetchCSRFToken = async () => {
    csrfToken = undefined;
    csrfPromise = callApiAndParseWithTimeout({
      credentials,
      headers: { ...currentHeaders },
      method: "GET",
      mode,
      timeout,
      url: getUrl({ endpoint: "/api/v1/security/csrf_token/" }),
      parseMethod: "json",
    }).then(({ json }: { json: any }) => {
      if (typeof json === "object" && json !== null) {
        csrfToken = (json as any).result as string;
        if (typeof csrfToken === "string") {
          currentHeaders = { ...currentHeaders, "X-CSRFToken": csrfToken };
        }
      }
      if (isAuthenticated()) {
        return csrfToken!;
      }
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject({ error: "Failed to fetch CSRF token" });
    });
    return csrfPromise;
  };

  const init = async (force = false): CsrfPromise => {
    if (isAuthenticated() && !force) {
      return csrfPromise as CsrfPromise;
    }
    return fetchCSRFToken();
  };

  const refreshCSRFToken = async (): Promise<void> => {
    csrfRefreshPromise ??= init(true)
      .then(() => undefined)
      .catch((error: any) => {
        csrfPromise = undefined;
        throw error;
      })
      .finally(() => {
        csrfRefreshPromise = undefined;
      });
    return csrfRefreshPromise;
  };

  const reAuthenticate = () => init(true);

  const request = async <T extends ParseMethod = "json">({
    credentials: reqCredentials,
    mode: reqMode,
    endpoint,
    host: reqHost,
    url: reqUrl,
    headers: reqHeaders,
    timeout: reqTimeout,
    fetchRetryOptions: reqFetchRetryOptions,
    ignoreUnauthorized = false,
    ...rest
  }: RequestConfig & { parseMethod?: T }) => {
    await ensureAuth();

    const call = () =>
      callApiAndParseWithTimeout({
        ...rest,
        credentials: reqCredentials ?? credentials,
        mode: reqMode ?? mode,
        url: getUrl({ endpoint, host: reqHost, url: reqUrl }),
        headers: { ...currentHeaders, ...reqHeaders },
        timeout: reqTimeout ?? timeout,
        fetchRetryOptions: reqFetchRetryOptions ?? resolvedFetchRetryOptions,
      });

    const handleUnauthorizedError = (res: { status?: number }) => {
      if (res?.status === HTTP_STATUS_UNAUTHORIZED && !ignoreUnauthorized) {
        handleUnauthorized();
      }
      return Promise.reject(res);
    };

    return call().catch(async (res: any) => {
      if (res?.status === HTTP_STATUS_UNAUTHORIZED) {
        return handleUnauthorizedError(res);
      }
      if (!(await isCsrfError(res))) {
        return Promise.reject(res);
      }
      try {
        await refreshCSRFToken();
      } catch {
        return Promise.reject(res);
      }
      return call().catch(handleUnauthorizedError);
    });
  };

  const get = async <T extends ParseMethod = "json">(
    requestConfig: RequestConfig & { parseMethod?: T },
  ) => request({ ...requestConfig, method: "GET" });

  const deleteReq = async <T extends ParseMethod = "json">(
    requestConfig: RequestConfig & { parseMethod?: T },
  ) => request({ ...requestConfig, method: "DELETE" });

  const put = async <T extends ParseMethod = "json">(
    requestConfig: RequestConfig & { parseMethod?: T },
  ) => request({ ...requestConfig, method: "PUT" });

  const post = async <T extends ParseMethod = "json">(
    requestConfig: RequestConfig & { parseMethod?: T },
  ) => request({ ...requestConfig, method: "POST" });

  const postBlob = async (
    endpoint: string,
    payload: Record<string, any>,
  ): Promise<Response> => {
    await ensureAuth();
    return post({
      endpoint,
      postPayload: payload,
      parseMethod: "raw",
      stringify: false,
    });
  };

  const postForm = async (
    endpointOrConfig: string | { endpoint?: string; url?: string },
    payload: Record<string, any>,
    target = "_blank",
  ) => {
    const { endpoint, url } =
      typeof endpointOrConfig === "string"
        ? { endpoint: endpointOrConfig, url: undefined }
        : endpointOrConfig;
    if (endpoint || url) {
      const actionUrl = sanitizeUrl(getUrl({ endpoint, url }));
      if (url) {
        const targetUrl = new URL(actionUrl, window.location.origin);
        const allowedOrigins = [
          window.location.origin,
          `${clientProtocol}//${clientHost}`,
        ];
        if (!allowedOrigins.includes(targetUrl.origin)) {
          throw new Error("postForm url must be same-origin");
        }
      }
      await ensureAuth();
      const hiddenForm = document.createElement("form");
      hiddenForm.action = actionUrl;
      hiddenForm.method = "POST";
      hiddenForm.target = target;
      const payloadWithToken: Record<string, any> = {
        ...payload,
        csrf_token: csrfToken!,
      };

      if (guestToken) {
        payloadWithToken.guest_token = guestToken;
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
      document.body.removeChild(hiddenForm);
    }
  };

  return {
    init,
    postForm,
    postBlob,
    reAuthenticate,
    isAuthenticated,
    getGuestToken,
    get,
    delete: deleteReq,
    put,
    post,
    request,
    refreshCSRFToken,
    ensureAuth,
    fetchCSRFToken,
    getCSRFToken: () => csrfToken || fetchCSRFToken(),
    getUrl,
  };
}

export type ClientInstance = ReturnType<typeof createClient>;
