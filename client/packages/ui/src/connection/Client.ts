import { createClient, type ClientInstance } from "./ClientFactory";
import { DEFAULT_GUEST_TOKEN_HEADER_NAME } from "./constants";
import type { ClientInterface } from "./types";

let singletonClient: ClientInstance | undefined;

function getInstance(): ClientInstance {
  if (!singletonClient) {
    throw new Error("Call configure before calling other methods");
  }
  return singletonClient;
}

const Client: ClientInterface = {
  configure: (config) => {
    singletonClient = createClient(config);
    return Client;
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
      return DEFAULT_GUEST_TOKEN_HEADER_NAME;
    }
  },
};

export default Client;
