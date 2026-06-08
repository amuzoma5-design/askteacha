import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera, Keyboard, Mic, Send, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ImageModal } from "@/components/ImageModal";
import { VoiceSheet } from "@/components/VoiceSheet";
import { getProfile } from "@/lib/profile";
import { isSessionActive } from "@/lib/session";
import { getHistory, type HistoryItem } from "@/lib/history";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Ask a question — AskTeacha" },
      { name: "description", content: "Ask your AI teacher anything for WAEC, NECO or JAMB." },
    ],
  }),
  component: Home,
});

const SUGGESTIONS = [
  "Solve: 2x² + 5x - 3 = 0",
  "Explain photosynthesis simply",
  "What is balance of trade?",
  "Differentiate y = 3x² + 2x",
  "Causes of the 1914 amalgamation",
  "What is osmosis?",
];

function Home() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    if (!isSessionActive()) {
      navigate({ to: "/welcome", replace: true });
      return;
    }
    setFirstName(p.fullName.split(" ")[0]);
    setHistory(getHistory());
  }, [navigate]);

  const ask = (q: string, imageDataUrl?: string) => {
    const payload = { question: q, imageDataUrl };
    sessionStorage.setItem("askteacha.pending", JSON.stringify(payload));
    navigate({ to: "/answer" });
  };

  const submitText = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    ask(q);
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <AppHeader />
      <main className="mx-auto w-full max-w-md px-4 py-5">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Hi {firstName || "there"} 👋
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-tight">
            What do you want to learn today?
          </h1>
        </div>

        <form
          onSubmit={submitText}
          className="rounded-3xl bg-card p-4 shadow-sm ring-1 ring-border/60"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask your question…"
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded-xl bg-background px-3 py-2 text-base outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ActionBtn
              icon={<Mic className="h-5 w-5" />}
              label="Voice"
              onClick={() => setVoiceOpen(true)}
            />
            <ActionBtn
              icon={<Camera className="h-5 w-5" />}
              label="Upload"
              onClick={() => setImageOpen(true)}
            />
            <ActionBtn
              icon={<Keyboard className="h-5 w-5" />}
              label="Type"
              onClick={() => {
                const el = document.querySelector("textarea");
                (el as HTMLTextAreaElement | null)?.focus();
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow transition disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Ask Teacha
          </button>
        </form>

        <section className="mt-7">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            Try one of these
          </h2>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="shrink-0 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <h2 className="mb-2 text-sm font-semibold">Recent questions</h2>
          {history.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card/50 p-4 text-center text-sm text-muted-foreground">
              Your asked questions will appear here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.slice(0, 8).map((h) => (
                <li key={h.id}>
                  <Link
                    to="/answer"
                    search={{ id: h.id }}
                    className="flex items-start justify-between gap-3 rounded-2xl bg-card p-3 ring-1 ring-border/60 transition hover:ring-primary/40"
                  >
                    <span className="line-clamp-2 text-sm font-medium text-foreground">
                      {h.question || "Image question"}
                    </span>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground">
                      {h.subject}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <VoiceSheet
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onResult={(t) => {
          setVoiceOpen(false);
          ask(t);
        }}
      />
      <ImageModal
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        onSolve={(url) => {
          setImageOpen(false);
          ask("", url);
        }}
      />
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl bg-secondary px-2 py-2 text-xs font-medium text-secondary-foreground transition hover:bg-muted"
    >
      <span className="text-primary">{icon}</span>
      {label}
    </button>
  );
}
