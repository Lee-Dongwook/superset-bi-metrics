import { DEFAULT_BOOTSTRAP_DATA } from "../constants";
import type { BootstrapData } from "../types";
import { APP_ROOT_PATH_RE } from "./constants";

let cachedBootstrapData: BootstrapData | null = null;

export default function getBootstrapData(): BootstrapData {
  if (cachedBootstrapData === null) {
    const appContainer = document.getElementById("app");
    const dataBootstrap = appContainer?.dataset.bootstrap;
    cachedBootstrapData = dataBootstrap
      ? JSON.parse(dataBootstrap)
      : DEFAULT_BOOTSTRAP_DATA;
  }
  return cachedBootstrapData ?? DEFAULT_BOOTSTRAP_DATA;
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
