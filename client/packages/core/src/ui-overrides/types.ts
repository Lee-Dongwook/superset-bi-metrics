import type { ComponentType, ReactNode, MouseEventHandler } from "react";

export type ButtonStylePropsT =
  | "primary"
  | "secondary"
  | "dashed"
  | "link"
  | "warning"
  | "success"
  | "tertiary";

export interface ButtonProps {
  name: ReactNode;
  onClick?: MouseEventHandler<HTMLElement>;
  "data-test"?: string;
  buttonStyle: ButtonStylePropsT;
}

export interface SubMenuProps {
  buttons?: Array<ButtonProps>;
  name?: string | ReactNode;
  activeChild?: string;
}

export type Extensions = Partial<{
  "home.submenu": ComponentType<SubMenuProps>;
  "welcome.banner": ComponentType;
  "welcome.message": ComponentType;
  "welcome.main.replacement": ComponentType;
}>;
