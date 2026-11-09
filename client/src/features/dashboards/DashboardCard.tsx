import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DeleteOutlined, EditOutlined, UploadOutlined } from "@ant-design/icons";
import { Tag, Tooltip } from "antd";
import { isFeatureEnabled, FeatureFlag } from "@bi-metrics/core";
import { FaveStar, ListViewCard } from "@bi-metrics/core/components";
import { t } from "@bi-metrics/core/translation";
import KebabMenuButton, { type MenuItem } from "../../components/KebabMenuButton";
import { isUserEditorOrAdmin } from "../../dashboard/utils";
import { useIsMobile } from "../../hooks";
import { CardStyles } from "../../pages/Home/ui";
import type { Dashboard, UserWithPermissionsAndRoles } from "../../types";
import { isNavigationHandledByLink } from "../../utils";

interface DashboardCardProps {
  dashboard: Dashboard;
  hasPerm: (name: string) => boolean;
  bulkSelectEnabled: boolean;
  loading: boolean;
  openDashboardEditModal?: (d: Dashboard) => void;
  saveFavoriteStatus: (id: number, isStarred: boolean) => void;
  favoriteStatus: boolean;
  user?: UserWithPermissionsAndRoles;
  showThumbnails?: boolean;
  handleBulkDashboardExport: (dashboardsToExport: Dashboard[]) => void;
  onDelete: (dashboard: Dashboard) => void;
}

export default function DashboardCard({
  dashboard,
  hasPerm,
  bulkSelectEnabled,
  user,
  openDashboardEditModal,
  favoriteStatus,
  saveFavoriteStatus,
  showThumbnails,
  handleBulkDashboardExport,
  onDelete,
}: DashboardCardProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const canWrite = hasPerm("can_write");
  const allowEdit = isUserEditorOrAdmin(
    user,
    dashboard.editors,
    dashboard.extra_editors,
  );
  const thumbnailsEnabled = isFeatureEnabled(FeatureFlag.Thumbnails);
  const digest = dashboard.changed_on_utc || dashboard.changed_on;
  const thumbnailUrl =
    thumbnailsEnabled && dashboard.id && digest
      ? `/api/v1/dashboard/${dashboard.id}/thumbnail/${encodeURIComponent(digest)}/`
      : "";
  const editorOnly = (action: string) =>
    allowEdit
      ? null
      : t(
          "You must be a dashboard editor in order to %s. Please reach out to a dashboard editor to request modifications or edit access.",
          action,
        );

  const menuItems: MenuItem[] = [];
  if (canWrite && openDashboardEditModal) {
    menuItems.push({
      key: "edit",
      icon: <EditOutlined />,
      label: <Tooltip title={editorOnly(t("edit"))}>{t("Edit")}</Tooltip>,
      disabled: !allowEdit,
      onClick: () => openDashboardEditModal(dashboard),
    });
  }
  if (hasPerm("can_export")) {
    menuItems.push({
      key: "export",
      icon: <UploadOutlined />,
      label: t("Export"),
      onClick: () => handleBulkDashboardExport([dashboard]),
    });
  }
  if (canWrite) {
    menuItems.push({
      key: "delete",
      icon: <DeleteOutlined />,
      label: <Tooltip title={editorOnly(t("delete"))}>{t("Delete")}</Tooltip>,
      disabled: !allowEdit,
      onClick: () => onDelete(dashboard),
    });
  }

  return (
    <CardStyles
      onClick={(event) => {
        if (!bulkSelectEnabled && !isNavigationHandledByLink(event)) {
          navigate(dashboard.url);
        }
      }}
    >
      <ListViewCard
        loading={dashboard.loading || false}
        title={dashboard.dashboard_title}
        certifiedBy={dashboard.certified_by}
        certificationDetails={dashboard.certification_details}
        titleRight={
          <Tag color={dashboard.published ? "success" : "default"}>
            {dashboard.published ? t("Published") : t("Draft")}
          </Tag>
        }
        cover={!thumbnailsEnabled || !showThumbnails ? <></> : null}
        url={bulkSelectEnabled ? undefined : dashboard.url}
        linkComponent={Link}
        imgURL={thumbnailUrl}
        description={t("Modified %s", dashboard.changed_on_delta_humanized)}
        actions={
          <ListViewCard.Actions
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            {user?.userId && (
              <FaveStar
                itemId={dashboard.id}
                saveFaveStar={saveFavoriteStatus}
                isStarred={favoriteStatus}
              />
            )}
            {!isMobile && (
              <KebabMenuButton
                menuItems={menuItems}
                dataTest="dashboard-card-menu"
              />
            )}
          </ListViewCard.Actions>
        }
      />
    </CardStyles>
  );
}
