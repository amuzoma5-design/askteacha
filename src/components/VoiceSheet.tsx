import { Mic, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
}

export function VoiceSheet({ open, onClose, onResult }: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    if (!open) {
      setTranscript("");
      setError(null);
      setListening(false);
      try {
        recRef.current?.stop?.();
      } catch {}
    }
  }, [open]);

  const start = () => {
    setError(null);
    setTranscript("");
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Voice input is not supported on this browser. Try typing instead.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-NG";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    rec.onerror = (e: any) => {
      setError(e.error || "Could not capture voice");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stop = () => {
    try {
      recRef.current?.stop?.();
    } catch {}
    setListening(false);
  };

  const submit = () => {
    const t = transcript.trim();
    if (!t) return;
    onResult(t);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40">
      <div className="w-full max-w-md rounded-t-3xl bg-card p-6 pb-8 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Speak your question clearly</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col items-center py-6">
          <button
            onClick={listening ? stop : start}
            className={`flex h-24 w-24 items-center justify-center rounded-full shadow-lg transition ${
              listening
                ? "animate-pulse bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            }`}
            aria-label={listening ? "Stop" : "Start"}
          >
            {listening ? <Square className="h-8 w-8" /> : <Mic className="h-10 w-10" />}
          </button>
          <p className="mt-4 text-sm text-muted-foreground">
            {listening ? "Listening…" : "Tap to start"}
          </p>
        </div>
        {transcript && (
          <div className="rounded-xl bg-muted p-3 text-sm text-foreground">{transcript}</div>
        )}
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!transcript.trim()}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}
