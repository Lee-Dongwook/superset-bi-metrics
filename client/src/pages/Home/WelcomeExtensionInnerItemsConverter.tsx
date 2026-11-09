import { t } from "@bi-metrics/core/translation";
import { TableTab } from "../../constants";
import ActivityTable from "../../features/home/ActivityTable";
import ChartTable from "../../features/home/ChartTable";
import DashboardTable from "../../features/home/DashboardTable";
import SavedQueries from "../../features/home/SavedQueries";
import type { ActivityData } from "../../features/home/ActivityData";
import type { Filter, UserWithPermissionsAndRoles } from "../../types";
import type { WelcomeExtensionInnerItems } from "./WelcomeExtensionInner";
import { LoadingCards } from "./ui";

export interface WelcomeExtensionContext {
  user: UserWithPermissionsAndRoles;
  activityData: ActivityData | null;
  activeChild: string;
  setActiveChild: (val: string) => void;
  isFetchingActivityData: boolean;
  isRecentActivityLoading: boolean;
  dashboardData: object[] | null;
  chartData: object[] | null;
  queryData: object[] | null;
  checked: boolean;
  otherTabFilters: Filter[];
  otherTabTitle: string;
  isNotMobile: boolean;
  canReadSavedQueries: boolean;
  isThumbnailsEnabled: boolean;
}

export function WelcomeExtensionInnerItemsConverter({
  user,
  activityData,
  activeChild,
  setActiveChild,
  isFetchingActivityData,
  isRecentActivityLoading,
  dashboardData,
  chartData,
  queryData,
  checked,
  otherTabFilters,
  otherTabTitle,
  isNotMobile,
  canReadSavedQueries,
  isThumbnailsEnabled,
}: WelcomeExtensionContext): WelcomeExtensionInnerItems[] {
  const items: WelcomeExtensionInnerItems[] = [
    {
      key: "recents",
      label: t("Recents"),
      children:
        activityData &&
        (activityData[TableTab.Viewed] ||
          activityData[TableTab.Other] ||
          activityData[TableTab.Created]) &&
        activeChild !== "Loading" ? (
          <ActivityTable
            user={{ userId: user.userId! }}
            activeChild={activeChild}
            setActiveChild={setActiveChild}
            activityData={activityData}
            isFetchingActivityData={isFetchingActivityData}
          />
        ) : (
          <LoadingCards />
        ),
    },
    {
      key: "dashboards",
      label: t("Dashboards"),
      children:
        !dashboardData || isRecentActivityLoading ? (
          <LoadingCards cover={checked} />
        ) : (
          <DashboardTable
            user={user}
            mine={dashboardData}
            showThumbnails={checked}
            otherTabData={activityData?.[TableTab.Other]}
            otherTabFilters={otherTabFilters}
            otherTabTitle={otherTabTitle}
          />
        ),
    },
  ];

  // charts and saved queries are hidden in mobile consumption mode
  if (isNotMobile) {
    items.push({
      key: "charts",
      label: t("Charts"),
      children:
        !chartData || isRecentActivityLoading ? (
          <LoadingCards cover={checked} />
        ) : (
          <ChartTable
            showThumbnails={checked}
            user={user}
            mine={chartData}
            otherTabData={activityData?.[TableTab.Other]}
            otherTabFilters={otherTabFilters}
            otherTabTitle={otherTabTitle}
          />
        ),
    });
  }
  if (isNotMobile && canReadSavedQueries) {
    items.push({
      key: "saved-queries",
      label: t("Saved queries"),
      children: !queryData ? (
        <LoadingCards cover={checked} />
      ) : (
        <SavedQueries
          showThumbnails={checked}
          user={user}
          mine={queryData}
          featureFlag={isThumbnailsEnabled}
        />
      ),
    });
  }
  return items;
}
