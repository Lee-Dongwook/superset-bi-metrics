import { useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DeleteOutlined, EditOutlined, UploadOutlined } from "@ant-design/icons";
import { Tag, Tooltip } from "antd";
import { isFeatureEnabled, FeatureFlag } from "@bi-metrics/core";
import {
  DeleteModal,
  FaveStar,
  ListViewCard,
} from "@bi-metrics/core/components";
import { t } from "@bi-metrics/core/translation";
import KebabMenuButton, { type MenuItem } from "../../components/KebabMenuButton";
import { TableTab } from "../../constants";
import { isUserEditorOrAdmin } from "../../dashboard/utils";
import { CardStyles } from "../../pages/Home/ui";
import type {
  Chart,
  FetchDataConfig,
  UserWithPermissionsAndRoles,
} from "../../types";
import { handleChartDelete, isNavigationHandledByLink } from "../../utils";

interface ChartCardProps {
  chart: Chart;
  hasPerm: (perm: string) => boolean;
  openChartEditModal?: (chart: Chart) => void;
  bulkSelectEnabled: boolean;
  addDangerToast: (msg: string) => void;
  addSuccessToast: (msg: string) => void;
  refreshData: (config?: FetchDataConfig | null) => void;
  loading?: boolean;
  saveFavoriteStatus: (id: number, isStarred: boolean) => void;
  favoriteStatus: boolean;
  chartFilter?: string;
  user?: UserWithPermissionsAndRoles;
  showThumbnails?: boolean;
  handleBulkChartExport: (chartsToExport: Chart[]) => void;
  getData?: (tab: TableTab) => void;
}

export default function ChartCard({
  chart,
  hasPerm,
  openChartEditModal,
  bulkSelectEnabled,
  addDangerToast,
  addSuccessToast,
  refreshData,
  loading,
  showThumbnails,
  saveFavoriteStatus,
  favoriteStatus,
  chartFilter,
  user,
  handleBulkChartExport,
  getData,
}: ChartCardProps) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canWrite = hasPerm("can_write");
  const allowEdit = isUserEditorOrAdmin(user, chart.editors, chart.extra_editors);
  const editorOnly = (action: string) =>
    allowEdit
      ? null
      : t(
          "You must be a chart editor in order to %s. Please reach out to a chart editor to request modifications or edit access.",
          action,
        );

  const menuItems: MenuItem[] = [];
  if (canWrite && openChartEditModal) {
    menuItems.push({
      key: "edit",
      icon: <EditOutlined />,
      label: <Tooltip title={editorOnly(t("edit"))}>{t("Edit")}</Tooltip>,
      disabled: !allowEdit,
      onClick: () => openChartEditModal(chart),
    });
  }
  if (hasPerm("can_export")) {
    menuItems.push({
      key: "export",
      icon: <UploadOutlined />,
      label: t("Export"),
      onClick: () => handleBulkChartExport([chart]),
    });
  }
  if (canWrite) {
    menuItems.push({
      key: "delete",
      icon: <DeleteOutlined />,
      label: <Tooltip title={editorOnly(t("delete"))}>{t("Delete")}</Tooltip>,
      disabled: !allowEdit,
      onClick: () => setConfirmDelete(true),
    });
  }

  return (
    <CardStyles
      onClick={(event) => {
        if (!bulkSelectEnabled && chart.url && !isNavigationHandledByLink(event)) {
          navigate(chart.url);
        }
      }}
    >
      <ListViewCard
        loading={loading}
        title={chart.slice_name}
        certifiedBy={chart.certified_by}
        certificationDetails={chart.certification_details}
        cover={
          !isFeatureEnabled(FeatureFlag.Thumbnails) || !showThumbnails ? (
            <></>
          ) : null
        }
        url={bulkSelectEnabled ? undefined : chart.url}
        imgURL={chart.thumbnail_url || ""}
        description={t("Modified %s", chart.changed_on_delta_humanized)}
        coverRight={
          chart.datasource_name_text && <Tag>{chart.datasource_name_text}</Tag>
        }
        linkComponent={Link}
        actions={
          <ListViewCard.Actions
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            {user?.userId && (
              <FaveStar
                itemId={chart.id}
                saveFaveStar={saveFavoriteStatus}
                isStarred={favoriteStatus}
              />
            )}
            <KebabMenuButton menuItems={menuItems} dataTest="chart-card-menu" />
          </ListViewCard.Actions>
        }
      />
      {confirmDelete && (
        // stop clicks inside the modal from bubbling to the card's navigate
        <div onClick={(e) => e.stopPropagation()}>
          <DeleteModal
            open
            title={t("Please confirm")}
            description={
              <>
                {t("Are you sure you want to delete")} <b>{chart.slice_name}</b>?
              </>
            }
            onConfirm={() => {
              setConfirmDelete(false);
              handleChartDelete(
                chart,
                addSuccessToast,
                addDangerToast,
                refreshData,
                chartFilter,
                user?.userId,
                getData,
              );
            }}
            onHide={() => setConfirmDelete(false)}
          />
        </div>
      )}
    </CardStyles>
  );
}
