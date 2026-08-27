import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { GraduationCap, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { TRIAL_DAYS } from "@/lib/plans";
import type { ClassLevel, ExamType } from "@/lib/profile";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create your AskTeacha account" },
      {
        name: "description",
        content:
          "Create a free AskTeacha account and start a 14-day full-access trial for WAEC, NECO and JAMB preparation.",
      },
      { property: "og:title", content: "Sign in or create your AskTeacha account" },
      {
        property: "og:description",
        content: "Start your 14-day full-access AskTeacha trial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const CLASSES: ClassLevel[] = ["SS1", "SS2", "SS3", "JAMB Candidate"];
const EXAMS: ExamType[] = ["WAEC", "NECO", "JAMB", "General Study"];

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [fullName, setFullName] = useState("");
  const [classLevel, setClassLevel] = useState<ClassLevel>("SS3");
  const [examType, setExamType] = useState<ExamType>("WAEC");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/home", replace: true });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName.trim(),
              class_level: classLevel,
              exam_type: examType,
            },
          },
        });
        if (err) throw err;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      }
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setError("Could not sign in with Google. Please try again.");
      return;
    }
  };

  if (checkEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-md rounded-3xl bg-card p-6 text-center shadow-sm ring-1 ring-border/60">
          <h1 className="text-xl font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to <strong>{email}</strong>. Open it to activate
            your account and start your {TRIAL_DAYS}-day free trial.
          </p>
          <button
            onClick={() => {
              setCheckEmail(false);
              setMode("signin");
            }}
            className="mt-5 w-full rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="text-center">
          <Link to="/" className="inline-flex flex-col items-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <GraduationCap className="h-8 w-8" />
            </span>
            <span className="text-3xl font-bold tracking-tight">
              Ask<span className="text-primary">Teacha</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? `Create your account and get ${TRIAL_DAYS} days of full access, free.`
              : "Welcome back. Sign in to continue learning."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
          {(["signup", "signin"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === m
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {m === "signup" ? "Create account" : "Sign in"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 rounded-3xl bg-card p-6 shadow-sm">
          {mode === "signup" && (
            <>
              <Field label="Full Name">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  maxLength={80}
                  placeholder="e.g. Chinedu Okafor"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
                />
              </Field>
              <Field label="Class">
                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value as ClassLevel)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
                >
                  {CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Exam Type">
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value as ExamType)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
                >
                  {EXAMS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </>
          )}

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="At least 6 characters"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
            />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-base font-semibold text-primary-foreground shadow transition hover:opacity-95 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signup" ? `Start ${TRIAL_DAYS}-day free trial` : "Sign in"}
          </button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={google}
            className="w-full rounded-xl border border-input bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
