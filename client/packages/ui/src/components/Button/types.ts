import type { MouseEventHandler, ReactNode } from "react";
import type { ButtonProps as AntdButtonProps } from "antd/es/button";
import type { TooltipPlacement } from "../Tooltip/types";

export type OnClickHandler = MouseEventHandler<HTMLElement>;

export type ButtonStyle =
  | "primary"
  | "secondary"
  | "tertiary"
  | "danger"
  | "link"
  | "dashed";

export type ButtonSize = "default" | "small" | "xsmall";
export type ButtonStyleConfig = {
  controlHeight?: number;
  paddingInline?: number;
  fontSize?: number;
  fontWeight?: number;
  ctaMinWidth?: number;
  ctaMinHeight?: number;
  iconGap?: number;
  borderRadius?: number;
};

export {
  type ButtonType,
  type ButtonVariantType,
  type ButtonColorType,
} from "antd/es/button";

export type ButtonProps = Omit<AntdButtonProps, "css"> & {
  placement?: TooltipPlacement;
  tooltip?: ReactNode;
  className?: string;
  buttonSize?: ButtonSize;
  buttonStyle?: ButtonStyle;
  cta?: boolean;
  showMarginRight?: boolean;
  icon?: ReactNode;
  styleConfig?: ButtonStyleConfig;
};
