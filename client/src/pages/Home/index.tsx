import { useState, useEffect } from "react";
import { getExtensionsRegistry } from "@bi-metrics/core";
import rison from "rison";
import { useIsMobile } from "../../hooks";
import { WelcomeContainer } from "./ui/components";
import { userHasPermission } from "../../dashboard/utils";
import { redirect } from "../../utils";
import { UserWithPermissionsAndRoles } from "../../types";
import withToasts from "../../components/Toast/withToast";

import { WelcomeExtensionInner } from "./WelcomeExtensionInner";
import { WelcomeExtensionInnerItemsConverter } from "./WelcomeExtensionInnerItemsConverter";

interface WelcomeProps {
  user: any;
  addDangerToast: (arg0: string) => void;
}

const extensionsRegistry = getExtensionsRegistry();

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

  const [activeState, setActiveState] = useState<Array<string>>(collapseState);

  const handleCollapse = (state: Array<string>) => {
    setActiveState(state);
    setItem(LocalStorageKeys.HomepageCollapseState, state);
  };

  const WelcomeTopExtension = extensionsRegistry.get("welcome.banner");
  const WelcomeMainExtension = extensionsRegistry.get(
    "welcome.main.replacement",
  );

  const welcomeExtensionInnerItems = WelcomeExtensionInnerItemsConverter();

  return (
    <>
      {SubmenuExtension ? (
        <SubmenuExtension {...menuData} />
      ) : (
        <SubMenu {...menuData} />
      )}
      <WelcomeContainer>
        {(!WelcomeTopExtension || !WelcomeMainExtension) && (
          <WelcomeExtensionInner
            activeState={activeState}
            handleCollapse={handleCollapse}
            items={welcomeExtensionInnerItems}
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
    if (!hasUserId) {
      redirect(RoutePaths.HOME);
    }
  }, [hasUserId]);

  return hasUserId ? <Welcome {...props} user={user} /> : null;
}

export default withToasts(WelcomePage);
