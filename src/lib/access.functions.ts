import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  LIMITS,
  SELLABLE_PLAN,
  USAGE_WINDOW_DAYS,
  PLANS,
  type Feature,
  type Plan,
} from "@/lib/plans";

const FEATURES: Feature[] = ["question", "cbt", "past_questions"];

export interface AccessState {
  userId: string;
  role: "student" | "admin";
  plan: Plan;
  studentCode: string;
  fullName: string;
  email: string;
  trialStartAt: string;
  trialExpiresAt: string;
  /** Whether the one-and-only trial window is still running. */
  onTrial: boolean;
  trialEnded: boolean;
  subscription: {
    plan: Plan;
    startedAt: string;
    expiresAt: string;
    amount: number;
  } | null;
  lastExpiredSubscriptionAt: string | null;
  pendingRequest: { id: string; plan: Plan; amount: number; createdAt: string } | null;
  lastRequest: {
    id: string;
    plan: Plan;
    status: string;
    createdAt: string;
    reviewedAt: string | null;
  } | null;
  usage: Record<Feature, number>;
  limits: Record<Feature, number>;
}

/** Reconciles trial/subscription expiry server-side, then reports the truth. */
export const getAccessState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccessState> => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Expires stale subscriptions and rewrites profiles.plan to the truth.
    await supabaseAdmin.rpc("sync_access_state", { _user_id: userId });

    const [{ data: profile }, { data: roles }, { data: subs }, { data: requests }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .order("expires_at", { ascending: false })
          .limit(5),
        supabase
          .from("upgrade_requests")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    if (!profile) throw new Error("Profile not found");

    const plan = profile.plan as Plan;
    const since = new Date(Date.now() - USAGE_WINDOW_DAYS * 86_400_000).toISOString();
    const { data: events } = await supabase
      .from("usage_events")
      .select("feature")
      .eq("user_id", userId)
      .gte("created_at", since);

    const usage = { question: 0, cbt: 0, past_questions: 0 } as Record<Feature, number>;
    for (const e of events ?? []) {
      if ((FEATURES as string[]).includes(e.feature)) usage[e.feature as Feature] += 1;
    }

    const active = (subs ?? []).find(
      (s) => s.status === "active" && new Date(s.expires_at).getTime() > Date.now(),
    );
    const lastExpired = (subs ?? []).find((s) => s.status === "expired");
    const pending = (requests ?? []).find((r) => r.status === "pending");
    const last = (requests ?? [])[0];

    return {
      userId,
      role: (roles ?? []).some((r) => r.role === "admin") ? "admin" : "student",
      plan,
      studentCode: profile.student_code,
      fullName: profile.full_name,
      email: profile.email ?? "",
      trialStartAt: profile.trial_start_at,
      trialExpiresAt: profile.trial_expires_at,
      onTrial: plan === "trial",
      trialEnded: new Date(profile.trial_expires_at).getTime() <= Date.now(),
      subscription: active
        ? {
            plan: active.plan as Plan,
            startedAt: active.started_at,
            expiresAt: active.expires_at,
            amount: active.amount,
          }
        : null,
      lastExpiredSubscriptionAt: lastExpired?.expires_at ?? null,
      pendingRequest: pending
        ? {
            id: pending.id,
            plan: pending.plan as Plan,
            amount: pending.amount,
            createdAt: pending.created_at,
          }
        : null,
      lastRequest: last
        ? {
            id: last.id,
            plan: last.plan as Plan,
            status: last.status,
            createdAt: last.created_at,
            reviewedAt: last.reviewed_at,
          }
        : null,
      usage,
      limits: LIMITS[plan],
    };
  });

/** Student asks to upgrade. Idempotent: an existing pending request is reused. */
export const createUpgradeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.rpc("sync_access_state", { _user_id: userId });

    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id, expires_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (existingSub) {
      return { status: "already_active" as const, expiresAt: existingSub.expires_at };
    }

    const { data: pending } = await supabase
      .from("upgrade_requests")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();
    if (pending) {
      return { status: "pending" as const, id: pending.id, createdAt: pending.created_at };
    }

    const { data, error } = await supabaseAdmin
      .from("upgrade_requests")
      .insert({
        user_id: userId,
        plan: SELLABLE_PLAN,
        amount: PLANS[SELLABLE_PLAN].price,
        status: "pending",
      })
      .select("id, created_at")
      .single();
    if (error) {
      // Unique index raced us — treat as pending.
      return { status: "pending" as const, id: "", createdAt: new Date().toISOString() };
    }
    return { status: "created" as const, id: data.id, createdAt: data.created_at };
  });

/**
 * Server-side gate for a metered feature. The browser cannot fake this:
 * the plan and the usage count both come from the database.
 */
export const consumeFeature = createServerFn({ method: "POST" })
  .inputValidator((data: { feature: Feature }) => {
    if (!FEATURES.includes(data?.feature)) throw new Error("Unknown feature");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plan } = await supabaseAdmin.rpc("sync_access_state", {
      _user_id: userId,
    });
    const limit = LIMITS[(plan as Plan) ?? "free"][data.feature];

    if (limit === -1) {
      return { allowed: true as const, remaining: -1, plan: plan as Plan };
    }

    const since = new Date(Date.now() - USAGE_WINDOW_DAYS * 86_400_000).toISOString();
    const { count } = await supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", data.feature)
      .gte("created_at", since);

    const used = count ?? 0;
    if (used >= limit) {
      return { allowed: false as const, remaining: 0, plan: plan as Plan };
    }

    await supabaseAdmin
      .from("usage_events")
      .insert({ user_id: userId, feature: data.feature });

    return {
      allowed: true as const,
      remaining: Math.max(0, limit - used - 1),
      plan: plan as Plan,
    };
  });
