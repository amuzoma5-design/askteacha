import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LogOut, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clearProfile, getProfile, type Profile } from "@/lib/profile";
import { clearHistory, getHistory } from "@/lib/history";
import { endSession } from "@/lib/session";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — AskTeacha" },
      { name: "description", content: "Your AskTeacha profile and usage." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [count, setCount] = useState(0);
  const [topSubject, setTopSubject] = useState("—");

  const load = () => {
    const p = getProfile();
    if (!p) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    setProfile(p);
    const h = getHistory();
    setCount(h.length);
    const tally: Record<string, number> = {};
    for (const item of h) tally[item.subject] = (tally[item.subject] || 0) + 1;
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    setTopSubject(top ? top[0] : "—");
  };

  useEffect(load, [navigate]);

  const stats = useMemo(
    () => [
      { label: "Questions asked", value: String(count) },
      { label: "Top subject", value: topSubject },
    ],
    [count, topSubject],
  );

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
        <Link
          to="/home"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-semibold">Profile</span>
        <div className="w-9" />
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-5">
        <section className="rounded-3xl bg-card p-5 ring-1 ring-border/60">
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
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-card p-4 text-center ring-1 ring-border/60"
            >
              <p className="text-xl font-bold text-primary">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => {
              if (confirm("Clear all your asked questions?")) {
                clearHistory();
                load();
              }
            }}
            className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-sm font-medium ring-1 ring-border/60 hover:bg-muted"
          >
            <span className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-warning" />
              Clear history
            </span>
            <span className="text-xs text-muted-foreground">{count} items</span>
          </button>

          <button
            onClick={() => {
              endSession();
              navigate({ to: "/welcome", replace: true });
            }}
            className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-sm font-medium ring-1 ring-border/60 hover:bg-muted"
          >
            <span className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-primary" />
              Log out
            </span>
            <span className="text-xs text-muted-foreground">
              Keeps your profile
            </span>
          </button>

          <button
            onClick={() => setConfirmReset(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-sm font-medium text-destructive ring-1 ring-border/60 hover:bg-destructive/10"
          >
            <span className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset profile
            </span>
            <span className="text-xs text-muted-foreground">
              Deletes everything
            </span>
          </button>
        </section>
      </main>

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
                onClick={() => {
                  clearProfile();
                  clearHistory();
                  endSession();
                  navigate({ to: "/onboarding", replace: true });
                }}
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
