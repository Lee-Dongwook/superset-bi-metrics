import { FunctionComponent, ReactNode, useState } from "react";

type MenuChild = {
  label: string;
  name: string;
  url?: string;
  usesRouter?: boolean;
  onClick?: () => void;
  "data-test"?: string;
  id?: string;
  "aria-controls"?: string;
};

export interface ButtonProps {
  name: ReactNode;
  onClick?: any;
  "data-test"?: string;
  buttonStyle: "primary" | "secondary" | "dashed" | "link" | "tertiary";
  loading?: boolean;
  icon?: ReactNode;
  component?: ReactNode;
}

export interface SubMenuProps {
  buttons?: Array<ButtonProps>;
  activeChild?: MenuChild["name"];
  name?: string | ReactNode;
}

const SubMenuComponent: FunctionComponent<SubMenuProps> = (props) => {
  const [showMenu, setMenu] = useState<any>("horizontal");

  return <></>;
};

export default SubMenuComponent;
