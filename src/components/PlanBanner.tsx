import { Link } from "@tanstack/react-router";
import { Clock, Crown, ShieldCheck, Sparkles } from "lucide-react";
import { useAccount } from "@/hooks/useAccount";
import { PLANS, TRIAL_DAYS, daysLeft, formatDate } from "@/lib/plans";
import { formatNaira } from "@/lib/payment-config";

/**
 * The single place the student's access state is explained. Reads from the
 * server-computed access state — never from a browser timer.
 */
export function PlanBanner() {
  const { access } = useAccount();
  if (!access) return null;

  const foundation = PLANS.foundation;

  if (access.plan === "foundation" || access.subscription) {
    return (
      <Card tone="primary">
        <Head icon={<Crown className="h-4 w-4" />} title="Foundation" />
        <p className="text-sm font-semibold text-foreground">{foundation.priceLabel}</p>
        {access.subscription && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Active until {formatDate(access.subscription.expiresAt)}
          </p>
        )}
        <Link
          to="/upgrade"
          className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Renew / Manage Foundation
        </Link>
      </Card>
    );
  }

  if (access.plan === "trial") {
    const left = daysLeft(access.trialExpiresAt) ?? 0;
    const urgent = left <= 2;
    return (
      <Card tone={urgent ? "warning" : "accent"}>
        <Head
          icon={<Sparkles className="h-4 w-4" />}
          title={`${TRIAL_DAYS}-Day Free Trial`}
        />
        {urgent ? (
          <>
            <p className="text-sm font-semibold text-foreground">
              {left <= 1
                ? "Your free trial ends tomorrow."
                : `Your free trial ends in ${left} days.`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              You currently have full access to Ask Teacha. Upgrade to Foundation for{" "}
              {foundation.priceLabel} to continue enjoying full access after your trial.
            </p>
            <UpgradeButton label={`Upgrade to Foundation — ${foundation.priceLabel}`} />
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">
              {left} day{left === 1 ? "" : "s"} remaining
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              You have full access to everything in Ask Teacha.
            </p>
            <UpgradeButton label="Upgrade to Foundation" subtle />
          </>
        )}
      </Card>
    );
  }

  // Free plan
  const cameFromSubscription = Boolean(access.lastExpiredSubscriptionAt);
  return (
    <Card tone="muted">
      <Head icon={<Clock className="h-4 w-4" />} title="Free Plan" />
      <p className="text-sm font-semibold text-foreground">
        {cameFromSubscription
          ? "Your Foundation subscription has expired."
          : "Your 14-day free trial has ended. You're now on the Free plan."}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        You can keep learning with limited usage. Your progress, results and history are
        all still here.
      </p>
      <UpgradeButton
        label={
          cameFromSubscription
            ? `Renew Foundation — ${foundation.priceLabel}`
            : `Upgrade to Foundation — ${foundation.priceLabel}`
        }
      />
    </Card>
  );
}

function UpgradeButton({ label, subtle }: { label: string; subtle?: boolean }) {
  const { access } = useAccount();
  if (access?.pendingRequest) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-background/70 p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span className="text-xs">
          <span className="block font-semibold text-foreground">
            Foundation upgrade pending
          </span>
          <span className="text-muted-foreground">
            Your payment of {formatNaira(access.pendingRequest.amount)} is awaiting
            verification.
          </span>
        </span>
      </div>
    );
  }
  return (
    <Link
      to="/upgrade"
      className={`mt-3 inline-flex rounded-xl px-4 py-2 text-sm font-semibold ${
        subtle
          ? "bg-background/70 text-foreground ring-1 ring-border"
          : "bg-primary text-primary-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function Head({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {icon}
      {title}
    </p>
  );
}

function Card({
  tone,
  children,
}: {
  tone: "primary" | "accent" | "warning" | "muted";
  children: React.ReactNode;
}) {
  const tones = {
    primary: "bg-primary/10 ring-primary/25",
    accent: "bg-accent/10 ring-accent/25",
    warning: "bg-warning/10 ring-warning/30",
    muted: "bg-card ring-border/60",
  } as const;
  return <section className={`rounded-2xl p-4 ring-1 ${tones[tone]}`}>{children}</section>;
}

/** Small inline notice for a metered feature that has run out. */
export function LimitNotice({ label }: { label: string }) {
  return (
    <div className="rounded-2xl bg-warning/10 p-4 ring-1 ring-warning/30">
      <p className="text-sm font-semibold text-foreground">
        You've used all your {label} on the Free plan this month.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Foundation gives you unlimited access for {PLANS.foundation.priceLabel}.
      </p>
      <Link
        to="/upgrade"
        className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Upgrade to Foundation
      </Link>
    </div>
  );
}
