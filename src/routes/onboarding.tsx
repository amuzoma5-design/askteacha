import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { useState } from "react";
import {
  saveProfile,
  type ClassLevel,
  type ExamType,
} from "@/lib/profile";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — AskTeacha" },
      { name: "description", content: "Set up your AskTeacha profile to start learning." },
    ],
  }),
  component: Onboarding,
});

const CLASSES: ClassLevel[] = ["SS1", "SS2", "SS3", "JAMB Candidate"];
const EXAMS: ExamType[] = ["WAEC", "NECO", "JAMB", "General Study"];

function Onboarding() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [classLevel, setClassLevel] = useState<ClassLevel>("SS3");
  const [examType, setExamType] = useState<ExamType>("WAEC");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = fullName.trim();
    if (!name) return;
    saveProfile({ fullName: name.slice(0, 80), classLevel, examType });
    navigate({ to: "/home" });
  };

  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Ask<span className="text-primary">Teacha</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your AI Teacher for WAEC, NECO &amp; JAMB
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 rounded-3xl bg-card p-6 shadow-sm">
          <Field label="Full Name">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={80}
              placeholder="e.g. Chinedu Okafor"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
          </Field>

          <Field label="Class">
            <select
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value as ClassLevel)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
            >
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
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
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-primary px-5 py-4 text-base font-semibold text-primary-foreground shadow transition hover:opacity-95"
          >
            Start Learning
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
