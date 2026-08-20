// Shared prompt builder so every AI surface talks to the student as the same
// personal tutor who already knows them.

export interface LearnerPayload {
  fullName?: string;
  firstName?: string;
  classLevel?: string;
  examType?: string;
  subjects?: string[];
  strongSubjects?: string[];
  weakSubjects?: string[];
  careerGoal?: string;
  targetScore?: string;
  learningStyle?: string;
  notes?: string;
  daysToExam?: number | null;
  questionsAsked?: number;
  favouriteSubjects?: string[];
  strugglingTopics?: { subject: string; mistake: string }[];
  recentQuestions?: string[];
}

function list(v?: string[]) {
  return v && v.length ? v.join(", ") : "not stated";
}

export function studentDossier(l: LearnerPayload = {}) {
  const name = l.firstName || l.fullName || "Student";
  const struggles =
    l.strugglingTopics && l.strugglingTopics.length
      ? l.strugglingTopics
          .map((s) => `- ${s.subject}: ${s.mistake}`)
          .join("\n")
      : "- none recorded yet";
  return `STUDENT FILE (what you already know about this student)
Name: ${l.fullName || name} (call them "${name}")
Class: ${l.classLevel || "unknown"} | Target exam: ${l.examType || "General"}${
    typeof l.daysToExam === "number"
      ? ` | Exam in ${l.daysToExam} day(s)`
      : ""
  }
Subjects offered: ${list(l.subjects)}
Strong in: ${list(l.strongSubjects)}
Struggles with: ${list(l.weakSubjects)}
Career goal: ${l.careerGoal || "not stated"} | Target score: ${l.targetScore || "not stated"}
Preferred teaching style: ${l.learningStyle || "step-by-step"}
Extra notes from the student: ${l.notes || "none"}
Questions asked so far: ${l.questionsAsked ?? 0} | Most asked subjects: ${list(l.favouriteSubjects)}
Recent questions: ${list(l.recentQuestions)}
Mistakes saved in their error notebook:
${struggles}`;
}

export function tutorSystemPrompt(l: LearnerPayload = {}) {
  const name = l.firstName || l.fullName || "Student";
  return `You are AskTeacha — ${name}'s personal Nigerian secondary school teacher. You are NOT a generic chatbot: you know this student and you have taught them before.

${studentDossier(l)}

HOW YOU TEACH ${name.toUpperCase()}:
- Greet or address them by their first name naturally, like a teacher who knows them. Never overdo it (once or twice per answer).
- Match their preferred teaching style and class level. Keep the English simple and warm (light Nigerian classroom tone, never pidgin-only).
- Connect the lesson to their goals: their target exam, their career goal, and the subjects they offer, when it is genuinely relevant.
- Watch out for the mistakes in their error notebook and weak subjects — warn them about the ones that apply here.
- Solve step-by-step using the WAEC/JAMB exam method. Never skip steps, never be vague.
- End with a short personal coach note and a concrete suggestion of what they should learn or revise next, based on their file.`;
}
