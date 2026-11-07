import type { ReactNode, ComponentType, ReactElement } from "react";
import type { BackgroundPosition } from "./ImageLoader";
// import { useTheme } from "../../theme";

export interface LinkProps {
  to: string;
  children?: ReactNode;
}

interface ListViewCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  url?: string;
  linkComponent?: ComponentType<LinkProps>;
  imgURL?: string | null;
  imgFallbackURL?: string;
  imgPosition?: BackgroundPosition;
  description: string;
  loading?: boolean;
  titleRight?: ReactNode;
  coverLeft?: ReactNode;
  coverRight?: ReactNode;
  actions?: ReactNode | null;
  rows?: number | string;
  avatar?: ReactElement | null;
  cover?: ReactNode | null;
  certifiedBy?: string;
  certificationDetails?: string;
}

function ListViewCard({
  title,
  subtitle,
  url,
  linkComponent,
  titleRight,
  imgURL,
  imgFallbackURL,
  description,
  coverLeft,
  coverRight,
  actions,
  avatar,
  loading,
  imgPosition = "top",
  cover,
  certifiedBy,
  certificationDetails,
}: ListViewCardProps) {
  // const Link = url && linkComponent ? linkComponent : AnchorLink;
  // const theme = useTheme();
  // return <StyledCard></StyledCard>;
}

export { ListViewCard };
export type { ListViewCardProps };
