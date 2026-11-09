import BiMetricsClientClass from "./class";
import { BiMetricsClientInterface } from "./types";

let singletonClient: BiMetricsClientClass | undefined;

function getInstance(): BiMetricsClientClass {
  if (!singletonClient) {
    throw new Error(
      "You must call BiMetricsClient.configure(...) before calling other methods",
    );
  }
  return singletonClient;
}

const BiMetricsClient: BiMetricsClientInterface = {
  configure: (config) => {
    singletonClient = new BiMetricsClientClass(config);
    return BiMetricsClient;
  },
  reset: () => {
    singletonClient = undefined;
  },
  delete: (request) => getInstance().delete(request),
  get: (request) => getInstance().get(request),
  init: (force) => getInstance().init(force),
  isAuthenticated: () => getInstance().isAuthenticated(),
  getGuestToken: () => getInstance().getGuestToken(),
  post: (request) => getInstance().post(request),
  postForm: (...args) => getInstance().postForm(...args),
  put: (request) => getInstance().put(request),
  reAuthenticate: () => getInstance().reAuthenticate(),
  request: (request) => getInstance().request(request),
  getCSRFToken: () => getInstance().getCSRFToken(),
  getUrl: (...args) => getInstance().getUrl(...args),
  postBlob: (endpoint, payload) => getInstance().postBlob(endpoint, payload),
  get guestTokenHeaderName() {
    try {
      return getInstance().guestTokenHeaderName;
    } catch {
      return "X-GuestToken";
    }
  },
};

export default BiMetricsClient;
