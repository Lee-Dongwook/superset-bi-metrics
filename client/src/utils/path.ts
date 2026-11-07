import { PROTOCOL_RELATIVE_LIKE_RE, SAFE_ABSOLUTE_URL_RE } from "./constants";

export function ensureAppRoot(path: string | null | undefined): string {
  if (path == null) {
    return applicationRoot() || "/";
  }

  if (SAFE_ABSOLUTE_URL_RE.test(path) || PROTOCOL_RELATIVE_LIKE_RE.test(path)) {
    return path;
  }

  const root = applicationRoot();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (
    root &&
    (normalizedPath === root || normalizedPath.startsWith(`${root}/`))
  ) {
    return normalizedPath;
  }

  return `${root}${normalizedPath}`;
}
