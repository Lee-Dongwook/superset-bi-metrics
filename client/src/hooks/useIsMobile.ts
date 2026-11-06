import { useEffect, useState } from "react";
import { isFeatureEnabled, FeatureFlag } from "@bi-metrics/core";
import { useTheme } from "@bi-metrics/core/theme";

export const FALLBACK_MOBILE_MAX_WIDTH = 767;

export function isMobileConsumptionEnabled(): boolean {
  return isFeatureEnabled(FeatureFlag.MobileConsumptionMode);
}

function getInitialIsSmallScreen(enabled: boolean, maxWidth: number): boolean {
  if (!enabled || typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
}

export function useIsMobile(): boolean {
  const enabled = isMobileConsumptionEnabled();
  const theme = useTheme();
  const maxWidth = theme?.screenSMMax ?? FALLBACK_MOBILE_MAX_WIDTH;
  const [isSmallScreen, setIsSmallScreen] = useState(() =>
    getInitialIsSmallScreen(enabled, maxWidth),
  );

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setIsSmallScreen(mediaQuery.matches);
    update();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }
    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, [enabled, maxWidth]);

  return enabled && isSmallScreen;
}
