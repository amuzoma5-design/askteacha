import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BookmarkX, CheckCheck, NotebookPen, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useAccount } from "@/hooks/useAccount";
import {
  clearNotebook,
  getNotebook,
  groupBySubject,
  markReviewed,
  removeFromNotebook,
  type NotebookItem,
} from "@/lib/notebook";

export const Route = createFileRoute("/notebook")({
  head: () => ({
    meta: [
      { title: "Error Notebook — AskTeacha" },
      {
        name: "description",
        content:
          "Revise the questions you got wrong, grouped by subject, with the key mistake to avoid in WAEC, NECO and JAMB.",
      },
      { property: "og:title", content: "Error Notebook — AskTeacha" },
      {
        property: "og:description",
        content: "Your personal list of mistakes to revise before the exam.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notebook,
});

function Notebook() {
  const navigate = useNavigate();
  const { session, loadingSession } = useAccount();
  const [items, setItems] = useState<NotebookItem[]>([]);

  useEffect(() => {
    if (loadingSession) return;
    if (!session) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    setItems(getNotebook());
  }, [navigate, session, loadingSession]);

  const refresh = () => setItems(getNotebook());

  const handleClear = () => {
    if (!confirm("Clear your whole Error Notebook? This cannot be undone.")) return;
    clearNotebook();
    setItems([]);
  };

  const groups = groupBySubject(items);
  const reviewed = items.filter((i) => i.reviewedAt).length;

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
        <h1 className="text-base font-bold">Error Notebook</h1>
        <button
          onClick={handleClear}
          disabled={items.length === 0}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-muted disabled:opacity-40"
          aria-label="Clear notebook"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-5">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <NotebookPen className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing here yet. On any answer, tap “I got this wrong” to save it for revision.
            </p>
            <Link
              to="/home"
              className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Ask a question
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-3 ring-1 ring-primary/20">
              <span className="text-sm font-semibold">
                {items.length} mistake{items.length === 1 ? "" : "s"} saved
              </span>
              <span className="text-xs text-muted-foreground">{reviewed} revised</span>
            </div>

            <div className="flex flex-col gap-6">
              {groups.map(([subject, list]) => (
                <section key={subject}>
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
                    {subject}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                      {list.length}
                    </span>
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {list
                      .sort((a, b) => b.addedAt - a.addedAt)
                      .map((n) => (
                        <li
                          key={n.id}
                          className="rounded-2xl bg-card p-3 ring-1 ring-border/60"
                        >
                          <Link
                            to="/answer"
                            search={{ id: n.id }}
                            className="block text-sm font-medium text-foreground hover:text-primary"
                          >
                            {n.question}
                          </Link>
                          {n.keyMistake && (
                            <p className="mt-1.5 rounded-lg bg-secondary/60 p-2 text-xs text-muted-foreground">
                              ⚠️ {n.keyMistake}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => {
                                markReviewed(n.id);
                                refresh();
                              }}
                              className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-foreground hover:border-primary hover:text-primary"
                            >
                              <CheckCheck className="h-3 w-3" />
                              {n.reviewedAt ? "Revised" : "Mark revised"}
                            </button>
                            <button
                              onClick={() => {
                                removeFromNotebook(n.id);
                                refresh();
                              }}
                              className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:border-destructive hover:text-destructive"
                            >
                              <BookmarkX className="h-3 w-3" />
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
