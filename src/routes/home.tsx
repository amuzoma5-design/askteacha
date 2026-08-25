import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookMarked,
  Camera,
  ChevronRight,
  Compass,
  Keyboard,
  Loader2,
  Mic,
  NotebookPen,
  RefreshCw,
  Send,
  Sparkles,
  UserCog,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ImageModal } from "@/components/ImageModal";
import { VoiceSheet } from "@/components/VoiceSheet";
import { daysUntilExam, getProfile, profileCompletion, type Profile } from "@/lib/profile";
import { buildLearnerContext } from "@/lib/learner-context";
import { apiUrl } from "@/lib/api-base";
import { isSessionActive } from "@/lib/session";
import { getHistory, type HistoryItem } from "@/lib/history";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Ask a question — AskTeacha" },
      { name: "description", content: "Ask your AI teacher anything for WAEC, NECO or JAMB." },
    ],
  }),
  component: Home,
});

const SUGGESTIONS = [
  "Solve: 2x² + 5x - 3 = 0",
  "Explain photosynthesis simply",
  "What is balance of trade?",
  "Differentiate y = 3x² + 2x",
  "Causes of the 1914 amalgamation",
  "What is osmosis?",
];

function Home() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

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
    setProfile(p);
    setHistory(getHistory());
  }, [navigate]);

  const firstName = profile?.fullName.split(" ")[0] ?? "";
  const completion = profileCompletion(profile);
  const days = daysUntilExam(profile);

  const ask = (q: string, imageDataUrl?: string) => {
    const payload = { question: q, imageDataUrl };
    sessionStorage.setItem("askteacha.pending", JSON.stringify(payload));
    navigate({ to: "/answer", search: { id: undefined } });
  };

  const submitText = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    ask(q);
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <AppHeader />
      <main className="mx-auto w-full max-w-md px-4 py-5">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Hi {firstName || "there"} 👋
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-tight">
            What do you want to learn today?
          </h1>
          {typeof days === "number" && days >= 0 && (
            <p className="mt-1 text-xs font-medium text-primary">
              {days === 0
                ? "Your exam is today — you've got this!"
                : `${days} day${days === 1 ? "" : "s"} to your ${profile?.examType} exam`}
            </p>
          )}
        </div>

        {completion < 100 && (
          <Link
            to="/learning-profile"
            className="mb-4 flex items-center gap-3 rounded-2xl bg-accent/10 p-3 ring-1 ring-accent/30"
          >
            <span className="rounded-xl bg-accent/20 p-2 text-accent">
              <UserCog className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-foreground">
                Make Teacha your personal tutor
              </span>
              <span className="block text-xs text-muted-foreground">
                Profile {completion}% complete — add your subjects, weak areas and goal
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}


        <form
          onSubmit={submitText}
          className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border/60"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask your question…"
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded-xl bg-background px-3 py-2 text-base outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ActionBtn
              icon={<Mic className="h-5 w-5" />}
              label="Voice"
              onClick={() => setVoiceOpen(true)}
            />
            <ActionBtn
              icon={<Camera className="h-5 w-5" />}
              label="Upload"
              onClick={() => setImageOpen(true)}
            />
            <ActionBtn
              icon={<Keyboard className="h-5 w-5" />}
              label="Type"
              onClick={() => {
                const el = document.querySelector("textarea");
                (el as HTMLTextAreaElement | null)?.focus();
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow transition disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Ask Teacha
          </button>
        </form>

        <TutorPlan onAsk={ask} />

        <Link
          to="/notebook"
          className="mt-4 flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-border/60 transition hover:ring-warning/40"
        >
          <span className="rounded-xl bg-warning/15 p-2 text-warning">
            <NotebookPen className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-foreground">Error Notebook</span>
            <span className="block text-xs text-muted-foreground">
              Revise the questions you got wrong
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <Link
          to="/cbt"
          className="mt-4 flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-border/60 transition hover:ring-primary/40"
        >
          <span className="rounded-xl bg-primary/15 p-2 text-primary">
            <MonitorPlay className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-foreground">
              JAMB CBT Simulator
            </span>
            <span className="block text-xs text-muted-foreground">
              Timed mock exam with instant score and explanations
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <Link
          to="/past-questions"
          className="mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-3 ring-1 ring-primary/20 transition hover:ring-primary/40"
        >
          <span className="rounded-xl bg-primary/15 p-2 text-primary">
            <BookMarked className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-foreground">Past Question Bank</span>
            <span className="block text-xs text-muted-foreground">
              WAEC · NECO · JAMB — practice with AI solutions
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>


        <section className="mt-7">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            Try one of these
          </h2>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recent questions</h2>
            <Link
              to="/history"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          {history.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
              Your asked questions will appear here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.slice(0, 8).map((h) => (
                <li key={h.id}>
                  <Link
                    to="/answer"
                    search={{ id: h.id }}
                    className="flex items-start justify-between gap-3 rounded-2xl bg-card p-3 ring-1 ring-border/60 transition hover:ring-primary/40"
                  >
                    <span className="line-clamp-2 text-sm font-medium text-foreground">
                      {h.question || "Image question"}
                    </span>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground">
                      {h.subject}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <VoiceSheet
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onResult={(t) => {
          setVoiceOpen(false);
          ask(t);
        }}
      />
      <ImageModal
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        onSolve={(url) => {
          setImageOpen(false);
          ask("", url);
        }}
      />
    </div>
  );
}

interface Guidance {
  greeting: string;
  focusToday: string;
  steps: string[];
  suggestedQuestions: string[];
  careerTip: string;
}

const PLAN_KEY = "askteacha.plan";

function TutorPlan({ onAsk }: { onAsk: (q: string) => void }) {
  const [plan, setPlan] = useState<Guidance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PLAN_KEY);
      if (!raw) return;
      const cached = JSON.parse(raw) as { day: string; plan: Guidance };
      if (cached.day === new Date().toDateString()) setPlan(cached.plan);
    } catch {
      // ignore
    }
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/public/guide"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learner: buildLearnerContext() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not build your plan.");
      setPlan(data as Guidance);
      localStorage.setItem(
        PLAN_KEY,
        JSON.stringify({ day: new Date().toDateString(), plan: data }),
      );
    } catch (e: any) {
      setError(e.message || "Could not build your plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-border/60">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Compass className="h-4 w-4 text-primary" />
          Your plan for today
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {plan ? "Refresh" : "Get plan"}
        </button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!plan && !loading && !error && (
        <p className="text-xs text-muted-foreground">
          Teacha will use your profile, weak areas and saved mistakes to tell you exactly
          what to study today.
        </p>
      )}

      {plan && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">{plan.greeting}</p>
          <div className="rounded-xl bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Focus today
            </p>
            <p className="mt-1 text-sm text-foreground">{plan.focusToday}</p>
          </div>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-foreground">
            {plan.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ask Teacha next
            </p>
            <div className="flex flex-col gap-2">
              {plan.suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => onAsk(q)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-left text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs italic text-muted-foreground">{plan.careerTip}</p>
        </div>
      )}
    </section>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl bg-secondary px-2 py-2 text-xs font-medium text-secondary-foreground transition hover:bg-muted"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </button>
  );
}
