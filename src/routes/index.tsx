import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getProfile } from "@/lib/profile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AskTeacha — Your AI Teacher for WAEC, NECO & JAMB" },
      {
        name: "description",
        content:
          "AskTeacha is a personal AI teacher for Nigerian SS1–SS3 students preparing for WAEC, NECO and JAMB.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    const p = getProfile();
    navigate({ to: p ? "/home" : "/onboarding", replace: true });
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Loading…
    </div>
  );
}
