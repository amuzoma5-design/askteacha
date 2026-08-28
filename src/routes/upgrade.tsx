import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Copy,
  Loader2,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount } from "@/hooks/useAccount";
import { createUpgradeRequest } from "@/lib/access.functions";
import { PLANS, SELLABLE_PLAN, formatDate } from "@/lib/plans";
import {
  PAYMENT_CONFIG,
  formatNaira,
  paymentDetailsConfigured,
  whatsappReceiptLink,
} from "@/lib/payment-config";

export const Route = createFileRoute("/upgrade")({
  head: () => ({
    meta: [
      { title: "Upgrade to Foundation — AskTeacha" },
      {
        name: "description",
        content:
          "Get full access to AskTeacha lessons, CBT mock exams and past questions for ₦2,000 a month.",
      },
      { property: "og:title", content: "Upgrade to Foundation — AskTeacha" },
      {
        property: "og:description",
        content: "Full AskTeacha access for ₦2,000/month. Pay by transfer, confirm on WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Upgrade,
});

function Upgrade() {
  const navigate = useNavigate();
  const { access, session, loadingSession, refresh } = useAccount();
  const request = useServerFn(createUpgradeRequest);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const plan = PLANS[SELLABLE_PLAN];

  useEffect(() => {
    if (!loadingSession && !session) navigate({ to: "/auth", replace: true });
  }, [loadingSession, session, navigate]);

  // Recording the request as soon as the student opens the payment screen
  // means the admin sees them even if they pay before coming back.
  useEffect(() => {
    if (!access || access.pendingRequest || access.subscription) return;
    let done = false;
    (async () => {
      setBusy(true);
      try {
        await request({ data: undefined as never });
        if (!done) await refresh();
      } finally {
        if (!done) setBusy(false);
      }
    })();
    return () => {
      done = true;
    };
  }, [access?.userId, access?.pendingRequest?.id, access?.subscription?.expiresAt]);

  if (!access) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard blocked — the value is on screen anyway
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
        <span className="text-sm font-semibold">Foundation</span>
        <div className="w-9" />
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-5">
        {access.subscription ? (
          <section className="rounded-3xl bg-primary/10 p-5 ring-1 ring-primary/25">
            <BadgeCheck className="h-6 w-6 text-primary" />
            <h1 className="mt-2 text-xl font-bold">You're on Foundation</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {plan.priceLabel} · Active until {formatDate(access.subscription.expiresAt)}.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              To renew, transfer again close to your expiry date and send the receipt on
              WhatsApp using the button below.
            </p>
          </section>
        ) : (
          <section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-border/60">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Recommended
            </p>
            <h1 className="mt-1 text-2xl font-bold">Foundation</h1>
            <p className="text-lg font-semibold text-primary">{plan.priceLabel}</p>
            <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-foreground">
              {[
                "Unlimited questions with your AI teacher",
                "Unlimited JAMB CBT mock exams",
                "Unlimited past-question practice",
                "Full daily study plans and coaching notes",
                "Error Notebook, results and progress kept forever",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </section>
        )}

        {access.pendingRequest && (
          <section className="mt-4 flex items-start gap-2 rounded-2xl bg-accent/10 p-4 ring-1 ring-accent/30">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-sm">
              <span className="block font-semibold">Foundation upgrade pending</span>
              <span className="text-muted-foreground">
                Your payment is awaiting verification. We'll activate Foundation as soon
                as an Ask Teacha administrator confirms it.
              </span>
            </p>
          </section>
        )}
        {busy && !access.pendingRequest && (
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Preparing your upgrade…
          </p>
        )}

        <section className="mt-5 rounded-3xl bg-card p-5 ring-1 ring-border/60">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Building2 className="h-4 w-4 text-primary" />
            Payment instructions
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            <Detail label="Bank" value={PAYMENT_CONFIG.bankName} onCopy={copy} copied={copied} />
            <Detail
              label="Account Name"
              value={PAYMENT_CONFIG.accountName}
              onCopy={copy}
              copied={copied}
            />
            <Detail
              label="Account Number"
              value={PAYMENT_CONFIG.accountNumber}
              onCopy={copy}
              copied={copied}
            />
            <Detail label="Amount" value={formatNaira(plan.price)} onCopy={copy} copied={copied} />
          </div>

          <ol className="mt-4 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-foreground">
            <li>Transfer {formatNaira(plan.price)} to the account above.</li>
            <li>Send your payment receipt through WhatsApp.</li>
            <li>Include your Ask Teacha account email or name.</li>
            <li>Your payment will be verified by an Ask Teacha administrator.</li>
            <li>Once approved, Foundation access will be activated.</li>
          </ol>

          {paymentDetailsConfigured() ? (
            <a
              href={whatsappReceiptLink({
                name: access.fullName,
                email: access.email,
                amount: plan.price,
                planName: plan.name,
              })}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow"
            >
              <MessageCircle className="h-4 w-4" />
              Send Payment Receipt on WhatsApp
            </a>
          ) : (
            <p className="mt-4 rounded-xl bg-warning/10 p-3 text-xs text-muted-foreground ring-1 ring-warning/30">
              Bank and WhatsApp details have not been set yet. Add them in the payment
              settings so students can complete payment.
            </p>
          )}

          <p className="mt-3 text-[11px] text-muted-foreground">
            Your Ask Teacha ID is <strong>{access.studentCode}</strong> — quote it if we
            ask for it.
          </p>
        </section>
      </main>
    </div>
  );
}

function Detail({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: (l: string, v: string) => void;
  copied: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <button
        onClick={() => onCopy(label, value)}
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
      >
        {value}
        <Copy className="h-3 w-3 text-muted-foreground" />
        {copied === label && <span className="text-[10px] text-primary">copied</span>}
      </button>
    </div>
  );
}
