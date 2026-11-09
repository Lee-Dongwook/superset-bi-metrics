export interface NormalizeOptions {
  /** Application root to strip. Empty string disables normalisation. */
  applicationRoot: string;
}

const SAFE_ABSOLUTE_URL_RE = /^(?:https?|ftp|mailto|tel):/i;

/**
 * Strips the app root from a backend-supplied router-relative URL so consumers
 * that re-prefix the root (getUrl, <Link basename>) don't double it.
 * Absolute and protocol-relative URLs pass through untouched.
 */
export function normalizeBackendUrlString(
  value: string,
  { applicationRoot }: NormalizeOptions,
): string {
  const root = applicationRoot.replace(/\/$/, "");
  if (!root || SAFE_ABSOLUTE_URL_RE.test(value) || value.startsWith("//")) {
    return value;
  }
  if (value === root) return "/";
  if (value.startsWith(`${root}/`)) return value.slice(root.length);
  return value;
}
