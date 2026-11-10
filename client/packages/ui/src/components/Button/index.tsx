import { Children, ReactElement, ReactNode, Fragment, forwardRef, Ref } from "react";
import cx from "classnames";
import { Button as AntdButton } from "antd";
import { useTheme, type BiMetricsTheme } from "@bi-metrics/core";
import type {
  ButtonColorType,
  ButtonProps,
  ButtonStyleConfig,
  ButtonStyle,
  ButtonType,
  ButtonVariantType,
  OnClickHandler,
} from "./types";

export const getSecondaryButtonStyle = (theme: BiMetricsTheme) => ({
  color: theme.buttonSecondaryColor || theme.colorPrimary,
  backgroundColor: theme.buttonSecondaryBg || theme.colorPrimaryBg,
  borderColor: theme.buttonSecondaryBorderColor || "transparent",
});

export const getSecondaryButtonHoverStyles = (theme: BiMetricsTheme) => ({
  "&:hover": {
    color: `${theme.buttonSecondaryHoverColor || theme.colorPrimary} !important`,
    backgroundColor: `${theme.buttonSecondaryHoverBg || theme.colorPrimaryBgHover} !important`,
    borderColor: `${theme.buttonSecondaryHoverBorderColor || "transparent"} !important`,
  },
  "&:active": {
    color: `${theme.buttonSecondaryActiveColor || theme.colorPrimary} !important`,
    backgroundColor: `${theme.buttonSecondaryActiveBg || theme.colorPrimaryBorder} !important`,
    borderColor: `${theme.buttonSecondaryActiveBorderColor || "transparent"} !important`,
  },
});

type ButtonStyleMapping = {
  type?: ButtonType;
  variant?: ButtonVariantType;
  color?: ButtonColorType;
};

const BUTTON_STYLE_MAP: Record<ButtonStyle, ButtonStyleMapping> = {
  primary: { type: "primary", variant: "solid", color: "primary" },
  secondary: { variant: "filled", color: "primary" },
  tertiary: { variant: "outlined", color: "default" },
  dashed: { type: "dashed", variant: "dashed", color: "primary" },
  danger: { variant: "solid", color: "danger" },
  link: { type: "link" },
};

function ButtonInner(props: ButtonProps, ref: Ref<HTMLElement>) {
  const {
    tooltip,
    placement,
    disabled = false,
    buttonSize,
    buttonStyle,
    className,
    cta,
    children,
    href,
    showMarginRight = true,
    icon,
    styleConfig,
    ...restProps
  } = props;

  const theme = useTheme();
  const { fontWeightStrong } = theme;
  const btnFontSize = theme.buttonFontSize ?? theme.fontSizeSM;

  const resolvedStyleMap: Record<ButtonStyle, ButtonStyleMapping> =
    theme.buttonStyleMap
      ? (Object.fromEntries(
          Object.entries(BUTTON_STYLE_MAP).map(([key, value]) => [
            key,
            { ...value, ...theme.buttonStyleMap?.[key as ButtonStyle] },
          ]),
        ) as Record<ButtonStyle, ButtonStyleMapping>)
      : BUTTON_STYLE_MAP;

  let defaultHeight = theme.buttonControlHeight ?? 32;
  let defaultPaddingInline = theme.buttonPaddingInline ?? 18;
  let defaultBorderRadius = theme.buttonBorderRadius ?? theme.borderRadius;
  if (buttonSize === "xsmall") {
    defaultHeight = theme.buttonControlHeightXS ?? 22;
    defaultPaddingInline = 5;
    defaultBorderRadius = theme.buttonBorderRadius ?? theme.borderRadiusSM;
  } else if (buttonSize === "small") {
    defaultHeight = theme.buttonControlHeightSM ?? 30;
    defaultPaddingInline = theme.buttonPaddingInlineSM ?? 10;
    defaultBorderRadius = theme.buttonBorderRadius ?? theme.borderRadiusSM;
  }
  if (buttonStyle === "link") {
    defaultPaddingInline = 4;
  }

  const resolvedStyleConfig: Required<ButtonStyleConfig> = {
    controlHeight: styleConfig?.controlHeight ?? defaultHeight,
    paddingInline: styleConfig?.paddingInline ?? defaultPaddingInline,
    fontSize: styleConfig?.fontSize ?? btnFontSize,
    fontWeight: styleConfig?.fontWeight ?? fontWeightStrong,
    ctaMinWidth: styleConfig?.ctaMinWidth ?? theme.sizeUnit * 36,
    ctaMinHeight: styleConfig?.ctaMinHeight ?? theme.sizeUnit * 8,
    iconGap: styleConfig?.iconGap ?? theme.sizeUnit * 2,
    borderRadius: styleConfig?.borderRadius ?? defaultBorderRadius,
  };

  const {
    type: antdType = "default",
    variant,
    color,
  } = resolvedStyleMap[buttonStyle ?? "primary"] ?? BUTTON_STYLE_MAP.primary;

  const element = children as ReactElement<{ children?: ReactNode }>;

  let renderedChildren = [];

  if (element?.type === Fragment) {
    renderedChildren = Children.toArray(element.props.children);
  } else {
    renderedChildren = Children.toArray(children);
  }
  const firstChildMargin =
    showMarginRight && renderedChildren.length > 1
      ? resolvedStyleConfig.iconGap
      : 0;

  const effectiveButtonStyle: ButtonStyle = buttonStyle ?? "primary";

  const secondaryStyle =
    effectiveButtonStyle === "secondary" && !disabled
      ? getSecondaryButtonStyle(theme)
      : undefined;

  const button = (
    <AntdButton
      ref={ref as Ref<HTMLButtonElement & HTMLAnchorElement>}
      href={disabled ? undefined : href}
      disabled={disabled}
      type={antdType}
      variant={variant}
      danger={effectiveButtonStyle === "danger"}
      color={color}
      className={cx(
        className,
        "bi-metrics-button",
        `bi-metrics-button-${buttonStyle}`,
        { cta: !!cta },
      )}
      css={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        fontSize: resolvedStyleConfig.fontSize,
        fontWeight: resolvedStyleConfig.fontWeight,
        height: resolvedStyleConfig.controlHeight,
        padding: `0px ${resolvedStyleConfig.paddingInline}px`,
        borderRadius: resolvedStyleConfig.borderRadius,
        minWidth: cta ? resolvedStyleConfig.ctaMinWidth : undefined,
        minHeight: cta ? resolvedStyleConfig.ctaMinHeight : undefined,
        marginLeft: 0,
        "& + .superset-button:not(.ant-btn-compact-item)": {
          marginLeft: theme.sizeUnit * 2,
        },
        "& > span > :first-of-type": {
          marginRight: firstChildMargin,
        },
        ...(effectiveButtonStyle === "secondary" &&
          !disabled &&
          getSecondaryButtonHoverStyles(theme)),
      }}
      icon={icon}
      {...restProps}
      style={
        secondaryStyle
          ? { ...secondaryStyle, ...restProps.style }
          : restProps.style
      }
    >
      {children}
    </AntdButton>
  );

  return button;
}

export const Button = forwardRef<HTMLElement, ButtonProps>(ButtonInner);

export type { ButtonProps, OnClickHandler };
