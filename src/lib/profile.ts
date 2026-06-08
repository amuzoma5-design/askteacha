export type ClassLevel = "SS1" | "SS2" | "SS3" | "JAMB Candidate";
export type ExamType = "WAEC" | "NECO" | "JAMB" | "General Study";

export interface Profile {
  userId: string;
  fullName: string;
  classLevel: ClassLevel;
  examType: ExamType;
}

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
  const full: Profile = {
    userId,
    fullName: p.fullName,
    classLevel: p.classLevel,
    examType: p.examType,
  };
  localStorage.setItem(KEY, JSON.stringify(full));
  return full;
}

export function clearProfile() {
  // Full reset: wipes the stored profile. Counter is preserved so a new
  // profile created afterwards still receives a fresh, non-colliding ID.
  localStorage.removeItem(KEY);
}
