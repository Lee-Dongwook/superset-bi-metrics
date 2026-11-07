import type { WelcomeExtensionInnerItems } from "./WelcomeExtensionInner";

export enum TableTab {
  Viewed = "Viewed",
  Other = "Other",
  Created = "Created",
}

export interface User {
  userId?: string;
  [key: string]: any;
}

export type ActivityData = Record<TableTab | string, any>;

export interface ActivityTableProps {
  user: { userId: string };
  activeChild: any;
  setActiveChild: (val: any) => void;
  activityData: ActivityData;
  isFetchingActivityData: boolean;
}

export interface LoadingCardsProps {
  cover?: boolean;
}

export interface DashboardTableProps {
  user: User;
  mine: any;
  showThumbnails: boolean;
  otherTabData?: any;
  otherTabFilters?: any;
  otherTabTitle?: any;
}

export interface ChartTableProps {
  showThumbnails: boolean;
  user: User;
  mine: any;
  otherTabData?: any;
  otherTabFilters?: any;
  otherTabTitle?: any;
}

export interface ToastedSavedQueriesProps {
  showThumbnails: boolean;
  user: User;
  mine: any;
  featureFlag: boolean;
}

export interface WelcomeExtensionContext {
  t: (key: string) => string;
  activityData?: ActivityData;
  activeChild: any;
  setActiveChild: (val: any) => void;
  isFetchingActivityData: boolean;
  user: User;
  dashboardData?: any;
  isRecentActivityLoading: boolean;
  checked: boolean;
  otherTabFilters?: any;
  otherTabTitle?: any;
  isNotMobile: boolean;
  chartData?: any;
  canReadSavedQueries: boolean;
  queryData?: any;
  isThumbnailsEnabled: boolean;
}

interface WelcomeExtensionInnerItemsProps {
  context?: WelcomeExtensionContext;
  [key: string]: any;
}

export type WelcomeExtensionInnerItemsConverterFn = (
  props?: WelcomeExtensionInnerItemsProps,
) => WelcomeExtensionInnerItems[];

export const WelcomeExtensionInnerItemsConverter: WelcomeExtensionInnerItemsConverterFn =
  (props) => {
    const {
      t,
      activityData,
      activeChild,
      user,
      setActiveChild,
      isFetchingActivityData,
      LoadingCards,
      dashboardData,
      isRecentActivityLoading,
      checked,
      otherTabFilters,
      otherTabTitle,
      isNotMobile,
      chartData,
      canReadSavedQueries,
      queryData,
      isThumbnailsEnabled,
    } = props!;
    return [
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
      ...(isNotMobile
        ? [
            {
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
            },
          ]
        : []),
      ...(isNotMobile && canReadSavedQueries
        ? [
            {
              key: "saved-queries",
              label: t("Saved queries"),
              children: !queryData ? (
                <LoadingCards cover={checked} />
              ) : (
                <ToastedSavedQueries
                  showThumbnails={checked}
                  user={user}
                  mine={queryData}
                  featureFlag={isThumbnailsEnabled}
                />
              ),
            },
          ]
        : []),
    ];
  };
