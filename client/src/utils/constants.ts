export const loadingCardCount = 5;
export const DUPLICATE_NAV_WINDOW_MS = 1000;
export const SAFE_PATH_PARSE_BASE = "http://navigation-utils.invalid/";
export const SAFE_PATH_PARSE_ORIGIN = "http://navigation-utils.invalid";
export const NEW_TAB_FEATURES = "noopener noreferrer";
export const DOUBLE_ENCODED_ESCAPE_RE = /%25([0-9A-Fa-f]{2})/g;
export const SAFE_NAVIGATION_URL_RE =
  /^(?:\/(?!\/)|https?:\/\/|ftp:\/\/|mailto:|tel:)/i;
export const PROTOCOL_RELATIVE_LIKE_RE = /^[/\\][/\\]/;
export const SAFE_ABSOLUTE_URL_RE = /^(https?|ftp|mailto|tel):/i;
export const APP_ROOT_PATH_RE = /^(?:\/[\w~%-]+(?:\.[\w~%-]+)*)*$/;
