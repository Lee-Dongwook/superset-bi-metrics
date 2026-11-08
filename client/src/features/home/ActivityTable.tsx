import { useEffect, useState } from "react";
import { ActivityData } from "./ActivityData";
import { useIsMobile } from "../../hooks";
import { TableTab } from "../../constants";
import { t } from "@bi-metrics/core/translation";
import { getEditedObjects, LocalStorageKeys, setItem } from "../../utils";

interface ActivityUser {
  userId: string | number;
}

interface ActivityProps {
  user: ActivityUser;
  activeChild: string;
  setActiveChild: (arg0: string) => void;
  activityData: ActivityData;
  isFetchingActivityData: boolean;
}

export default function ActivityTable({
  activeChild,
  setActiveChild,
  activityData,
  user,
  isFetchingActivityData,
}: ActivityProps) {
  const [editedCards, setEditedCards] = useState<ActivityData[]>();
  const [isFetchingEditedCards, setIsFetchingEditedCards] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    let isMounted = true;

    if (activeChild === TableTab.Edited) {
      setIsFetchingEditedCards(true);
      void getEditedObjects(user.userId).then((r) => {
        if (!isMounted) return;
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

  const tabs = [
    {
      name: TableTab.Edited,
      label: t("Edited"),
      onClick: () => {
        setActiveChild(TableTab.Edited);
        setItem(LocalStorageKeys.HomepageActivityFilter, TableTab.Edited);
      },
    },
    {
      name: TableTab.Created,
      label: t("Created"),
      onClick: () => {
        setActiveChild(TableTab.Created);
        setItem(LocalStorageKeys.HomepageActivityFilter, TableTab.Created);
      },
    },
  ];

  if (activityData?.[TableTab.Viewed]) {
    tabs.unshift({
      name: TableTab.Viewed,
      label: t("Viewed"),
      onClick: () => {
        setActiveChild(TableTab.Viewed);
        setItem(LocalStorageKeys.HomepageActivityFilter, TableTab.Viewed);
      },
    });
  }
}
