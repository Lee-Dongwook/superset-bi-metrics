import {
  DOUBLE_ENCODED_ESCAPE_RE,
  DUPLICATE_NAV_WINDOW_MS,
  NEW_TAB_FEATURES,
  SAFE_NAVIGATION_URL_RE,
  SAFE_PATH_PARSE_BASE,
  SAFE_PATH_PARSE_ORIGIN,
} from "./constants";
import { ensureAppRoot } from "./path";

interface NavigateToOptions {
  newWindow?: boolean;
  assign?: boolean;
}

interface NavigateToProps {
  url: string;
  options?: NavigateToOptions;
}

let lastAssignUrl: string | null = null;
let lastAssignAt = 0;

function shouldSkipDuplicateAssign(sinkValue: string): boolean {
  const now = Date.now();
  if (
    lastAssignUrl === sinkValue &&
    now - lastAssignAt < DUPLICATE_NAV_WINDOW_MS
  ) {
    return true;
  }
  lastAssignUrl = sinkValue;
  lastAssignAt = now;
  return false;
}

export function navigateTo({ url, options }: NavigateToProps): void {
  const target = ensureAppRoot(url);

  const routerRelativeFastPath =
    target.startsWith("/") &&
    !target.startsWith("//") &&
    !target.includes("\\");

  if (routerRelativeFastPath) {
    let parsed: URL | null;

    try {
      parsed = new URL(target, SAFE_PATH_PARSE_BASE);
    } catch {
      parsed = null;
    }

    const safePathCondition =
      parsed !== null &&
      parsed.origin === SAFE_PATH_PARSE_ORIGIN &&
      parsed.protocol === "http:";

    if (safePathCondition) {
      const safePath = `${parsed?.pathname}${parsed?.search}${parsed?.hash}`;

      const safePathExact =
        safePath.startsWith("/") &&
        !safePath.startsWith("//") &&
        !safePath.includes("\\");

      if (safePathExact) {
        const sinkValue = encodeURI(safePath).replace(
          DOUBLE_ENCODED_ESCAPE_RE,
          "%$1",
        );

        if (options?.newWindow) {
          window.open(sinkValue, "_blank", NEW_TAB_FEATURES);
        } else if (options?.assign) {
          if (!shouldSkipDuplicateAssign(sinkValue)) {
            window.location.assign(sinkValue);
          }
        } else {
          window.location.href = sinkValue;
        }

        return;
      }
    }
  }

  let parsed: URL | null;

  try {
    parsed = new URL(target);
  } catch {
    parsed = null;
  }

  const parsedSafeNavigationUrlCondition =
    parsed !== null &&
    SAFE_NAVIGATION_URL_RE.test(target) &&
    (parsed.protocol === "https:" ||
      parsed.protocol === "http:" ||
      parsed.protocol === "ftp:" ||
      parsed.protocol === "mailto:" ||
      parsed.protocol === "tel:") &&
    !parsed.username &&
    !parsed.password;

  if (parsedSafeNavigationUrlCondition) {
    const safeExternal = parsed?.href;
    if (options?.newWindow) {
      window.open(safeExternal, "_blank", NEW_TAB_FEATURES);
    } else if (options?.assign) {
      if (!shouldSkipDuplicateAssign(safeExternal!)) {
        window.location.assign(safeExternal!);
      }
    } else {
      window.location.href = safeExternal!;
    }
    return;
  }

  console.error("navigationUtils.navigateTo refused unsafe URL:", url);

  const home = ensureAppRoot("/");

  if (home.startsWith("/") && !home.startsWith("//") && !home.includes("\\")) {
    let homeUrl: URL | null;
    try {
      homeUrl = new URL(home, SAFE_PATH_PARSE_BASE);
    } catch {
      homeUrl = null;
    }

    const homeSafeCondition =
      homeUrl !== null &&
      homeUrl.origin === SAFE_PATH_PARSE_ORIGIN &&
      homeUrl.protocol === "http:";

    if (homeSafeCondition) {
      const safeHome = `${homeUrl?.pathname}${homeUrl?.search}${homeUrl?.hash}`;

      if (
        safeHome.startsWith("/") &&
        !safeHome.startsWith("//") &&
        !safeHome.includes("\\")
      ) {
        window.location.href = encodeURI(safeHome).replace(
          DOUBLE_ENCODED_ESCAPE_RE,
          "%$1",
        );
      }
    }
  }
}

export function redirect(path: string): void {
  navigateTo({ url: path });
}
