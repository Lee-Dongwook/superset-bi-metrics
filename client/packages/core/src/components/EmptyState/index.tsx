import type { ReactNode } from "react";
import { Empty } from "antd";
import { styled } from "../../theme";
import { t } from "../../translation";

export type EmptyStateSize = "small" | "medium" | "large";

export interface EmptyStateProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Custom illustration. Defaults to antd's simple empty image. */
  image?: ReactNode;
  size?: EmptyStateSize;
  children?: ReactNode;
}

const IMAGE_HEIGHT: Record<EmptyStateSize, number> = {
  small: 50,
  medium: 80,
  large: 150,
};

const Container = styled.div<{ size: EmptyStateSize }>`
  ${({ theme, size }) => `
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    color: ${theme.colorTextTertiary};
    align-items: center;
    justify-content: center;
    padding: ${theme.sizeUnit * 4}px;
    text-align: center;

    .empty-title {
      font-size: ${size === "large" ? theme.fontSizeLG : theme.fontSize}px;
      font-weight: ${theme.fontWeightStrong};
      margin-top: ${size === "large" ? theme.sizeUnit * 4 : theme.sizeUnit * 2}px;
    }
    .empty-description {
      font-size: ${size === "large" ? theme.fontSize : theme.fontSizeSM}px;
      margin-top: ${theme.sizeUnit * 2}px;
    }
  `}
`;

// ponytail: upstream ships 13 custom svg illustrations keyed by name; we use
// antd's built-in image until we have our own assets.
export function EmptyState({
  title = t("No results"),
  description = t("There is currently no information to display."),
  image = Empty.PRESENTED_IMAGE_SIMPLE,
  size = "medium",
  children,
}: EmptyStateProps) {
  return (
    <Container size={size}>
      <Empty
        description={false}
        image={image}
        styles={{ image: { height: IMAGE_HEIGHT[size] } }}
      />
      {title && <p className="empty-title">{title}</p>}
      {description && <p className="empty-description">{description}</p>}
      {children}
    </Container>
  );
}
