import { jwtDecode } from "jwt-decode";

export const REFRESH_TIMING_BUFFER_MS = 5000;
export const MIN_REFRESH_WAIT_MS = 10000;
export const DEFAULT_TOKEN_EXP_MS = 300000;
export const DEFAULT_TOKEN_REFRESH_RETRY_MS = 10000;

export function getGuestTokenRefreshTiming(currentGuestToken: string) {
  try {
    const parsed = jwtDecode<Record<string, any>>(currentGuestToken);
    const exp = new Date(
      /[^0-9\.]/g.test(parsed.exp) ? parsed.exp : parseFloat(parsed.exp) * 1000,
    );
    const isValidate = exp.toString() !== "Invalid Date";
    const ttl = isValidate
      ? Math.max(MIN_REFRESH_WAIT_MS, exp.getTime() - Date.now())
      : DEFAULT_TOKEN_EXP_MS;
    return ttl - REFRESH_TIMING_BUFFER_MS;
  } catch {
    return DEFAULT_TOKEN_EXP_MS - REFRESH_TIMING_BUFFER_MS;
  }
}
