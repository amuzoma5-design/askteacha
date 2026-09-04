import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Clock,
  Loader2,
  MonitorPlay,
  NotebookPen,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { apiUrl } from "@/lib/api-base";
import { getProfile } from "@/lib/profile";
import { useAccount } from "@/hooks/useAccount";
import { addToNotebook } from "@/lib/notebook";
import { newId } from "@/lib/history";

export const Route = createFileRoute("/cbt")({
  head: () => ({
    meta: [
      { title: "JAMB CBT Simulator — AskTeacha" },
      {
        name: "description",
        content:
          "Practice JAMB UTME under real CBT conditions: timed multiple-choice questions, instant scoring and explanations.",
      },
      { property: "og:title", content: "JAMB CBT Simulator — AskTeacha" },
      {
        property: "og:description",
        content: "Timed JAMB CBT practice with instant scoring and AI explanations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CbtSimulator,
});

const SUBJECTS = [
  "Use of English",
  "Mathematics",
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

const LENGTHS = [10, 15, 20];
const LETTERS = ["A", "B", "C", "D"];

interface CbtQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

type Stage = "setup" | "exam" | "result";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function CbtSimulator() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("setup");
  const [subject, setSubject] = useState(SUBJECTS[1]);
  const [count, setCount] = useState(10);
  const [minutesPerQ, setMinutesPerQ] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<CbtQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (loadingSession) return;
    if (!session) navigate({ to: "/auth", replace: true });
  }, [navigate, session, loadingSession]);

  useEffect(() => {
    if (stage !== "exam") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          if (!submittedRef.current) {
            submittedRef.current = true;
            setStage("result");
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [stage]);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/public/cbt"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not start the exam.");
        return;
      }
      const qs = (data.questions as CbtQuestion[]).slice(0, count);
      setQuestions(qs);
      setAnswers(qs.map(() => null));
      setCurrent(0);
      setSecondsLeft(qs.length * minutesPerQ * 60);
      submittedRef.current = false;
      setStage("exam");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const score = useMemo(
    () => answers.reduce<number>((n, a, i) => (a === questions[i]?.correctIndex ? n + 1 : n), 0),
    [answers, questions],
  );

  const answeredCount = answers.filter((a) => a !== null).length;

  return (
    <div className="min-h-screen bg-background pb-16">
      <AppHeader />
      <main className="mx-auto w-full max-w-md px-4 py-5">
        <Link
          to="/home"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>

        {stage === "setup" && (
          <>
            <div className="mb-5 flex items-start gap-3">
              <span className="rounded-xl bg-primary/15 p-2 text-primary">
                <MonitorPlay className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold leading-tight">JAMB CBT Simulator</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Real CBT feel: one question at a time, a countdown clock, then your score with
                  explanations.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border/60">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Subject
                </span>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Number of questions
                </span>
                <div className="flex gap-2">
                  {LENGTHS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        count === n
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Time per question
                </span>
                <div className="flex gap-2">
                  {[1, 2].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMinutesPerQ(m)}
                      className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        minutesPerQ === m
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Total exam time: {count * minutesPerQ} minutes
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button
                onClick={start}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting your questions…
                  </>
                ) : (
                  <>
                    <MonitorPlay className="h-4 w-4" />
                    Start exam
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {stage === "exam" && questions[current] && (
          <>
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-card p-3 ring-1 ring-border/60">
              <span className="text-xs font-semibold text-muted-foreground">
                {subject} · Q{current + 1}/{questions.length}
              </span>
              <span
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  secondsLeft < 60
                    ? "bg-destructive/15 text-destructive"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {fmt(secondsLeft)}
              </span>
            </div>

            <div className="mb-3 grid grid-cols-8 gap-1.5">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-lg py-1.5 text-[11px] font-bold transition ${
                    i === current
                      ? "bg-primary text-primary-foreground"
                      : answers[i] !== null
                        ? "bg-accent/25 text-foreground"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-card p-4 ring-1 ring-border/60">
              <p className="text-base font-medium leading-relaxed text-foreground">
                {questions[current].question}
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {questions[current].options.map((opt, i) => {
                  const selected = answers[current] === i;
                  return (
                    <button
                      key={i}
                      onClick={() =>
                        setAnswers((prev) => prev.map((a, idx) => (idx === current ? i : a)))
                      }
                      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        selected
                          ? "border-primary bg-primary/10 font-semibold text-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {LETTERS[i]}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="flex-1 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground disabled:opacity-50"
              >
                Previous
              </button>
              {current < questions.length - 1 ? (
                <button
                  onClick={() => setCurrent((c) => c + 1)}
                  className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => {
                    submittedRef.current = true;
                    setStage("result");
                  }}
                  className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Submit
                </button>
              )}
            </div>

            <button
              onClick={() => {
                submittedRef.current = true;
                setStage("result");
              }}
              className="mt-3 w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Submit now ({answeredCount}/{questions.length} answered)
            </button>
          </>
        )}

        {stage === "result" && (
          <Result
            subject={subject}
            questions={questions}
            answers={answers}
            score={score}
            onRetry={() => {
              setStage("setup");
              setQuestions([]);
              setAnswers([]);
            }}
          />
        )}
      </main>
    </div>
  );
}

function Result({
  subject,
  questions,
  answers,
  score,
  onRetry,
}: {
  subject: string;
  questions: CbtQuestion[];
  answers: (number | null)[];
  score: number;
  onRetry: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const percent = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const wrong = questions.filter((q, i) => answers[i] !== q.correctIndex);

  const saveWrong = () => {
    for (const q of wrong) {
      addToNotebook({
        id: newId(),
        question: q.question,
        subject,
        finalAnswer: `${LETTERS[q.correctIndex]}. ${q.options[q.correctIndex]}`,
        keyMistake: q.explanation,
        addedAt: Date.now(),
      });
    }
    setSaved(true);
  };

  return (
    <>
      <div className="rounded-2xl bg-card p-5 text-center ring-1 ring-border/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {subject} · CBT result
        </p>
        <p className="mt-2 text-4xl font-bold text-primary">
          {score}
          <span className="text-xl text-muted-foreground">/{questions.length}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {percent}% —{" "}
          {percent >= 70
            ? "Excellent! Keep this pace."
            : percent >= 50
              ? "Fair. Revise your weak topics."
              : "Needs work. Study the explanations below."}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onRetry}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            New exam
          </button>
          {wrong.length > 0 && (
            <button
              onClick={saveWrong}
              disabled={saved}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
            >
              <NotebookPen className="h-4 w-4" />
              {saved ? "Saved" : "Save mistakes"}
            </button>
          )}
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {questions.map((q, i) => {
          const correct = answers[i] === q.correctIndex;
          return (
            <li key={i} className="rounded-2xl bg-card p-4 ring-1 ring-border/60">
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 rounded-full p-1 ${
                    correct ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                  }`}
                >
                  {correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </span>
                <p className="flex-1 text-sm font-medium text-foreground">
                  {i + 1}. {q.question}
                </p>
              </div>
              <p className="mt-2 text-sm text-foreground">
                <span className="font-semibold text-primary">Correct:</span>{" "}
                {LETTERS[q.correctIndex]}. {q.options[q.correctIndex]}
              </p>
              {!correct && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Your answer:{" "}
                  {answers[i] === null
                    ? "Not answered"
                    : `${LETTERS[answers[i] as number]}. ${q.options[answers[i] as number]}`}
                </p>
              )}
              {q.explanation && (
                <p className="mt-2 rounded-xl bg-secondary/60 p-3 text-sm text-foreground">
                  {q.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
