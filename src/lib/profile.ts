export type ClassLevel = "SS1" | "SS2" | "SS3" | "JAMB Candidate";
export type ExamType = "WAEC" | "NECO" | "JAMB" | "General Study";

export interface Profile {
  userId: string;
  fullName: string;
  classLevel: ClassLevel;
  examType: ExamType;
  /** Subjects the student is registering for / studying. */
  subjects?: string[];
  /** Subjects they feel strong in. */
  strongSubjects?: string[];
  /** Subjects they struggle with. */
  weakSubjects?: string[];
  /** Course / career they want to study, e.g. "Medicine". */
  careerGoal?: string;
  /** Target exam score, e.g. "300+ in JAMB". */
  targetScore?: string;
  /** Exam date as YYYY-MM-DD. */
  examDate?: string;
  /** How they like to be taught. */
  learningStyle?: LearningStyle;
  /** Anything else the tutor should know. */
  notes?: string;
}

export type LearningStyle =
  | "Step-by-step worked examples"
  | "Short and straight to the point"
  | "Lots of practice questions"
  | "Real-life examples and stories";

export const LEARNING_STYLES: LearningStyle[] = [
  "Step-by-step worked examples",
  "Short and straight to the point",
  "Lots of practice questions",
  "Real-life examples and stories",
];

export const SUBJECT_OPTIONS = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Further Mathematics",
  "Economics",
  "Government",
  "Literature-in-English",
  "Geography",
  "Agricultural Science",
  "Commerce",
  "Accounting",
  "CRS/IRS",
  "Civic Education",
  "Computer Studies",
];

const KEY = "askteacha.profile";
const COUNTER_KEY = "askteacha.userIdCounter";
const START_ID = 1001;

export function getProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    // Backfill userId for profiles created before this field existed.
    if (!p.userId) {
      p.userId = generateUserId();
      localStorage.setItem(KEY, JSON.stringify(p));
    }
    return p;
  } catch {
    return null;
  }
}

export function generateUserId(): string {
  let next = START_ID;
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    if (!Number.isNaN(parsed) && parsed >= START_ID) {
      next = parsed + 1;
    }
    localStorage.setItem(COUNTER_KEY, String(next));
  } catch {
    // ignore storage errors; still return a valid-looking id
  }
  return `AT-${next}`;
}

export function saveProfile(p: Omit<Profile, "userId"> & { userId?: string }) {
  const existing = getProfile();
  const userId = p.userId || existing?.userId || generateUserId();
  const full: Profile = { ...existing, ...p, userId };
  localStorage.setItem(KEY, JSON.stringify(full));
  return full;
}

/** Merge a partial update into the stored profile. */
export function updateProfile(patch: Partial<Profile>): Profile | null {
  const existing = getProfile();
  if (!existing) return null;
  const full: Profile = { ...existing, ...patch };
  localStorage.setItem(KEY, JSON.stringify(full));
  return full;
}

/** How complete the learning profile is (0-100), used to nudge the student. */
export function profileCompletion(p: Profile | null): number {
  if (!p) return 0;
  const checks = [
    Boolean(p.fullName),
    Boolean(p.classLevel),
    Boolean(p.examType),
    Boolean(p.subjects?.length),
    Boolean(p.strongSubjects?.length),
    Boolean(p.weakSubjects?.length),
    Boolean(p.careerGoal),
    Boolean(p.examDate),
    Boolean(p.learningStyle),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function daysUntilExam(p: Profile | null): number | null {
  if (!p?.examDate) return null;
  const target = new Date(`${p.examDate}T00:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const diff = Math.ceil((target - Date.now()) / 86_400_000);
  return diff;
}

export function clearProfile() {
  // Full reset: wipes the stored profile. Counter is preserved so a new
  // profile created afterwards still receives a fresh, non-colliding ID.
  localStorage.removeItem(KEY);
}
