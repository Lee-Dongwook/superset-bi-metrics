import { useEffect, useMemo, useState } from "react";
import { Switch } from "antd";
import rison from "rison";
import {
  FeatureFlag,
  getExtensionsRegistry,
  isFeatureEnabled,
} from "@bi-metrics/core";
import { t } from "@bi-metrics/core/translation";
import { TableTab } from "../../constants";
import { userHasPermission } from "../../dashboard/utils";
import type { ActivityData } from "../../features/home/ActivityData";
import SubMenu, { type SubMenuProps } from "../../features/home/SubMenu";
import type { WelcomePageLastTab } from "../../features/home/types";
import withToasts from "../../components/Toast/withToast";
import { useIsMobile } from "../../hooks";
import type { Filter, UserWithPermissionsAndRoles } from "../../types";
import {
  createErrorHandler,
  dangerouslyGetItemDoNotUse,
  dangerouslySetItemDoNotUse,
  getItem,
  getRecentActivityObjs,
  getUserEditableObjects,
  LocalStorageKeys,
  redirect,
  setItem,
} from "../../utils";
import getBootstrapData from "../../utils/bootstrap";
import { WelcomeExtensionInner } from "./WelcomeExtensionInner";
import { WelcomeExtensionInnerItemsConverter } from "./WelcomeExtensionInnerItemsConverter";
import { WelcomeContainer, WelcomeNav } from "./ui";

interface WelcomeProps {
  user: UserWithPermissionsAndRoles;
  addDangerToast: (arg0: string) => void;
}

const DEFAULT_TAB_ARR = ["dashboards", "charts"];

const extensionsRegistry = getExtensionsRegistry();
const bootstrapData = getBootstrapData();

function getOtherTab(): [string, Filter[]] {
  const lastTab = bootstrapData.common?.conf
    ?.WELCOME_PAGE_LAST_TAB as WelcomePageLastTab;
  if (Array.isArray(lastTab) && lastTab[0] && lastTab[1]) {
    return [t(lastTab[0]), lastTab[1]];
  }
  if (lastTab === "all") return [t("All"), []];
  return [t("Examples"), [{ col: "created_by", opr: "rel_o_m", value: 0 }]];
}

