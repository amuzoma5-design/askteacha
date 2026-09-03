import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Check,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount } from "@/hooks/useAccount";
import {
  adminSetPlan,
  getAdminOverview,
  reviewUpgradeRequest,
} from "@/lib/admin.functions";
import { PLANS, formatDate, type Plan } from "@/lib/plans";
import { formatNaira } from "@/lib/payment-config";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — AskTeacha" },
      {
        name: "description",
        content:
          "Approve Foundation upgrade requests, review students and manage plans on AskTeacha.",
      },
      { property: "og:title", content: "Admin Dashboard — AskTeacha" },
      {
        property: "og:description",
        content: "Verify payments and manage AskTeacha student subscriptions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Tab = "requests" | "students" | "activity";

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, loadingSession, isAdmin, loadingAccess, access } = useAccount();
  const overviewFn = useServerFn(getAdminOverview);
  const reviewFn = useServerFn(reviewUpgradeRequest);
  const setPlanFn = useServerFn(adminSetPlan);
  const [tab, setTab] = useState<Tab>("requests");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loadingSession && !session) navigate({ to: "/auth", replace: true });
  }, [loadingSession, session, navigate]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => overviewFn(),
    enabled: Boolean(session) && isAdmin,
    staleTime: 30_000,
  });

  const reload = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    await refetch();
  };

  if (loadingSession || loadingAccess || !access) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <ShieldCheck className="h-8 w-8 text-muted-foreground" />
        <h1 className="text-lg font-bold">Administrators only</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          This area is for Ask Teacha administrators. Your account does not have
          admin access.
        </p>
        <Link
          to="/home"
          className="mt-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const pending = (data?.requests ?? []).filter((r) => r.status === "pending");
  const reviewed = (data?.requests ?? []).filter((r) => r.status !== "pending");
  const students = (data?.students ?? []).filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [s.full_name, s.email, s.student_code].some((v) =>
      (v ?? "").toLowerCase().includes(q),
    );
  });

  const decide = async (requestId: string, decision: "approve" | "reject") => {
    setBusyId(requestId);
    try {
      await reviewFn({ data: { requestId, decision } });
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const changePlan = async (userId: string, plan: "free" | "foundation") => {
    setBusyId(userId);
    try {
      await setPlanFn({ data: { userId, plan, months: 1 } });
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
        <Link
          to="/home"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm font-semibold">Admin</span>
        <button
          onClick={reload}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-5">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-2">
              <Stat label="Students" value={data?.stats.totalStudents ?? 0} icon />
              <Stat label="Pending payments" value={data?.stats.pendingRequests ?? 0} />
              <Stat label="On trial" value={data?.stats.trial ?? 0} />
              <Stat label="On Foundation" value={data?.stats.foundation ?? 0} />
            </section>

            <div className="mt-4 flex gap-1 rounded-xl bg-secondary p-1">
              {(
                [
                  ["requests", `Requests${pending.length ? ` (${pending.length})` : ""}`],
                  ["students", "Students"],
                  ["activity", "Activity"],
                ] as [Tab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                    tab === id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "requests" && (
              <section className="mt-4 flex flex-col gap-3">
                {pending.length === 0 && (
                  <Empty text="No payments are waiting for verification." />
                )}
                {pending.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60"
                  >
                    <p className="text-sm font-bold">{r.studentName || "Unnamed student"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.email} · {r.studentCode}
                    </p>
                    <p className="mt-2 text-xs">
                      Wants <strong>{PLANS[r.requestedPlan as Plan]?.name}</strong> ·{" "}
                      {formatNaira(r.amount)} · requested {formatDate(r.createdAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Current plan: {PLANS[r.currentPlan as Plan]?.name}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={busyId === r.id}
                        onClick={() => decide(r.id, "approve")}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        {busyId === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Approve
                      </button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => decide(r.id, "reject")}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary px-3 py-2.5 text-sm font-semibold text-secondary-foreground disabled:opacity-60"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </article>
                ))}

                {reviewed.length > 0 && (
                  <>
                    <h2 className="mt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Reviewed
                    </h2>
                    {reviewed.slice(0, 25).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 ring-1 ring-border/60"
                      >
                        <div>
                          <p className="text-sm font-semibold">{r.studentName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(r.reviewedAt)}
                            {r.reviewedBy ? ` · by ${r.reviewedBy}` : ""}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            r.status === "approved"
                              ? "bg-primary/10 text-primary"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </section>
            )}

            {tab === "students" && (
              <section className="mt-4 flex flex-col gap-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email or ID"
                  className="w-full rounded-xl bg-card px-3 py-2.5 text-sm ring-1 ring-border/60 outline-none focus:ring-primary"
                />
                {students.length === 0 && <Empty text="No students found." />}
                {students.map((s) => (
                  <article
                    key={s.id}
                    className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold">{s.full_name || "Unnamed"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.email} · {s.student_code}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.class_level} · {s.exam_type}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold">
                        {PLANS[s.plan as Plan]?.name ?? s.plan}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {s.subscriptionExpiresAt
                        ? `Foundation until ${formatDate(s.subscriptionExpiresAt)}`
                        : `Trial ends ${formatDate(s.trial_expires_at)}`}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        disabled={busyId === s.id}
                        onClick={() => changePlan(s.id, "foundation")}
                        className="flex-1 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-60"
                      >
                        Give Foundation (1 month)
                      </button>
                      <button
                        disabled={busyId === s.id}
                        onClick={() => changePlan(s.id, "free")}
                        className="flex-1 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
                      >
                        Move to Free
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            )}

            {tab === "activity" && (
              <section className="mt-4 flex flex-col gap-2">
                {(data?.actions ?? []).length === 0 && <Empty text="No admin activity yet." />}
                {(data?.actions ?? []).map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl bg-card px-4 py-3 ring-1 ring-border/60"
                  >
                    <p className="text-sm font-semibold">
                      {a.action.replace(/_/g, " ")} — {a.targetName}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.adminName} · {formatDate(a.createdAt)}
                    </p>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border/60">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        {icon && <Users className="h-3 w-3" />}
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl bg-card px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-border/60">
      {text}
    </p>
  );
}
