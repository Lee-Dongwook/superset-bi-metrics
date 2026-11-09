import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import { t } from "@bi-metrics/core/translation";
import withToasts from "../../components/Toast/withToast";
import { TableTab } from "../../constants";
import ChartCard from "../charts/ChartCard";
import { useFavoriteStatus, useListViewResource } from "../../hooks";
import { CardContainer, LoadingCards } from "../../pages/Home/ui";
import type { Chart, Filter, UserWithPermissionsAndRoles } from "../../types";
import {
  getFilterValues,
  getItem,
  handleResourceExport,
  LocalStorageKeys,
  navigateTo,
  PAGE_SIZE,
  setItem,
} from "../../utils";
import EmptyState from "./EmptyState";
import SubMenu from "./SubMenu";
import { WelcomeTable } from "./types";

export interface ChartTableProps {
  addDangerToast: (message: string) => void;
  addSuccessToast: (message: string) => void;
  user?: UserWithPermissionsAndRoles;
  mine: Chart[];
  showThumbnails: boolean;
  otherTabData?: object[];
  otherTabFilters: Filter[];
  otherTabTitle: string;
}

// ponytail: the chart PropertiesModal (edit) isn't ported yet, so the card's
// Edit menu item is hidden; pass openChartEditModal once it is.
function ChartTable({
  user,
  addDangerToast,
  addSuccessToast,
  mine,
  showThumbnails,
  otherTabData,
  otherTabFilters,
  otherTabTitle,
}: ChartTableProps) {
  const navigate = useNavigate();
  const initialTab = getItem(LocalStorageKeys.HomepageChartFilter, TableTab.Other);
  const filteredOtherTabData = otherTabData?.filter(
    (obj) => "viz_type" in obj,
  ) as Chart[] | undefined;

  const {
    state: { loading, resourceCollection: charts, bulkSelectEnabled },
    hasPerm,
    refreshData,
    fetchData,
  } = useListViewResource<Chart>(
    "chart",
    t("chart"),
    addDangerToast,
    true,
    initialTab === TableTab.Mine ? mine : filteredOtherTabData,
    [],
    false,
  );

  const chartIds = useMemo(() => charts.map((c) => c.id), [charts]);
  const [saveFavoriteStatus, favoriteStatus] = useFavoriteStatus(
    "chart",
    chartIds,
    addDangerToast,
  );

  const [activeTab, setActiveTab] = useState(initialTab);
  const [preparingExport, setPreparingExport] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const getData = (tab: TableTab) =>
    fetchData({
      pageIndex: 0,
      pageSize: PAGE_SIZE,
      sortBy: [{ id: "changed_on_delta_humanized", desc: true }],
      filters: getFilterValues(tab, WelcomeTable.Charts, user, otherTabFilters),
    });

  useEffect(() => {
    if (loaded || activeTab === TableTab.Favorite) getData(activeTab);
    setLoaded(true);
  }, [activeTab]);

  const handleBulkChartExport = async (chartsToExport: Chart[]) => {
    setPreparingExport(true);
    try {
      await handleResourceExport(
        "chart",
        chartsToExport.map(({ id }) => id),
        () => setPreparingExport(false),
      );
    } catch {
      addDangerToast(t("There was an issue exporting the selected charts"));
    }
  };

  const menuTab = (name: TableTab, label: string) => ({
    name,
    label,
    onClick: () => {
      setActiveTab(name);
      setItem(LocalStorageKeys.HomepageChartFilter, name);
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
        tabs={menuTabs}
        backgroundColor="transparent"
        buttons={[
          {
            icon: <PlusOutlined />,
            name: t("Chart"),
            buttonStyle: "secondary",
            onClick: () =>
              navigateTo({ url: "/chart/add", options: { assign: true } }),
          },
          {
            name: t("View All »"),
            buttonStyle: "link",
            onClick: () =>
              navigate(
                activeTab === TableTab.Favorite
                  ? `/chart/list/?filters=(favorite:(label:${t("Yes")},value:!t))`
                  : "/chart/list/",
              ),
          },
        ]}
      />
      {charts.length ? (
        <CardContainer showThumbnails={showThumbnails}>
          {charts.map((e) => (
            <ChartCard
              key={e.id}
              chartFilter={activeTab}
              chart={e}
              user={user}
              hasPerm={hasPerm}
              showThumbnails={showThumbnails}
              bulkSelectEnabled={bulkSelectEnabled}
              refreshData={refreshData}
              addDangerToast={addDangerToast}
              addSuccessToast={addSuccessToast}
              getData={getData}
              favoriteStatus={favoriteStatus[e.id]}
              saveFavoriteStatus={saveFavoriteStatus}
              handleBulkChartExport={handleBulkChartExport}
            />
          ))}
        </CardContainer>
      ) : (
        <EmptyState
          tableName={WelcomeTable.Charts}
          tab={activeTab}
          otherTabTitle={otherTabTitle}
        />
      )}
      {preparingExport && <Spin fullscreen />}
    </>
  );
}

export default withToasts(ChartTable);
