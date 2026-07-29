import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BookMarked, Loader2, Sparkles, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { apiUrl } from "@/lib/api-base";
import { getProfile } from "@/lib/profile";
import { isSessionActive } from "@/lib/session";

export const Route = createFileRoute("/past-questions")({
  head: () => ({
    meta: [
      { title: "Past Questions — AskTeacha" },
      {
        name: "description",
        content: "Practice WAEC, NECO and JAMB past-style questions with step-by-step AI solutions.",
      },
    ],
  }),
  component: PastQuestions,
});

const EXAMS = ["WAEC", "NECO", "JAMB"] as const;
const SUBJECTS = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Government",
  "Literature-in-English",
  "Agricultural Science",
  "Geography",
  "Commerce",
  "Accounting",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "History",
];
const YEARS = ["Any", "2024", "2023", "2022", "2021", "2020", "2019", "2018"];

type Exam = (typeof EXAMS)[number];

function PastQuestions() {
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam>("WAEC");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [year, setYear] = useState("Any");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);

  useEffect(() => {
    if (!getProfile()) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (!isSessionActive()) {
      navigate({ to: "/welcome", replace: true });
    }
  }, [navigate]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    setQuestions([]);
    try {
      const res = await fetch(apiUrl("/api/public/past-questions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examType: exam,
          subject,
          year: year === "Any" ? "" : year,
          count: 6,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not load questions.");
      } else {
        setQuestions(data.questions ?? []);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const solve = (q: string) => {
    sessionStorage.setItem(
      "askteacha.pending",
      JSON.stringify({ question: q }),
    );
    navigate({ to: "/answer" });
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <AppHeader />
      <main className="mx-auto w-full max-w-md px-4 py-5">
        <Link
          to="/home"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-2.5 text-primary">
            <BookMarked className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">Past Question Bank</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              WAEC · NECO · JAMB — tap any question for the full solution.
            </p>
          </div>
        </div>

        <section className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border/60">
          <FilterRow label="Exam">
            {EXAMS.map((e) => (
              <Chip key={e} active={exam === e} onClick={() => setExam(e)}>
                {e}
              </Chip>
            ))}
          </FilterRow>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <FilterRow label="Year" className="mt-3">
            {YEARS.map((y) => (
              <Chip key={y} active={year === y} onClick={() => setYear(y)}>
                {y}
              </Chip>
            ))}
          </FilterRow>

          <button
            onClick={generate}
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating questions…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {questions.length ? "Generate new set" : "Load past questions"}
              </>
            )}
          </button>
        </section>

        {error && (
          <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}

        {questions.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-semibold">
              {exam} · {subject}
              {year !== "Any" ? ` · ${year}` : ""}
            </h2>
            <ul className="flex flex-col gap-2">
              {questions.map((q, i) => (
                <li key={`${i}-${q.slice(0, 20)}`}>
                  <button
                    onClick={() => solve(q)}
                    className="flex w-full items-start gap-3 rounded-2xl bg-card p-3 text-left ring-1 ring-border/60 transition hover:ring-primary/40"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-foreground">{q}</span>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Tap any question to see the full step-by-step solution.
            </p>
          </section>
        )}

        {!questions.length && !loading && !error && (
          <p className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
            Pick an exam, subject and year, then tap <b>Load past questions</b>.
          </p>
        )}
      </main>
    </div>
  );
}

function FilterRow({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="-mx-1 flex flex-wrap gap-1.5 px-1">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}
