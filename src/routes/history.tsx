import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getProfile } from "@/lib/profile";
import { isSessionActive } from "@/lib/session";
import { clearHistory, getHistory, type HistoryItem } from "@/lib/history";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Learning History — AskTeacha" },
      { name: "description", content: "Review your previous questions and answers." },
    ],
  }),
  component: History,
});

function formatWhen(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function History() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (!isSessionActive()) {
      navigate({ to: "/welcome", replace: true });
      return;
    }
    setItems(getHistory().sort((a, b) => b.createdAt - a.createdAt));
  }, [navigate]);

  const handleClear = () => {
    if (!confirm("Clear all learning history? This cannot be undone.")) return;
    clearHistory();
    setItems([]);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader />
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 pt-4">
        <Link
          to="/home"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-base font-bold">Learning History</h1>
        <button
          onClick={handleClear}
          disabled={items.length === 0}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-40"
          aria-label="Clear history"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-5">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No questions yet. Ask Teacha something to start your learning history.
            </p>
            <Link
              to="/home"
              className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Ask a question
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((h) => (
              <li key={h.id}>
                <Link
                  to="/answer"
                  search={{ id: h.id }}
                  className="flex flex-col gap-2 rounded-2xl bg-card p-3 ring-1 ring-border/60 transition hover:ring-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="line-clamp-2 text-sm font-medium text-foreground">
                      {h.question || "Image question"}
                    </span>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground">
                      {h.subject}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatWhen(h.createdAt)}</span>
                    {h.feedback && (
                      <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 font-semibold">
                        {h.feedback === "helpful" ? "👍 Helpful" : "👎 Not helpful"}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
