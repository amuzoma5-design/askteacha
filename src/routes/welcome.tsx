import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAccount } from "@/hooks/useAccount";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome back — AskTeacha" },
      { name: "description", content: "Sign in to continue learning with AskTeacha." },
    ],
  }),
  component: Welcome,
});

/** Sessions now live in the account, so this screen just routes people onward. */
function Welcome() {
  const navigate = useNavigate();
  const { session, loadingSession } = useAccount();

  useEffect(() => {
    if (loadingSession) return;
    navigate({ to: session ? "/home" : "/auth", replace: true });
  }, [navigate, session, loadingSession]);

  return null;
}
