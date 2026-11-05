import type { theme as antdTheme, ThemeConfig } from "antd";
import type { Theme } from "./Theme";

export type AntdTokens = ReturnType<typeof antdTheme.getDesignToken>;
export type AntdThemeConfig = ThemeConfig;

export enum ThemeAlgorithm {
  DEFAULT = "default",
  DARK = "dark",
  COMPACT = "compact",
}

export enum ThemeMode {
  DEFAULT = "default",
  DARK = "dark",
  SYSTEM = "system",
}

export type ThemeAlgorithmOption = ThemeAlgorithm | ThemeAlgorithm[];

export type SerializableThemeConfig = {
  token?: Record<string, any>;
  components?: Record<string, any>;
  algorithm?: ThemeAlgorithmOption;
  hashed?: boolean;
  inherit?: boolean;
  cssVar?: boolean | { key?: string; prefix?: string };
};

export type AnyThemeConfig = AntdThemeConfig | SerializableThemeConfig;
export type FontSizeKey = "xs" | "s" | "m" | "l" | "xl" | "xxl";

export interface SystemColors {
  colorPrimary: string;
  colorError: string;
  colorWarning: string;
  colorSuccess: string;
  colorInfo: string;
}

export interface ColorVariants {
  bg: string;
  border: string;
  hover: string;
  active: string;
  textHover: string;
  text: string;
  borderHover: string;
  bgHover: string;
  textActive: string;
}

export interface BiMetricsSpecificTokens {
  labelPublishedColor?: string;
  labelPublishedBg?: string;
  labelPublishedBorderColor?: string;
  labelPublishedIconColor?: string;
  labelDraftColor?: string;
  labelDraftBg?: string;
  labelDraftBorderColor?: string;
  labelDraftIconColor?: string;
  labelDatasetPhysicalColor?: string;
  labelDatasetPhysicalBg?: string;
  labelDatasetPhysicalBorderColor?: string;
  labelDatasetPhysicalIconColor?: string;
  labelDatasetVirtualColor?: string;
  labelDatasetVirtualBg?: string;
  labelDatasetVirtualBorderColor?: string;
  labelDatasetVirtualIconColor?: string;
  fontSizeXS: string;
  fontSizeXXL: string;
  fontWeightNormal: string;
  fontWeightLight: string;
  fontWeightStrong: number;
  fontWeightBold: string;
  brandIconMaxWidth: number;
  brandAppName?: string;
  brandLogoAlt: string;
  brandLogoUrl: string;
  brandLogoMargin: string;
  brandLogoHref: string;
  brandLogoHeight: string;
  brandSpinnerUrl?: string;
  brandSpinnerSvg?: string;
  fontUrls?: string[];
  echartsOptionsOverrides?: any;
  echartsOptionsOverridesByChartType?: {
    [chartType: string]: any;
  };
  colorEditorSelection?: string;
  buttonSecondaryColor?: string;
  buttonSecondaryBg?: string;
  buttonSecondaryBorderColor?: string;
  buttonSecondaryHoverColor?: string;
  buttonSecondaryHoverBg?: string;
  buttonSecondaryHoverBorderColor?: string;
  buttonSecondaryActiveColor?: string;
  buttonSecondaryActiveBg?: string;
  buttonSecondaryActiveBorderColor?: string;
  selectOptionActiveOutline?: boolean;
  labelBorderRadius?: number;
  buttonControlHeight?: number;
  buttonControlHeightSM?: number;
  buttonControlHeightXS?: number;
  buttonPaddingInline?: number;
  buttonPaddingInlineSM?: number;
  buttonFontSize?: number;
  buttonBorderRadius?: number;
  buttonStyleMap?: Record<
    string,
    { type?: string; variant?: string; color?: string }
  >;
  dashboardTileBg?: string;
  dashboardTileBorder?: string;
  dashboardTileBorderRadius?: number;
  dashboardTileBoxShadow?: string;
  resultsGridRowHeight?: number;
  resultsGridHeaderFontWeight?: number;
  resultsGridHeaderFontSize?: number;
  resultsGridBorderRadius?: number;
  resultsGridNoStriping?: boolean;
}

