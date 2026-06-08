import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GraduationCap, LogIn, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { clearProfile, getProfile, type Profile } from "@/lib/profile";
import { clearHistory } from "@/lib/history";
import { endSession, isSessionActive, startSession } from "@/lib/session";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome back — AskTeacha" },
      { name: "description", content: "Continue your AskTeacha session." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (isSessionActive()) {
      navigate({ to: "/home", replace: true });
      return;
    }
    setProfile(p);
  }, [navigate]);

  if (!profile) return null;

  const handleContinue = () => {
    startSession();
    navigate({ to: "/home", replace: true });
  };

  const handleReset = () => {
    clearProfile();
    clearHistory();
    endSession();
    navigate({ to: "/onboarding", replace: true });
  };

  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Continue learning where you left off.
          </p>
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-border/60">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
              {profile.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-semibold">{profile.fullName}</p>
              <p className="text-xs text-muted-foreground">
                {profile.classLevel} • {profile.examType}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                ID: {profile.userId}
              </p>
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-base font-semibold text-primary-foreground shadow transition hover:opacity-95"
          >
            <LogIn className="h-4 w-4" />
            Continue as {profile.fullName.split(" ")[0]}
          </button>

          <button
            onClick={() => setConfirmReset(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-3 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
            Reset profile
          </button>
        </div>
      </div>

      {confirmReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl">
            <h2 className="text-base font-semibold">Reset profile?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure? This will permanently remove your profile and
              learning history.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={handleReset}
                className="w-full rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground transition hover:opacity-90"
              >
                Yes, reset everything
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="w-full rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground transition hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
