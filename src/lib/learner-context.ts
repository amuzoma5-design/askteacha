// Builds the "what the tutor knows about this student" snapshot that is sent
// with every AI request so answers feel personal instead of generic.

import { getHistory } from "@/lib/history";
import { getNotebook } from "@/lib/notebook";
import { daysUntilExam, getProfile, type Profile } from "@/lib/profile";

export interface LearnerContext {
  fullName: string;
  firstName: string;
  userId: string;
  classLevel: string;
  examType: string;
  subjects: string[];
  strongSubjects: string[];
  weakSubjects: string[];
  careerGoal: string;
  targetScore: string;
  learningStyle: string;
  notes: string;
  daysToExam: number | null;
  questionsAsked: number;
  favouriteSubjects: string[];
  strugglingTopics: { subject: string; mistake: string }[];
  recentQuestions: string[];
}

export function buildLearnerContext(p?: Profile | null): LearnerContext | null {
  const profile = p ?? getProfile();
  if (!profile) return null;

  const history = getHistory();
  const notebook = getNotebook();

  const tally: Record<string, number> = {};
  for (const h of history) tally[h.subject] = (tally[h.subject] || 0) + 1;
  const favouriteSubjects = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([s]) => s);

  return {
    fullName: profile.fullName,
    firstName: profile.fullName.split(" ")[0] || profile.fullName,
    userId: profile.userId,
    classLevel: profile.classLevel,
    examType: profile.examType,
    subjects: profile.subjects ?? [],
    strongSubjects: profile.strongSubjects ?? [],
    weakSubjects: profile.weakSubjects ?? [],
    careerGoal: profile.careerGoal ?? "",
    targetScore: profile.targetScore ?? "",
    learningStyle: profile.learningStyle ?? "",
    notes: profile.notes ?? "",
    daysToExam: daysUntilExam(profile),
    questionsAsked: history.length,
    favouriteSubjects,
    strugglingTopics: notebook.slice(0, 8).map((n) => ({
      subject: n.subject,
      mistake: n.keyMistake || n.question,
    })),
    recentQuestions: history.slice(0, 6).map((h) => h.question),
  };
}