export const allowedAntdTokens = [
  "borderRadius",
  "borderRadiusLG",
  "borderRadiusOuter",
  "borderRadiusSM",
  "borderRadiusXS",
  "boxShadow",
  "boxShadowDrawerLeft",
  "boxShadowDrawerRight",
  "boxShadowDrawerUp",
  "boxShadowPopoverArrow",
  "boxShadowSecondary",
  "boxShadowTabsOverflowBottom",
  "boxShadowTabsOverflowLeft",
  "boxShadowTabsOverflowRight",
  "boxShadowTabsOverflowTop",
  "boxShadowTertiary",
  "colorError",
  "colorErrorActive",
  "colorErrorBg",
  "colorErrorBgActive",
  "colorErrorBgHover",
  "colorErrorBorder",
  "colorErrorBorderHover",
  "colorErrorHover",
  "colorErrorOutline",
  "colorErrorText",
  "colorErrorTextActive",
  "colorErrorTextHover",
  "colorPrimary",
  "colorPrimaryActive",
  "colorPrimaryBg",
  "colorPrimaryBgHover",
  "colorPrimaryBorder",
  "colorPrimaryBorderHover",
  "colorPrimaryHover",
  "colorPrimaryText",
  "colorPrimaryTextActive",
  "colorPrimaryTextHover",
  "colorSuccess",
  "colorSuccessActive",
  "colorSuccessBg",
  "colorSuccessBgHover",
  "colorSuccessBorder",
  "colorSuccessBorderHover",
  "colorSuccessHover",
  "colorSuccessText",
  "colorSuccessTextActive",
  "colorSuccessTextHover",
  "colorBgBase",
  "colorBgBlur",
  "colorBgContainer",
  "colorBgContainerDisabled",
  "colorBgElevated",
  "colorBgLayout",
  "colorBgMask",
  "colorBgSpotlight",
  "colorBgTextActive",
  "colorBgTextHover",
  "colorBorder",
  "colorBorderBg",
  "colorBorderSecondary",
  "colorFill",
  "colorFillAlter",
  "colorFillContent",
  "colorFillContentHover",
  "colorFillQuaternary",
  "colorFillSecondary",
  "colorFillTertiary",
  "colorHighlight",
  "colorIcon",
  "colorIconHover",
  "colorInfo",
  "colorInfoActive",
  "colorInfoBg",
  "colorInfoBgHover",
  "colorInfoBorder",
  "colorInfoBorderHover",
  "colorInfoHover",
  "colorInfoText",
  "colorInfoTextActive",
  "colorInfoTextHover",
  "colorLink",
  "colorLinkActive",
  "colorLinkHover",
  "colorSplit",
  "colorText",
  "colorTextBase",
  "colorTextDescription",
  "colorTextDisabled",
  "colorTextHeading",
  "colorTextLabel",
  "colorTextLightSolid",
  "colorTextPlaceholder",
  "colorTextQuaternary",
  "colorTextSecondary",
  "colorTextTertiary",
  "colorWarning",
  "colorWarningActive",
  "colorWarningBg",
  "colorWarningBgHover",
  "colorWarningBorder",
  "colorWarningBorderHover",
  "colorWarningHover",
  "colorWarningOutline",
  "colorWarningText",
  "colorWarningTextActive",
  "colorWarningTextHover",
  "colorWhite",
  "controlHeight",
  "controlHeightLG",
  "controlHeightSM",
  "controlHeightXS",
  "controlInteractiveSize",
  "controlItemBgActive",
  "controlItemBgActiveDisabled",
  "controlItemBgActiveHover",
  "controlItemBgHover",
  "controlOutline",
  "controlOutlineWidth",
  "controlPaddingHorizontal",
  "controlPaddingHorizontalSM",
  "controlTmpOutline",
  "fontFamily",
  "fontFamilyCode",
  "fontWeightStrong",
  "fontHeight",
  "fontHeightLG",
  "fontHeightSM",
  "fontSize",
  "fontSizeHeading1",
  "fontSizeHeading2",
  "fontSizeHeading3",
  "fontSizeHeading4",
  "fontSizeHeading5",
  "fontSizeIcon",
  "fontSizeLG",
  "fontSizeSM",
  "fontSizeXL",
  "lineHeight",
  "lineHeightHeading1",
  "lineHeightHeading2",
  "lineHeightHeading3",
  "lineHeightHeading4",
  "lineHeightHeading5",
  "lineHeightLG",
  "lineHeightSM",
  "lineType",
  "lineWidth",
  "lineWidthBold",
  "lineWidthFocus",
  "linkDecoration",
  "linkFocusDecoration",
  "linkHoverDecoration",
  "margin",
  "marginLG",
  "marginMD",
  "marginSM",
  "marginXL",
  "marginXS",
  "marginXXL",
  "marginXXS",
  "motion",
  "motionBase",
  "motionDurationFast",
  "motionDurationMid",
  "motionDurationSlow",
  "motionEaseInBack",
  "motionEaseInOut",
  "motionEaseInOutCirc",
  "motionEaseInQuint",
  "motionEaseOut",
  "motionEaseOutBack",
  "motionEaseOutCirc",
  "motionEaseOutQuint",
  "motionUnit",
  "opacityImage",
  "opacityLoading",
  "padding",
  "paddingContentHorizontal",
  "paddingContentHorizontalLG",
  "paddingContentHorizontalSM",
  "paddingContentVertical",
  "paddingContentVerticalLG",
  "paddingContentVerticalSM",
  "paddingLG",
  "paddingMD",
  "paddingSM",
  "paddingXL",
  "paddingXS",
  "paddingXXS",
  "screenLG",
  "screenLGMax",
  "screenLGMin",
  "screenMD",
  "screenMDMax",
  "screenMDMin",
  "screenSM",
  "screenSMMax",
  "screenSMMin",
  "screenXL",
  "screenXLMax",
  "screenXLMin",
  "screenXS",
  "screenXSMax",
  "screenXSMin",
  "screenXXL",
  "screenXXLMin",
  "size",
  "sizeLG",
  "sizeMD",
  "sizeMS",
  "sizePopupArrow",
  "sizeSM",
  "sizeStep",
  "sizeUnit",
  "sizeXL",
  "sizeXS",
  "sizeXXL",
  "sizeXXS",
  "wireframe",
  "zIndexBase",
  "zIndexPopupBase",
] as const;

