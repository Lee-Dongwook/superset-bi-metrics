import { Button } from "antd";
import { EmptyState as EmptyStateComponent } from "@bi-metrics/core/components";
import { styled } from "@bi-metrics/core/theme";
import { t } from "@bi-metrics/core/translation";
import { TableTab } from "../../constants";
import { useIsMobile } from "../../hooks";
import { navigateTo } from "../../utils";
import { WelcomeTable } from "./types";

const EmptyContainer = styled.div`
  min-height: 200px;
  display: flex;
  color: ${({ theme }) => theme.colorTextDescription};
  flex-direction: column;
  justify-content: space-around;
`;

type ActionTable = Exclude<WelcomeTable, WelcomeTable.Recents>;

const LABELS: Record<"create" | "viewAll", Record<ActionTable, string>> = {
  create: {
    [WelcomeTable.Charts]: t("Chart"),
    [WelcomeTable.Dashboards]: t("Dashboard"),
    [WelcomeTable.SavedQueries]: t("SQL query"),
  },
  viewAll: {
    [WelcomeTable.Charts]: t("charts"),
    [WelcomeTable.Dashboards]: t("dashboards"),
    [WelcomeTable.SavedQueries]: t("SQL Lab queries"),
  },
};

const REDIRECTS: Record<"create" | "viewAll", Record<ActionTable, string>> = {
  create: {
    [WelcomeTable.Charts]: "/chart/add",
    [WelcomeTable.Dashboards]: "/dashboard/new/",
    [WelcomeTable.SavedQueries]: "/sqllab?new=true",
  },
  viewAll: {
    [WelcomeTable.Charts]: "/chart/list",
    [WelcomeTable.Dashboards]: "/dashboard/list/",
    [WelcomeTable.SavedQueries]: "/savedqueryview/list/",
  },
};

export interface EmptyStateProps {
  tableName: WelcomeTable;
  tab?: string;
  otherTabTitle?: string;
}

export default function EmptyState({ tableName, tab }: EmptyStateProps) {
  const isMobile = useIsMobile();
  const isFavorite = tab === TableTab.Favorite;
  // creation flows aren't part of the mobile consumption experience
  const showButton =
    tableName !== WelcomeTable.Recents && (!isMobile || isFavorite);
  const kind = isFavorite ? "viewAll" : "create";

  return (
    <EmptyContainer>
      <EmptyStateComponent
        size={isMobile ? "small" : "large"}
        description={t("Nothing here yet")}
      >
        {showButton && (
          <Button
            onClick={() => navigateTo({ url: REDIRECTS[kind][tableName] })}
          >
            {isFavorite
              ? t("See all %(tableName)s", {
                  tableName: LABELS.viewAll[tableName],
                })
              : LABELS.create[tableName]}
          </Button>
        )}
      </EmptyStateComponent>
    </EmptyContainer>
  );
}
