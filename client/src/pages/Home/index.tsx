import { useEffect, useMemo, useState } from "react";

interface WelcomeProps {
  user: any;
  addDangerToast: (arg0: string) => void;
}

interface LoadingProps {
  cover?: boolean;
}

const DEFAULT_TAB_ARR = ["dashboards", "charts"];

function Welcome() {
  return <></>;
}

function WelcomePage({ user, ...props }) {
  const hasUserId = user?.userId != null;

  useEffect(() => {}, []);

  return hasUserId ? <Welcome /> : null;
}
