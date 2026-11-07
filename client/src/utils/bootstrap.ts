import { APP_ROOT_PATH_RE } from "./constants";

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
