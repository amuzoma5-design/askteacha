import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — AskTeacha" },
      {
        name: "description",
        content: "Create your AskTeacha account to start learning for WAEC, NECO and JAMB.",
      },
    ],
  }),
  component: Onboarding,
});

/** The old local setup screen is replaced by real accounts on /auth. */
function Onboarding() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/auth", replace: true });
  }, [navigate]);
  return null;
}
