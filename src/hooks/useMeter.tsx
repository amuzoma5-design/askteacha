import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { Lock, X } from "lucide-react";
import { consumeFeature } from "@/lib/access.functions";
import { useAccount } from "@/hooks/useAccount";
import { FEATURE_LABEL, PLANS, type Feature } from "@/lib/plans";

/**
 * Single gate for every metered feature. The server counts and decides —
 * the browser only shows the outcome.
 */
export function useMeter() {
  const { refresh } = useAccount();
  const consume = useServerFn(consumeFeature);
  const [blocked, setBlocked] = useState<Feature | null>(null);

  const check = useCallback(
    async (feature: Feature): Promise<boolean> => {
      try {
        const res = await consume({ data: { feature } });
        void refresh();
        if (!res.allowed) {
          setBlocked(feature);
          return false;
        }
        return true;
      } catch {
        // Never block learning because of a transient network problem.
        return true;
      }
    },
    [consume, refresh],
  );

  const clear = useCallback(() => setBlocked(null), []);

  return { check, blocked, clear };
}

export function LimitDialog({
  feature,
  onClose,
}: {
  feature: Feature | null;
  onClose: () => void;
}) {
  if (!feature) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-card p-5 ring-1 ring-border">
        <div className="mb-3 flex items-start justify-between gap-3">
          <span className="rounded-2xl bg-warning/15 p-2.5 text-warning">
            <Lock className="h-5 w-5" />
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2 className="text-lg font-bold leading-snug">
          You've used all your {FEATURE_LABEL[feature]} on the Free plan
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your allowance resets after 30 days. Upgrade to Foundation for{" "}
          {PLANS.foundation.priceLabel} to get unlimited {FEATURE_LABEL[feature]} and
          everything else in Ask Teacha.
        </p>
        <Link
          to="/upgrade"
          className="mt-4 flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          Upgrade to Foundation — {PLANS.foundation.priceLabel}
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

/** Small "x of y left this month" line for the Free plan. */
export function UsageLeft({ feature }: { feature: Feature }) {
  const { access, left } = useAccount();
  if (!access) return null;
  const n = left(feature);
  if (n === -1) return null;
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {n} {FEATURE_LABEL[feature]} left this month on the Free plan.{" "}
      <Link to="/upgrade" className="font-semibold text-primary">
        Upgrade
      </Link>
    </p>
  );
}
