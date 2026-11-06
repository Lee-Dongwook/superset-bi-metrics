import { useState, useEffect } from "react";
import rison from "rison";
import { useIsMobile } from "../../hooks";

interface WelcomeProps {
  user: any;
  addDangerToast: (arg0: string) => void;
}

function Welcome({ user, addDangerToast }: WelcomeProps) {
  const isDesktop = !useIsMobile();
  const canReadSavedQueries = userHasPermission(user, "SavedQuery", "can_read");

  const userId = user.userId;
  const id = userId!.toString();
  const params = rison.encode({ page_size: 24, distinct: false });
  const recent = `/api/v1/log/recent_activity/?q=${params}`;

  const [activeChild, setActiveChild] = useState("Loading");
  const [checked, setChecked] = useState(defaultChecked);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [chartData, setChartData] = useState<Array<object> | null>(null);
  const [queryData, setQueryData] = useState<Array<object> | null>(null);
  const [dashboardData, setDashboardData] = useState<Array<object> | null>(
    null,
  );
  const [isFetchingActivityData, setIsFetchingActivityData] = useState(true);

  return <></>;
}

export default function WelcomePage({ user }: WelcomeProps) {
  const hasUserId = user?.userId != null;

  useEffect(() => {}, []);

  return hasUserId ? <Welcome /> : null;
}
