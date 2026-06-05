import { Camera, ImageIcon, X } from "lucide-react";
import { useRef, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSolve: (dataUrl: string) => void;
}

export function ImageModal({ open, onClose, onSolve }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) {
      alert("Please choose an image under 6MB.");
      return;
    }
    const r = new FileReader();
    r.onload = () => setPreview(r.result as string);
    r.readAsDataURL(f);
  };

  const close = () => {
    setPreview(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-card p-6 pb-8 shadow-xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload Your Question</h2>
          <button
            onClick={close}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {preview ? (
          <div className="overflow-hidden rounded-2xl border border-border">
            <img src={preview} alt="Question preview" className="max-h-72 w-full object-contain bg-muted" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 p-5 text-sm font-medium hover:border-primary"
            >
              <Camera className="h-7 w-7 text-primary" />
              Take photo
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 p-5 text-sm font-medium hover:border-primary"
            >
              <ImageIcon className="h-7 w-7 text-primary" />
              Choose image
            </button>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <p className="mt-3 text-xs text-muted-foreground">
          Tip: Make sure the question is clear, well-lit, and fits the frame.
        </p>

        <div className="mt-5 flex gap-2">
          {preview && (
            <button
              onClick={() => setPreview(null)}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium"
            >
              Retake
            </button>
          )}
          <button
            disabled={!preview}
            onClick={() => preview && onSolve(preview)}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Solve This Question
          </button>
        </div>
      </div>
    </div>
  );
}
