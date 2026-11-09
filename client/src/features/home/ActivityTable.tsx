import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  BarChartOutlined,
  ConsoleSqlOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import { ListViewCard } from "@bi-metrics/core/components";
import { styled } from "@bi-metrics/core/theme";
import { t } from "@bi-metrics/core/translation";
import { TableTab } from "../../constants";
import { useIsMobile } from "../../hooks";
import { CardContainer, CardStyles, LoadingCards } from "../../pages/Home/ui";
import type { Chart, Dashboard, SavedQueryObject } from "../../types";
import { getEditedObjects, LocalStorageKeys, setItem } from "../../utils";
import type { ActivityData } from "./ActivityData";
import EmptyState from "./EmptyState";
import SubMenu from "./SubMenu";
import { WelcomeTable, type RecentActivity } from "./types";

dayjs.extend(relativeTime);

type ActivityObject = RecentActivity | Chart | Dashboard | SavedQueryObject;

interface ActivityProps {
  user: { userId: string | number };
  activeChild: string;
  setActiveChild: (arg0: string) => void;
  activityData: ActivityData;
  isFetchingActivityData: boolean;
}

const Styles = styled.div`
  .recentCards {
    max-height: none;
    grid-gap: ${({ theme }) => `${theme.sizeUnit * 4}px`};
  }
`;

const UNTITLED = t("[Untitled]");
const UNKNOWN_TIME = t("Unknown");

// dashboards are the only entities viewable in mobile consumption mode
const isDashboardEntity = (entity: ActivityObject) =>
  "dashboard_title" in entity ||
  ("item_type" in entity && entity.item_type === "dashboard");

const getEntityTitle = (entity: ActivityObject) => {
  if ("dashboard_title" in entity) return entity.dashboard_title || UNTITLED;
  if ("slice_name" in entity) return entity.slice_name || UNTITLED;
  if ("label" in entity) return entity.label || UNTITLED;
  return entity.item_title || UNTITLED;
};

const getEntityIcon = (entity: ActivityObject) => {
  if ("sql" in entity) return <ConsoleSqlOutlined />;
  const url = "item_url" in entity ? entity.item_url : entity.url;
  if (url?.includes("dashboard")) return <DashboardOutlined />;
  if (url?.includes("explore")) return <BarChartOutlined />;
  return null;
};

const getEntityUrl = (entity: ActivityObject) => {
  if ("sql" in entity) return `/sqllab?savedQueryId=${entity.id}`;
  if ("url" in entity) return entity.url;
  return entity.item_url;
};

const getEntityLastActionOn = (entity: ActivityObject) => {
  if ("time" in entity) return t("Viewed %s", dayjs(entity.time).fromNow());
  if (entity.changed_on_delta_humanized != null) {
    return t("Modified %s", entity.changed_on_delta_humanized);
  }
  const time =
    ("changed_on_utc" in entity && entity.changed_on_utc) ||
    ("changed_on" in entity && entity.changed_on) ||
    null;
  return t("Modified %s", time ? dayjs(time).fromNow() : UNKNOWN_TIME);
};

export default function ActivityTable({
  activeChild,
  setActiveChild,
  activityData,
  user,
  isFetchingActivityData,
}: ActivityProps) {
  const [editedCards, setEditedCards] = useState<ActivityObject[]>();
  const [isFetchingEditedCards, setIsFetchingEditedCards] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    let isMounted = true;
    if (activeChild === TableTab.Edited) {
      setIsFetchingEditedCards(true);
      void getEditedObjects(user.userId).then((r) => {
        if (!isMounted) return;
        // getEditedObjects resolves with the raw error on failure
        const editedChart = Array.isArray(r?.editedChart) ? r.editedChart : [];
        const editedDash = Array.isArray(r?.editedDash) ? r.editedDash : [];
        setEditedCards([...editedChart, ...editedDash]);
        setIsFetchingEditedCards(false);
      });
    }
    return () => {
      isMounted = false;
      setIsFetchingEditedCards(false);
    };
  }, [activeChild, user.userId]);

  const tab = (name: TableTab, label: string) => ({
    name,
    label,
    onClick: () => {
      setActiveChild(name);
      setItem(LocalStorageKeys.HomepageActivityFilter, name);
    },
  });
  const tabs = [
    ...(activityData?.[TableTab.Viewed]
      ? [tab(TableTab.Viewed, t("Viewed"))]
      : []),
    tab(TableTab.Edited, t("Edited")),
    tab(TableTab.Created, t("Created")),
  ];

  const rawActivities = ((activeChild === TableTab.Edited
    ? editedCards
    : activityData[activeChild as keyof ActivityData]) ??
    []) as ActivityObject[];
  const activities = isMobile
    ? rawActivities.filter(isDashboardEntity)
    : rawActivities;

  if ((isFetchingEditedCards && !editedCards) || isFetchingActivityData) {
    return <LoadingCards />;
  }
  return (
    <Styles>
      <SubMenu
        activeChild={activeChild}
        tabs={tabs}
        backgroundColor="transparent"
      />
      {activities.length > 0 ? (
        <CardContainer className="recentCards">
          {activities.map((entity) => {
            const url = getEntityUrl(entity);
            return (
              <CardStyles key={url}>
                <Link to={url}>
                  <ListViewCard
                    cover={<></>}
                    url={url}
                    title={getEntityTitle(entity)}
                    description={getEntityLastActionOn(entity)}
                    avatar={getEntityIcon(entity)}
                    actions={null}
                  />
                </Link>
              </CardStyles>
            );
          })}
        </CardContainer>
      ) : (
        <EmptyState tableName={WelcomeTable.Recents} tab={activeChild} />
      )}
    </Styles>
  );
}
