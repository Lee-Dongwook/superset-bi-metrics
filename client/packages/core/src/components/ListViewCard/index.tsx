import type { ComponentType, FC, ReactElement, ReactNode } from "react";
import { sanitizeUrl } from "@braintree/sanitize-url";
import { SafetyCertificateFilled } from "@ant-design/icons";
import { Card, Skeleton, Tooltip } from "antd";
import { useTheme } from "../../theme";
import { t } from "../../translation";
import { ImageLoader, type BackgroundPosition } from "./ImageLoader";
import {
  ActionsWrapper,
  Cover,
  CoverFooter,
  CoverFooterLeft,
  CoverFooterRight,
  StyledCard,
  ThinSkeleton,
  TitleContainer,
  TitleLink,
  TitleRight,
} from "./components";

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

const AnchorLink: FC<LinkProps> = ({ to, children }) => (
  <a href={to !== undefined ? sanitizeUrl(to) : undefined}>{children}</a>
);

const paragraphConfig = { rows: 1, width: 150 };

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
  const Link = url && linkComponent ? linkComponent : AnchorLink;
  const theme = useTheme();

  return (
    <StyledCard
      data-test="styled-card"
      padded
      cover={
        cover || (
          <Cover>
            <Link to={url!}>
              <div className="gradient-container">
                <ImageLoader
                  src={imgURL || ""}
                  fallback={imgFallbackURL || ""}
                  isLoading={loading}
                  position={imgPosition}
                />
              </div>
            </Link>
            <CoverFooter className="cover-footer">
              {!loading && coverLeft && (
                <CoverFooterLeft>{coverLeft}</CoverFooterLeft>
              )}
              {!loading && coverRight && (
                <CoverFooterRight>{coverRight}</CoverFooterRight>
              )}
            </CoverFooter>
          </Cover>
        )
      }
    >
      {loading ? (
        <Card.Meta
          data-test="skeleton-card"
          title={
            <TitleContainer>
              <Skeleton.Input
                active
                size="small"
                style={{ width: Math.trunc(theme.sizeUnit * 62.5) }}
              />
              <div className="card-actions">
                <Skeleton.Button active shape="circle" />{" "}
                <Skeleton.Button active style={{ width: theme.sizeUnit * 10 }} />
              </div>
            </TitleContainer>
          }
          description={
            <ThinSkeleton
              round
              active
              title={false}
              paragraph={paragraphConfig}
            />
          }
        />
      ) : (
        <Card.Meta
          title={
            <TitleContainer>
              {subtitle || null}
              <div className="titleRow">
                <Tooltip title={title}>
                  <TitleLink>
                    {certifiedBy && (
                      <>
                        <Tooltip
                          title={
                            <>
                              {t("Certified by %s", certifiedBy)}
                              {certificationDetails && (
                                <div>{certificationDetails}</div>
                              )}
                            </>
                          }
                        >
                          <SafetyCertificateFilled
                            style={{ color: theme.colorPrimary }}
                          />
                        </Tooltip>{" "}
                      </>
                    )}
                    {title}
                  </TitleLink>
                </Tooltip>
                {titleRight && (
                  <Tooltip title={titleRight}>
                    <TitleRight>{titleRight}</TitleRight>
                  </Tooltip>
                )}
                <div className="card-actions" data-test="card-actions">
                  {actions}
                </div>
              </div>
            </TitleContainer>
          }
          description={description}
          avatar={avatar || null}
        />
      )}
    </StyledCard>
  );
}

ListViewCard.Actions = ActionsWrapper;

export { ListViewCard, ImageLoader };
export type { ListViewCardProps };
