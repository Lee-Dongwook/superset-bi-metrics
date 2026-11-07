import { Collapse } from "@bi-metrics/ui";
import type { ReactNode } from "react";

export interface WelcomeExtensionInnerItems {
  key: string;
  label: string;
  children: ReactNode;
}

interface WelcomeExtensionInnerProps {
  activeState: Array<string>;
  handleCollapse: (state: string[]) => void;
  items: WelcomeExtensionInnerItems[];
}

export const WelcomeExtensionInner = ({
  activeState,
  handleCollapse,
  items,
}: WelcomeExtensionInnerProps) => {
  return (
    <Collapse
      activeKey={activeState}
      onChange={handleCollapse}
      ghost
      items={items}
    />
  );
};