function Welcome({ user, addDangerToast }: Readonly<WelcomeProps>) {
  const isNotMobile = !useIsMobile();
  const canReadSavedQueries = userHasPermission(user, "SavedQuery", "can_read");
  const id = user.userId!.toString(); // not a guest user on this page
  const recent = `/api/v1/log/recent_activity/?q=${rison.encode({
    page_size: 24,
    distinct: false,
  })}`;

  const isThumbnailsEnabled = isFeatureEnabled(FeatureFlag.Thumbnails);
  const [checked, setChecked] = useState(() => {
    if (!isThumbnailsEnabled) return false;
    return dangerouslyGetItemDoNotUse(id, null)?.thumbnails ?? true;
  });
  const [activeChild, setActiveChild] = useState("Loading");
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [chartData, setChartData] = useState<object[] | null>(null);
  const [queryData, setQueryData] = useState<object[] | null>(null);
  const [dashboardData, setDashboardData] = useState<object[] | null>(null);
  const [isFetchingActivityData, setIsFetchingActivityData] = useState(true);

  const collapseState = getItem(LocalStorageKeys.HomepageCollapseState, []);
  const [activeState, setActiveState] = useState<string[]>(collapseState);

  const handleCollapse = (state: string[]) => {
    setActiveState(state);
    setItem(LocalStorageKeys.HomepageCollapseState, state);
  };

  const SubmenuExtension = extensionsRegistry.get("home.submenu");
  const WelcomeMessageExtension = extensionsRegistry.get("welcome.message");
  const WelcomeTopExtension = extensionsRegistry.get("welcome.banner");
  const WelcomeMainExtension = extensionsRegistry.get(
    "welcome.main.replacement",
  );

  const [otherTabTitle, otherTabFilters] = useMemo(getOtherTab, []);

  useEffect(() => {
    if (WelcomeMainExtension) return;
    const activeTab = getItem(LocalStorageKeys.HomepageActivityFilter, null);
    setActiveState(collapseState.length > 0 ? collapseState : DEFAULT_TAB_ARR);

    getRecentActivityObjs(recent, addDangerToast, otherTabFilters)
      .then((res) => {
        const data: ActivityData = { [TableTab.Other]: res.other };
        const viewed = res.viewed.filter((r) => r.item_url != null);
        data[TableTab.Viewed] = viewed;
        setActiveChild(
          activeTab ?? (viewed.length ? TableTab.Viewed : TableTab.Created),
        );
        setActivityData((prev) => ({ ...prev, ...data }));
      })
      .catch(
        createErrorHandler((errMsg) => {
          setActivityData((prev) => ({ ...prev, [TableTab.Viewed]: [] }));
          setActiveChild(activeTab ?? TableTab.Created);
          addDangerToast(
            t("There was an issue fetching your recent activity: %s", errMsg),
          );
        }),
      );

    const load = (
      resource: string,
      setData: (data: object[]) => void,
      errorLabel: string,
      filters?: Filter[],
    ) =>
      getUserEditableObjects(id, resource, filters)
        .then(setData)
        .catch((err: unknown) => {
          setData([]);
          addDangerToast(
            t("There was an issue fetching your %s: %s", errorLabel, err),
          );
        });

    Promise.all([
      load("dashboard", setDashboardData, t("dashboards")),
      load("chart", setChartData, t("chart")),
      canReadSavedQueries
        ? load("saved_query", setQueryData, t("saved queries"), [
            { col: "created_by", opr: "rel_o_m", value: id },
          ])
        : undefined,
    ]).then(() => setIsFetchingActivityData(false));
  }, [otherTabFilters]);

  useEffect(() => {
    setActivityData((prev) => ({
      ...prev,
      [TableTab.Created]: [
        ...(chartData?.slice(0, 3) || []),
        ...(dashboardData?.slice(0, 3) || []),
        ...(queryData?.slice(0, 3) || []),
      ],
    }));
  }, [chartData, queryData, dashboardData]);

  const handleToggle = () => {
    setChecked(!checked);
    dangerouslySetItemDoNotUse(id, { thumbnails: !checked });
  };

  const menuData: SubMenuProps = {
    activeChild: "Home",
    name: t("Home"),
    buttons: isThumbnailsEnabled
      ? [
          {
            name: (
              <WelcomeNav>
                <div className="switch">
                  <Switch checked={checked} onClick={handleToggle} />
                  <span>{t("Thumbnails")}</span>
                </div>
              </WelcomeNav>
            ),
            buttonStyle: "link",
          },
        ]
      : undefined,
  };

  return (
    <>
      {SubmenuExtension ? (
        <SubmenuExtension {...menuData} />
      ) : (
        <SubMenu {...menuData} />
      )}
      <WelcomeContainer>
        {WelcomeMessageExtension && <WelcomeMessageExtension />}
        {WelcomeTopExtension && <WelcomeTopExtension />}
        {WelcomeMainExtension && <WelcomeMainExtension />}
        {(!WelcomeTopExtension || !WelcomeMainExtension) && (
          <WelcomeExtensionInner
            activeState={activeState}
            handleCollapse={handleCollapse}
            items={WelcomeExtensionInnerItemsConverter({
              user,
              activityData,
              activeChild,
              setActiveChild,
              isFetchingActivityData,
              isRecentActivityLoading:
                !activityData?.[TableTab.Other] &&
                !activityData?.[TableTab.Viewed],
              dashboardData,
              chartData,
              queryData,
              checked,
              otherTabFilters,
              otherTabTitle,
              isNotMobile,
              canReadSavedQueries,
              isThumbnailsEnabled,
            })}
          />
        )}
      </WelcomeContainer>
    </>
  );
}

export function WelcomePage({
  user,
  ...props
}: Omit<WelcomeProps, "user"> & { user?: UserWithPermissionsAndRoles }) {
  const hasUserId = user?.userId != null;

  useEffect(() => {
    // SPA navigation can bypass the server-side login check
    if (!hasUserId) redirect("/login/");
  }, [hasUserId]);

  return hasUserId ? <Welcome {...props} user={user} /> : null;
}

export default withToasts(WelcomePage);
