import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  ListChecks,
  AlertTriangle,
  Loader2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getProfile } from "@/lib/profile";
import { logQuestion } from "@/lib/analytics";
import { apiUrl } from "@/lib/api-base";
import {
  addHistory,
  getHistoryItem,
  newId,
  updateHistory,
  type AnswerStructured,
  type Feedback,
  type HistoryItem,
} from "@/lib/history";

export const Route = createFileRoute("/answer")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Answer — AskTeacha" },
      { name: "description", content: "Step-by-step answer from your AI teacher." },
    ],
  }),
  component: Answer,
});

interface PendingPayload {
  question: string;
  imageDataUrl?: string;
}

const LOADING_MESSAGES = [
  "Reviewing your question...",
  "Finding the best explanation...",
  "Preparing a step-by-step answer...",
  "Almost ready...",
];

function Answer() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [item, setItem] = useState<HistoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (id) {
      const existing = getHistoryItem(id);
      if (existing) {
        setItem(existing);
        return;
      }
    }
    const raw = sessionStorage.getItem("askteacha.pending");
    if (!raw) {
      navigate({ to: "/home", replace: true });
      return;
    }
    sessionStorage.removeItem("askteacha.pending");
    const payload = JSON.parse(raw) as PendingPayload;
    void runAsk(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runAsk = async (payload: PendingPayload) => {
    setLoading(true);
    setError(null);
    try {
      const profile = getProfile();
      const res = await fetch(apiUrl("/api/public/ask"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: payload.question,
          imageDataUrl: payload.imageDataUrl,
          profile,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not get an answer right now.");
      }
      const answer = (await res.json()) as AnswerStructured;
      const built: HistoryItem = {
        id: newId(),
        question: payload.question || "Image question",
        hasImage: Boolean(payload.imageDataUrl),
        subject: answer.subject || "General",
        createdAt: Date.now(),
        answer,
      };
      addHistory(built);
      setItem(built);
      void logQuestion({
        userId: profile?.userId || "",
        name: profile?.fullName || "",
        classLevel: profile?.classLevel || "",
        question: built.question,
        subject: built.subject,
      });
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

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
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
          {item?.subject || (loading ? "Thinking…" : "Answer")}
        </span>
        <div className="w-9" />
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-5">
        {loading && <ThinkingState />}

        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
            <div className="mt-3">
              <Link
                to="/home"
                className="inline-block rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                Try again
              </Link>
            </div>
          </div>
        )}

        {item && (
          <article className="flex flex-col gap-4">
            <section className="rounded-2xl bg-secondary/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Your question
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{item.question}</p>
            </section>

            <Card icon={<CheckCircle2 className="h-5 w-5 text-success" />} title="Final Answer">
              <p className="text-base font-semibold text-foreground">{item.answer.finalAnswer}</p>
            </Card>

            <Card icon={<BookOpen className="h-5 w-5 text-info" />} title="Simple Explanation">
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {item.answer.explanation}
              </p>
            </Card>

            <Card
              icon={<ListChecks className="h-5 w-5 text-primary" />}
              title="Exam Method (WAEC / JAMB style)"
            >
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-foreground">
                {item.answer.examMethod.map((s, i) => (
                  <li key={i} className="leading-relaxed">
                    {s}
                  </li>
                ))}
              </ol>
            </Card>

            <Card
              icon={<AlertTriangle className="h-5 w-5 text-warning" />}
              title="Common Mistakes"
            >
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-foreground">
                {item.answer.commonMistakes.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </Card>

            <section className="rounded-2xl bg-card p-4 ring-1 ring-border/60">
              <h3 className="mb-3 text-sm font-bold">Try These Yourself</h3>
              <div className="flex flex-col gap-2">
                {item.answer.practice.map((p, i) => (
                  <PracticeItem key={i} q={p.question} a={p.answer} />
                ))}
              </div>
            </section>

            <FeedbackBar
              item={item}
              onChange={(fb) => setItem({ ...item, feedback: fb })}
            />

            <Link
              to="/home"
              className="mt-2 block rounded-xl bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground shadow"
            >
              Ask Another Question
            </Link>
          </article>
        )}
      </main>
    </div>
  );
}

function ThinkingState() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % LOADING_MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl bg-card p-10 ring-1 ring-border/60">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <span className="relative text-3xl">🧠</span>
      </div>
      <p className="text-center text-base font-semibold text-foreground">
        AskTeacha is thinking...
      </p>
      <p
        key={idx}
        className="animate-in fade-in text-center text-sm text-muted-foreground"
      >
        {LOADING_MESSAGES[idx]}
      </p>
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
    </div>
  );
}

function FeedbackBar({
  item,
  onChange,
}: {
  item: HistoryItem;
  onChange: (fb: Feedback) => void;
}) {
  const [submitting, setSubmitting] = useState<Feedback | null>(null);
  const current = item.feedback;

  const send = async (fb: Feedback) => {
    if (current || submitting) return;
    setSubmitting(fb);
    const profile = getProfile();
    updateHistory(item.id, { feedback: fb });
    onChange(fb);
    try {
      await fetch(apiUrl("/api/public/log-feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          userId: profile?.userId || "",
          name: profile?.fullName || "",
          classLevel: profile?.classLevel || "",
          question: item.question,
          feedback: fb,
        }),
      });
    } catch {
      // best effort
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-border/60">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Was this answer helpful?
      </p>
      {current ? (
        <p className="text-sm text-foreground">
          {current === "helpful"
            ? "👍 Thanks for the feedback!"
            : "👎 Got it — we'll keep improving."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => send("helpful")}
            disabled={Boolean(submitting)}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
          >
            <ThumbsUp className="h-4 w-4" /> Helpful
          </button>
          <button
            onClick={() => send("not_helpful")}
            disabled={Boolean(submitting)}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground transition hover:border-destructive hover:text-destructive disabled:opacity-60"
          >
            <ThumbsDown className="h-4 w-4" /> Not Helpful
          </button>
        </div>
      )}
    </section>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-border/60">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PracticeItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-sm font-medium text-foreground">{q}</p>
      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-2 text-xs font-semibold text-primary hover:underline"
      >
        {open ? "Hide Answer" : "Show Answer"}
      </button>
      {open && (
        <p className="mt-2 rounded-lg bg-secondary/60 p-2 text-sm text-foreground">{a}</p>
      )}
    </div>
  );
}
