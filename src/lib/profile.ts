export type ClassLevel = "SS1" | "SS2" | "SS3" | "JAMB Candidate";
export type ExamType = "WAEC" | "NECO" | "JAMB" | "General Study";

export interface Profile {
  fullName: string;
  classLevel: ClassLevel;
  examType: ExamType;
}

const KEY = "askteacha.profile";

export function getProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearProfile() {
  localStorage.removeItem(KEY);
}
