// Lightweight session flag, separate from the persisted profile.
// Logging out ends the session but keeps profile, history, and analytics.

const KEY = "askteacha.session";

export function startSession() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, "1");
}

export function endSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function isSessionActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}
