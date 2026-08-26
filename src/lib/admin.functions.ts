import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS, SELLABLE_PLAN, type Plan } from "@/lib/plans";

/**
 * Every admin server function starts here. The role is read from the
 * database with the caller's own token — a browser cannot spoof it.
 */
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
  return context.userId;
}

function addMonths(from: Date, months: number) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Bring every student's stored plan in line before counting.
    const { data: allProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .limit(5000);
    await Promise.all(
      (allProfiles ?? []).map((p) =>
        supabaseAdmin.rpc("sync_access_state", { _user_id: p.id }),
      ),
    );

    const [{ data: profiles }, { data: subs }, { data: requests }, { data: roles }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select(
            "id, student_code, full_name, email, class_level, exam_type, plan, trial_expires_at, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(1000),
        supabaseAdmin.from("subscriptions").select("*").limit(2000),
        supabaseAdmin
          .from("upgrade_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
        supabaseAdmin.from("user_roles").select("user_id, role"),
      ]);

    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const adminIds = new Set(
      (roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id),
    );

    const students = (profiles ?? []).map((p) => {
      const sub = (subs ?? []).find(
        (s) => s.user_id === p.id && s.status === "active",
      );
      return {
        ...p,
        isAdmin: adminIds.has(p.id),
        subscriptionExpiresAt: sub?.expires_at ?? null,
      };
    });

    const stats = {
      totalStudents: students.filter((s) => !s.isAdmin).length,
      trial: students.filter((s) => s.plan === "trial").length,
      free: students.filter((s) => s.plan === "free").length,
      foundation: students.filter((s) => s.plan === "foundation").length,
      pendingRequests: (requests ?? []).filter((r) => r.status === "pending").length,
      activeSubscriptions: (subs ?? []).filter((s) => s.status === "active").length,
      expiredSubscriptions: (subs ?? []).filter((s) => s.status === "expired").length,
    };

    const reviewerIds = [
      ...new Set((requests ?? []).map((r) => r.reviewed_by).filter(Boolean)),
    ] as string[];
    const { data: reviewers } = reviewerIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, full_name, email")
          .in("id", reviewerIds)
      : { data: [] as any[] };
    const reviewerById = new Map((reviewers ?? []).map((r) => [r.id, r]));

    const enrichedRequests = (requests ?? []).map((r) => {
      const p = byId.get(r.user_id);
      const rev = r.reviewed_by ? reviewerById.get(r.reviewed_by) : null;
      return {
        id: r.id,
        userId: r.user_id,
        studentName: p?.full_name ?? "Unknown",
        studentCode: p?.student_code ?? "",
        email: p?.email ?? "",
        currentPlan: (p?.plan ?? "free") as Plan,
        requestedPlan: r.plan as Plan,
        amount: r.amount,
        status: r.status,
        createdAt: r.created_at,
        reviewedAt: r.reviewed_at,
        reviewedBy: rev?.full_name || rev?.email || null,
        subscriptionStartAt: r.subscription_start_at,
        subscriptionExpiresAt: r.subscription_expires_at,
      };
    });

    const { data: actions } = await supabaseAdmin
      .from("admin_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return {
      stats,
      requests: enrichedRequests,
      students: students.filter((s) => !s.isAdmin),
      actions: (actions ?? []).map((a) => ({
        id: a.id,
        action: a.action,
        detail: a.detail,
        createdAt: a.created_at,
        adminName: byId.get(a.admin_id)?.full_name ?? "Admin",
        targetName: byId.get(a.target_user_id)?.full_name ?? "Student",
      })),
    };
  });

export const reviewUpgradeRequest = createServerFn({ method: "POST" })
  .inputValidator((data: { requestId: string; decision: "approve" | "reject" }) => {
    if (!data?.requestId) throw new Error("requestId required");
    if (data.decision !== "approve" && data.decision !== "reject") {
      throw new Error("Invalid decision");
    }
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const adminId = await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req } = await supabaseAdmin
      .from("upgrade_requests")
      .select("*")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") return { status: req.status, alreadyReviewed: true };

    const now = new Date();

    if (data.decision === "reject") {
      await supabaseAdmin
        .from("upgrade_requests")
        .update({
          status: "rejected",
          reviewed_at: now.toISOString(),
          reviewed_by: adminId,
        })
        .eq("id", req.id);
      await supabaseAdmin.from("admin_actions").insert({
        admin_id: adminId,
        target_user_id: req.user_id,
        action: "reject_payment",
        detail: { requestId: req.id, plan: req.plan },
      });
      return { status: "rejected" as const };
    }

    const expires = addMonths(now, 1);

    // Never leave two active subscriptions behind.
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("user_id", req.user_id)
      .eq("status", "active");

    await supabaseAdmin.from("subscriptions").insert({
      user_id: req.user_id,
      plan: req.plan,
      status: "active",
      amount: req.amount,
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
      approved_by: adminId,
    });

    await supabaseAdmin
      .from("upgrade_requests")
      .update({
        status: "approved",
        reviewed_at: now.toISOString(),
        reviewed_by: adminId,
        subscription_start_at: now.toISOString(),
        subscription_expires_at: expires.toISOString(),
      })
      .eq("id", req.id);

    await supabaseAdmin.rpc("sync_access_state", { _user_id: req.user_id });
    await supabaseAdmin.from("admin_actions").insert({
      admin_id: adminId,
      target_user_id: req.user_id,
      action: "approve_payment",
      detail: { requestId: req.id, plan: req.plan, expiresAt: expires.toISOString() },
    });

    return { status: "approved" as const, expiresAt: expires.toISOString() };
  });

/** Manual override: put a student on Foundation or back on Free. */
export const adminSetPlan = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; plan: "free" | "foundation"; months?: number }) => {
    if (!data?.userId) throw new Error("userId required");
    if (data.plan !== "free" && data.plan !== "foundation") throw new Error("Invalid plan");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const adminId = await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();

    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("user_id", data.userId)
      .eq("status", "active");

    if (data.plan === "foundation") {
      const expires = addMonths(now, Math.max(1, data.months ?? 1));
      await supabaseAdmin.from("subscriptions").insert({
        user_id: data.userId,
        plan: SELLABLE_PLAN,
        status: "active",
        amount: PLANS[SELLABLE_PLAN].price,
        started_at: now.toISOString(),
        expires_at: expires.toISOString(),
        approved_by: adminId,
      });
    } else {
      // Ending Foundation also ends any unfinished trial.
      await supabaseAdmin
        .from("profiles")
        .update({ trial_expires_at: now.toISOString() })
        .eq("id", data.userId)
        .gt("trial_expires_at", now.toISOString());
    }

    const { data: plan } = await supabaseAdmin.rpc("sync_access_state", {
      _user_id: data.userId,
    });

    await supabaseAdmin.from("admin_actions").insert({
      admin_id: adminId,
      target_user_id: data.userId,
      action: "manual_plan_change",
      detail: { plan: data.plan, months: data.months ?? 1 },
    });

    return { plan: plan as Plan };
  });
