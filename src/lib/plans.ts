// Central plan + feature configuration for AskTeacha.
//
// Every access decision in the app goes through this file. Nothing else
// should test `plan === "foundation"` directly — use canUse()/limitFor().
// Adding Scholar/Achiever later means adding an entry to PLANS and a row to
// LIMITS; no screen needs to change.

export type Plan = "trial" | "free" | "foundation" | "scholar" | "achiever";

/** Metered features. Trial and Foundation are unlimited on all of them. */
export type Feature = "question" | "cbt" | "past_questions";

export const UNLIMITED = -1;

export interface PlanMeta {
  id: Plan;
  name: string;
  price: number;
  priceLabel: string;
  tagline: string;
  /** Shown on the pricing page / upgrade screens. */
  visible: boolean;
  recommended?: boolean;
}

export const PLANS: Record<Plan, PlanMeta> = {
  trial: {
    id: "trial",
    name: "Free Trial",
    price: 0,
    priceLabel: "14 days",
    tagline: "Full access to Ask Teacha.",
    visible: true,
  },
  free: {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "₦0",
    tagline: "Continue learning with selected access and reasonable usage limits.",
    visible: true,
  },
  foundation: {
    id: "foundation",
    name: "Foundation",
    price: 2000,
    priceLabel: "₦2,000/month",
    tagline: "Full, expanded access to the Ask Teacha learning experience.",
    visible: true,
    recommended: true,
  },
  // Reserved for later. Not sold, not displayed.
  scholar: {
    id: "scholar",
    name: "Scholar",
    price: 0,
    priceLabel: "",
    tagline: "",
    visible: false,
  },
  achiever: {
    id: "achiever",
    name: "Achiever",
    price: 0,
    priceLabel: "",
    tagline: "",
    visible: false,
  },
};

/** The paid plan currently on sale. */
export const SELLABLE_PLAN: Plan = "foundation";

export const TRIAL_DAYS = 14;

/**
 * Monthly usage allowance per plan. -1 = unlimited.
 * Change a number here and the whole app follows.
 */
export const LIMITS: Record<Plan, Record<Feature, number>> = {
  trial: { question: UNLIMITED, cbt: UNLIMITED, past_questions: UNLIMITED },
  free: { question: 20, cbt: 2, past_questions: 5 },
  foundation: { question: UNLIMITED, cbt: UNLIMITED, past_questions: UNLIMITED },
  scholar: { question: UNLIMITED, cbt: UNLIMITED, past_questions: UNLIMITED },
  achiever: { question: UNLIMITED, cbt: UNLIMITED, past_questions: UNLIMITED },
};

/** Rolling window the allowance is counted over. */
export const USAGE_WINDOW_DAYS = 30;

export const FEATURE_LABEL: Record<Feature, string> = {
  question: "questions",
  cbt: "CBT mock exams",
  past_questions: "past-question sessions",
};

/** Features that stay fully open on every plan (never metered). */
export const ALWAYS_FREE = [
  "Error Notebook",
  "Learning profile",
  "Answer history",
  "Results and progress",
] as const;

export function limitFor(plan: Plan, feature: Feature): number {
  return LIMITS[plan]?.[feature] ?? 0;
}

export function isUnlimited(plan: Plan, feature: Feature): boolean {
  return limitFor(plan, feature) === UNLIMITED;
}

export function remaining(plan: Plan, feature: Feature, used: number): number {
  const limit = limitFor(plan, feature);
  if (limit === UNLIMITED) return UNLIMITED;
  return Math.max(0, limit - used);
}

export function canUse(plan: Plan, feature: Feature, used: number): boolean {
  const limit = limitFor(plan, feature);
  return limit === UNLIMITED || used < limit;
}

/** Plans that get the unrestricted experience. */
export function hasFullAccess(plan: Plan): boolean {
  return plan !== "free";
}

export function isPaid(plan: Plan): boolean {
  return PLANS[plan]?.price > 0;
}

export function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