export type AllowedAntdTokenKeys = Extract<
  (typeof allowedAntdTokens)[number],
  keyof AntdTokens
>;

export type SharedAntdTokens = Pick<AntdTokens, AllowedAntdTokenKeys>;

export type BiMetricsTheme = SharedAntdTokens & BiMetricsSpecificTokens;

export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ThemeControllerOptions {
  themeObject?: Theme;
  storage?: ThemeStorage;
  storageKey?: string;
  modeStorageKey?: string;
  defaultTheme?: AnyThemeConfig;
  onChange?: (theme: Theme) => void;
  canUpdateTheme?: () => boolean;
  canUpdateMode?: () => boolean;
  isGlobalContext?: boolean;
  initialMode?: ThemeMode;
}

export interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setTheme: (config: AnyThemeConfig) => void;
  setThemeMode: (newMode: ThemeMode) => void;
  resetTheme: () => void;
  setTemporaryTheme: (config: AnyThemeConfig, themeId?: number | null) => void;
  clearLocalOverrides: () => void;
  getCurrentCrudThemeId: () => string | null;
  hasDevOverride: () => boolean;
  hasThemeConfigOverride: boolean;
  canSetMode: () => boolean;
  canSetTheme: () => boolean;
  canDetectOSPreference: () => boolean;
  createDashboardThemeProvider: (themeId: string) => Promise<Theme | null>;
  getAppliedThemeId: () => number | null;
  refreshSystemThemes: () => Promise<void>;
}

export interface BiMetricsThemeConfig {
  theme_default: AnyThemeConfig;
  theme_dark?: AnyThemeConfig;
}
