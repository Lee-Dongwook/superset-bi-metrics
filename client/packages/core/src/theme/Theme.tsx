import { type ReactNode, useSyncExternalStore } from "react";
import { theme as antdTheme, ConfigProvider } from "antd";
import { ThemeProvider, CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { mergeWith } from "lodash-es";
import { GlobalStyles } from "./GlobalStyles";
import {
  type AntdThemeConfig,
  type AnyThemeConfig,
  type BiMetricsTheme,
  type BiMetricsSpecificTokens,
  ThemeAlgorithm,
} from "./types";

const emotionCache = createCache({ key: "bimetrics" });

const defaultTokens: BiMetricsSpecificTokens = {
  fontSizeXS: "8",
  fontSizeXXL: "28",
  fontWeightLight: "300",
  fontWeightNormal: "400",
  fontWeightStrong: 500,
  fontWeightBold: "600",
  brandIconMaxWidth: 37,
  brandLogoAlt: "BI Metrics",
  brandLogoUrl: "",
  brandLogoMargin: "18px 0",
  brandLogoHref: "/",
  brandLogoHeight: "24px",
};

const algorithms = {
  [ThemeAlgorithm.DEFAULT]: antdTheme.defaultAlgorithm,
  [ThemeAlgorithm.DARK]: antdTheme.darkAlgorithm,
  [ThemeAlgorithm.COMPACT]: antdTheme.compactAlgorithm,
};

/** Serializable config ("dark", ["dark","compact"]) -> antd config with algorithm functions. */
function toAntdConfig(config: AnyThemeConfig): AntdThemeConfig {
  if (!config.algorithm) return config as AntdThemeConfig;
  const algorithm = [config.algorithm]
    .flat()
    .map((a) => (typeof a === "string" ? algorithms[a] : a));
  return { ...config, algorithm } as AntdThemeConfig;
}

function mergeConfig(
  config?: AnyThemeConfig,
  base?: AnyThemeConfig,
): AnyThemeConfig {
  if (!base || !config) return config ?? base ?? {};

  // arrays (e.g. algorithm) replace instead of index-merge
  const merged: AnyThemeConfig = mergeWith({}, base, config, (_, src) =>
    Array.isArray(src) ? src : undefined,
  );
  // a custom primary color should also drive links unless set explicitly
  if (config.token?.colorPrimary && !config.token.colorLink) {
    merged.token = { ...merged.token, colorLink: config.token.colorPrimary };
  }
  return merged;
}

export class Theme {
  theme!: BiMetricsTheme;
  antdConfig!: AntdThemeConfig;
  isDark = false;
  private readonly listeners = new Set<() => void>();

  private constructor(config: AnyThemeConfig) {
    this.setConfig(config);
  }

  static fromConfig(
    config?: AnyThemeConfig,
    baseTheme?: AnyThemeConfig,
  ): Theme {
    return new Theme(mergeConfig(config, baseTheme));
  }

  setConfig(config: AnyThemeConfig): void {
    this.antdConfig = toAntdConfig(config);
    this.theme = {
      ...defaultTokens,
      ...antdTheme.getDesignToken(this.antdConfig),
      ...this.antdConfig.token,
    };
    this.isDark = [this.antdConfig.algorithm]
      .flat()
      .includes(antdTheme.darkAlgorithm);
    this.listeners.forEach((notify) => notify());
  }

  private readonly subscribe = (notify: () => void) => {
    this.listeners.add(notify);
    return () => this.listeners.delete(notify);
  };

  readonly ThemeProvider = ({ children }: { children: ReactNode }) => {
    const theme = useSyncExternalStore(this.subscribe, () => this.theme);

    return (
      <CacheProvider value={emotionCache}>
        <ThemeProvider theme={theme}>
          <GlobalStyles isDark={this.isDark} />
          <ConfigProvider theme={this.antdConfig}>{children}</ConfigProvider>
        </ThemeProvider>
      </CacheProvider>
    );
  };
}
