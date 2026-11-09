import { useCallback, type MouseEvent } from "react";
import { StarFilled, StarOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { styled, useTheme } from "../../theme";
import { t } from "../../translation";

export interface FaveStarProps {
  itemId: number;
  isStarred?: boolean;
  showTooltip?: boolean;
  saveFaveStar(id: number, isStarred: boolean): void;
}

const StarButton = styled.button`
  ${({ theme }) => `
    appearance: none;
    border: none;
    background: none;
    cursor: pointer;
    font: inherit;
    font-size: ${theme.fontSizeXL}px;
    display: flex;
    padding: 0 0 0 ${theme.sizeUnit * 2}px;
  `}
`;

export function FaveStar({
  itemId,
  isStarred,
  showTooltip,
  saveFaveStar,
}: FaveStarProps) {
  const theme = useTheme();
  const onClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      saveFaveStar(itemId, !!isStarred);
    },
    [isStarred, itemId, saveFaveStar],
  );

  const content = (
    <StarButton
      type="button"
      onClick={onClick}
      className="fave-unfave-icon"
      data-test="fave-unfave-icon"
      aria-label={isStarred ? t("Unfavorite") : t("Favorite")}
      aria-pressed={!!isStarred}
    >
      {isStarred ? (
        <StarFilled style={{ color: theme.colorWarning }} />
      ) : (
        <StarOutlined style={{ color: theme.colorTextTertiary }} />
      )}
    </StarButton>
  );

  return showTooltip ? (
    <Tooltip title={t("Click to favorite/unfavorite")}>{content}</Tooltip>
  ) : (
    content
  );
}
