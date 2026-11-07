import { useTheme as useEmotionTheme } from "@emotion/react";
import emotionStyled, { CreateStyled } from "@emotion/styled";
import { Theme } from "./Theme";
import type { BiMetricsTheme } from "./types";

declare module "@emotion/react" {
  export interface Theme extends BiMetricsTheme {}
}

export { css, keyframes, Global } from "@emotion/react";

/** Emotion's useTheme, but fails loudly outside a ThemeProvider (emotion returns {} there). */
export function useTheme() {
  const theme = useEmotionTheme();
  if (Object.keys(theme).length === 0) {
    throw new Error("useTheme() could not find a ThemeContext.");
  }
  return theme;
}

const styled: CreateStyled = emotionStyled;

export const themeObject = Theme.fromConfig();
export const theme = themeObject.theme;

export { Theme };
export type {
  BiMetricsTheme,
  BiMetricsThemeConfig,
  ThemeContextType,
  ThemeControllerOptions,
  ThemeStorage,
  SerializableThemeConfig,
  AnyThemeConfig,
} from "./types";
export { ThemeAlgorithm, ThemeMode } from "./types";
export { styled };
