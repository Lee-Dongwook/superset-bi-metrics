import { useEffect } from "react";

interface WelcomeProps {
  user: any;
  addDangerToast: (arg0: string) => void;
}

function Welcome() {
  return <></>;
}

export default function WelcomePage({ user }: WelcomeProps) {
  const hasUserId = user?.userId != null;

  useEffect(() => {}, []);

  return hasUserId ? <Welcome /> : null;
}
