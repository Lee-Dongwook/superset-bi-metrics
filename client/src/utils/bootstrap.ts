import { DEFAULT_BOOTSTRAP_DATA } from "../constants";
import type { BootstrapData } from "../types";
import { APP_ROOT_PATH_RE } from "./constants";

let cachedBootstrapData: BootstrapData | null = null;

// ponytail: dev-only fake user until the Flask backend injects bootstrap data.
const DEV_BOOTSTRAP_DATA: BootstrapData = {
  ...DEFAULT_BOOTSTRAP_DATA,
  user: {
    userId: 1,
    username: "admin",
    firstName: "Dev",
    lastName: "User",
    isActive: true,
    isAnonymous: false,
    permissions: {},
    roles: { Admin: [] },
    groups: [],
  },
};

const FALLBACK_BOOTSTRAP_DATA =
  process.env.NODE_ENV === "development"
    ? DEV_BOOTSTRAP_DATA
    : DEFAULT_BOOTSTRAP_DATA;

export default function getBootstrapData(): BootstrapData {
  if (cachedBootstrapData === null) {
    const appContainer = document.getElementById("app");
    const dataBootstrap = appContainer?.dataset.bootstrap;
    cachedBootstrapData = dataBootstrap
      ? JSON.parse(dataBootstrap)
      : FALLBACK_BOOTSTRAP_DATA;
  }
  return cachedBootstrapData ?? FALLBACK_BOOTSTRAP_DATA;
}

const normalizePathWithFallback = (
  path: string | undefined,
  fallback: string,
): string => (path ?? fallback).replace(/\/$/, "");

const sanitizeAppRoot = (root: string): string =>
  APP_ROOT_PATH_RE.test(root) ? root : "";

const APPLICATION_ROOT_NO_TRAILING_SLASH = sanitizeAppRoot(
  normalizePathWithFallback(
    getBootstrapData().common.application_root,
    DEFAULT_BOOTSTRAP_DATA.common.application_root,
  ),
);

export function applicationRoot(): string {
  return APPLICATION_ROOT_NO_TRAILING_SLASH;
}
