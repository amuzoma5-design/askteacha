import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import {
  LEARNING_STYLES,
  SUBJECT_OPTIONS,
  getProfile,
  profileCompletion,
  updateProfile,
  type LearningStyle,
  type Profile,
} from "@/lib/profile";

export const Route = createFileRoute("/learning-profile")({
  head: () => ({
    meta: [
      { title: "Your learning profile — AskTeacha" },
      {
        name: "description",
        content:
          "Tell AskTeacha your subjects, strengths, weak areas and goals so every answer is personal to you.",
      },
      { property: "og:title", content: "Your learning profile — AskTeacha" },
      {
        property: "og:description",
        content: "Personalise your AI tutor with your subjects, goals and weak areas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LearningProfile,
});

function LearningProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    setProfile(p);
  }, [navigate]);

  if (!profile) return null;

  const set = (patch: Partial<Profile>) => {
    setProfile({ ...profile, ...patch });
    setSaved(false);
  };

  const toggle = (key: "subjects" | "strongSubjects" | "weakSubjects", value: string) => {
    const current = profile[key] ?? [];
    set({
      [key]: current.includes(value)
        ? current.filter((s) => s !== value)
        : [...current, value],
    } as Partial<Profile>);
  };

  const save = () => {
    updateProfile({
      subjects: profile.subjects,
      strongSubjects: profile.strongSubjects,
      weakSubjects: profile.weakSubjects,
      careerGoal: profile.careerGoal?.slice(0, 80),
      targetScore: profile.targetScore?.slice(0, 40),
      examDate: profile.examDate,
      learningStyle: profile.learningStyle,
      notes: profile.notes?.slice(0, 400),
    });
    setSaved(true);
  };

  const completion = profileCompletion(profile);

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
        <Link
          to="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-semibold">Learning profile</span>
        <div className="w-9" />
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-5">
        <section className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-4 ring-1 ring-primary/20">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            The more Teacha knows, the more personal your lessons
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Profile {completion}% complete
          </p>
        </section>

        <Group title="Subjects you offer">
          <Chips
            options={SUBJECT_OPTIONS}
            selected={profile.subjects ?? []}
            onToggle={(v) => toggle("subjects", v)}
          />
        </Group>

        <Group title="You are strong in">
          <Chips
            options={profile.subjects?.length ? profile.subjects : SUBJECT_OPTIONS}
            selected={profile.strongSubjects ?? []}
            onToggle={(v) => toggle("strongSubjects", v)}
            tone="success"
          />
        </Group>

        <Group title="You struggle with">
          <Chips
            options={profile.subjects?.length ? profile.subjects : SUBJECT_OPTIONS}
            selected={profile.weakSubjects ?? []}
            onToggle={(v) => toggle("weakSubjects", v)}
            tone="warning"
          />
        </Group>

        <Group title="What course do you want to study?">
          <input
            value={profile.careerGoal ?? ""}
            onChange={(e) => set({ careerGoal: e.target.value })}
            maxLength={80}
            placeholder="e.g. Medicine, Computer Science, Law"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
          />
        </Group>

        <Group title="Target score">
          <input
            value={profile.targetScore ?? ""}
            onChange={(e) => set({ targetScore: e.target.value })}
            maxLength={40}
            placeholder="e.g. 300+ in JAMB, A1 in Maths"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
          />
        </Group>

        <Group title="Exam date">
          <input
            type="date"
            value={profile.examDate ?? ""}
            onChange={(e) => set({ examDate: e.target.value })}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
          />
        </Group>

        <Group title="How do you like to be taught?">
          <div className="flex flex-col gap-2">
            {LEARNING_STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ learningStyle: s as LearningStyle })}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                  profile.learningStyle === s
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-border bg-background text-foreground hover:border-primary"
                }`}
              >
                {s}
                {profile.learningStyle === s && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </Group>

        <Group title="Anything else Teacha should know?">
          <textarea
            value={profile.notes ?? ""}
            onChange={(e) => set({ notes: e.target.value })}
            rows={3}
            maxLength={400}
            placeholder="e.g. I forget formulas easily, I study at night, English is not my first language"
            className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
          />
        </Group>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          <button
            onClick={save}
            className="w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-95"
          >
            {saved ? "Saved ✓" : "Save profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Chips({
  options,
  selected,
  onToggle,
  tone = "primary",
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  tone?: "primary" | "success" | "warning";
}) {
  const active =
    tone === "success"
      ? "border-success bg-success/10 text-success"
      : tone === "warning"
        ? "border-warning bg-warning/10 text-warning"
        : "border-primary bg-primary/10 text-primary";
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              on ? `${active} font-semibold` : "border-border bg-card text-foreground"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
