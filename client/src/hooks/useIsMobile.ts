import { useEffect, useState } from "react";
import { isFeatureEnabled, FeatureFlag } from "@bi-metrics/core";

export const FALLBACK_MOBILE_MAX_WIDTH = 767;

export function isMobileConsumptionEnabled(): boolean {
  return isFeatureEnabled(FeatureFlag.MobileConsumptionMode);
}
