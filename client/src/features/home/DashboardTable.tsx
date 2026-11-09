import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import { DeleteModal } from "@bi-metrics/core/components";
import { t } from "@bi-metrics/core/translation";
import withToasts from "../../components/Toast/withToast";
import { TableTab } from "../../constants";
import DashboardCard from "../dashboards/DashboardCard";
import { useFavoriteStatus, useListViewResource } from "../../hooks";
import { CardContainer, LoadingCards } from "../../pages/Home/ui";
import type { Dashboard, Filter, UserWithPermissionsAndRoles } from "../../types";
import {
  getFilterValues,
  getItem,
  handleDashboardDelete,
  handleResourceExport,
  LocalStorageKeys,
  navigateTo,
  PAGE_SIZE,
  setItem,
} from "../../utils";
import EmptyState from "./EmptyState";
import SubMenu from "./SubMenu";
import { WelcomeTable } from "./types";

export interface DashboardTableProps {
  addDangerToast: (message: string) => void;
  addSuccessToast: (message: string) => void;
  user?: UserWithPermissionsAndRoles;
  mine: Dashboard[];
  showThumbnails?: boolean;
  otherTabData?: object[];
  otherTabFilters: Filter[];
  otherTabTitle: string;
}

// ponytail: the dashboard PropertiesModal (edit) isn't ported yet, so the
// card's Edit menu item is hidden; pass openDashboardEditModal once it is.
function DashboardTable({
  user,
  addDangerToast,
  addSuccessToast,
  mine,
  showThumbnails,
  otherTabData,
  otherTabFilters,
  otherTabTitle,
}: DashboardTableProps) {
  const navigate = useNavigate();
  const defaultTab = getItem(
    LocalStorageKeys.HomepageDashboardFilter,
    TableTab.Other,
  );
  const filteredOtherTabData = otherTabData?.filter(
    (obj) => !("viz_type" in obj),
  ) as Dashboard[] | undefined;

  const {
    state: { loading, resourceCollection: dashboards },
    hasPerm,
    refreshData,
    fetchData,
  } = useListViewResource<Dashboard>(
    "dashboard",
    t("dashboard"),
    addDangerToast,
    true,
    defaultTab === TableTab.Mine ? mine : filteredOtherTabData,
    [],
    false,
  );
  const dashboardIds = useMemo(() => dashboards.map((d) => d.id), [dashboards]);
  const [saveFavoriteStatus, favoriteStatus] = useFavoriteStatus(
    "dashboard",
    dashboardIds,
    addDangerToast,
  );

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [preparingExport, setPreparingExport] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // /dashboard/new/ is a hard navigation that creates the dashboard
  // server-side; keep the button spinning until the page unloads.
  const [creatingDashboard, setCreatingDashboard] = useState(false);
  const [dashboardToDelete, setDashboardToDelete] = useState<Dashboard | null>(
    null,
  );

  const getData = (tab: TableTab) =>
    fetchData({
      pageIndex: 0,
      pageSize: PAGE_SIZE,
      sortBy: [{ id: "changed_on_delta_humanized", desc: true }],
      filters: getFilterValues(
        tab,
        WelcomeTable.Dashboards,
        user,
        otherTabFilters,
      ),
    });

  useEffect(() => {
    if (loaded || activeTab === TableTab.Favorite) getData(activeTab);
    setLoaded(true);
  }, [activeTab]);

  const handleBulkDashboardExport = async (toExport: Dashboard[]) => {
    setPreparingExport(true);
    try {
      await handleResourceExport(
        "dashboard",
        toExport.map(({ id }) => id),
        () => setPreparingExport(false),
      );
    } catch {
      addDangerToast(t("There was an issue exporting the selected dashboards"));
    }
  };

  const menuTab = (name: TableTab, label: string) => ({
    name,
    label,
    onClick: () => {
      setActiveTab(name);
      setItem(LocalStorageKeys.HomepageDashboardFilter, name);
    },
  });
  const menuTabs = [
    menuTab(TableTab.Favorite, t("Favorite")),
    menuTab(TableTab.Mine, t("Mine")),
    ...(otherTabData ? [menuTab(TableTab.Other, otherTabTitle)] : []),
  ];

  if (loading) return <LoadingCards cover={showThumbnails} />;
  return (
    <>
      <SubMenu
        activeChild={activeTab}
        backgroundColor="transparent"
        tabs={menuTabs}
        buttons={[
          {
            icon: <PlusOutlined />,
            name: t("Dashboard"),
            buttonStyle: "secondary",
            loading: creatingDashboard,
            onClick: () => {
              setCreatingDashboard(true);
              navigateTo({ url: "/dashboard/new/", options: { assign: true } });
            },
          },
          {
            name: t("View All »"),
            buttonStyle: "link",
            onClick: () =>
              navigate(
                activeTab === TableTab.Favorite
                  ? `/dashboard/list/?filters=(favorite:(label:${t("Yes")},value:!t))`
                  : "/dashboard/list/",
              ),
          },
        ]}
      />
      {dashboardToDelete && (
        <DeleteModal
          open
          title={t("Please confirm")}
          description={
            <>
              {t("Are you sure you want to delete")}{" "}
              <b>{dashboardToDelete.dashboard_title}</b>?
            </>
          }
          onConfirm={() => {
            handleDashboardDelete(
              dashboardToDelete,
              refreshData,
              addSuccessToast,
              addDangerToast,
              activeTab,
              getData,
            );
            setDashboardToDelete(null);
          }}
          onHide={() => setDashboardToDelete(null)}
        />
      )}
      {dashboards.length > 0 ? (
        <CardContainer showThumbnails={showThumbnails}>
          {dashboards.map((e) => (
            <DashboardCard
              key={e.id}
              dashboard={e}
              hasPerm={hasPerm}
              bulkSelectEnabled={false}
              showThumbnails={showThumbnails}
              user={user}
              loading={loading}
              saveFavoriteStatus={saveFavoriteStatus}
              favoriteStatus={favoriteStatus[e.id]}
              handleBulkDashboardExport={handleBulkDashboardExport}
              onDelete={setDashboardToDelete}
            />
          ))}
        </CardContainer>
      ) : (
        <EmptyState tableName={WelcomeTable.Dashboards} tab={activeTab} />
      )}
      {preparingExport && <Spin fullscreen />}
    </>
  );
}

export default withToasts(DashboardTable);
