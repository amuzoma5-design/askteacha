import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface HistoryPayload {
  localId: string;
  question: string;
  subject: string;
  answer: unknown;
  createdAt: number;
}

interface NotebookPayload {
  localId: string;
  question: string;
  subject: string;
  keyMistake: string;
  finalAnswer: string;
  revised: boolean;
  createdAt: number;
}

/**
 * Mirrors the browser's learning data into the student's account so it
 * follows them across devices. Nothing is ever deleted here.
 */
export const pushLearningData = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { history?: HistoryPayload[]; notebook?: NotebookPayload[] }) => data ?? {},
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const history = (data.history ?? []).slice(0, 200);
    const notebook = (data.notebook ?? []).slice(0, 300);

    if (history.length) {
      await supabase.from("question_history").upsert(
        history.map((h) => ({
          user_id: userId,
          local_id: h.localId,
          question: h.question,
          subject: h.subject,
          answer: h.answer as never,
          created_at: new Date(h.createdAt).toISOString(),
        })),
        { onConflict: "user_id,local_id" },
      );
    }

    if (notebook.length) {
      await supabase.from("notebook_entries").upsert(
        notebook.map((n) => ({
          user_id: userId,
          local_id: n.localId,
          question: n.question,
          subject: n.subject,
          key_mistake: n.keyMistake,
          answer: { finalAnswer: n.finalAnswer } as never,
          revised: n.revised,
          created_at: new Date(n.createdAt).toISOString(),
        })),
        { onConflict: "user_id,local_id" },
      );
    }

    return { ok: true };
  });

/** Everything this account already knows, for a fresh device. */
export const pullLearningData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: history }, { data: notebook }, { data: results }] = await Promise.all([
      supabase
        .from("question_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("notebook_entries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("cbt_results")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    return {
      history: (history ?? []).map((h) => ({
        localId: h.local_id ?? h.id,
        question: h.question,
        subject: h.subject,
        answer: h.answer,
        createdAt: new Date(h.created_at).getTime(),
      })),
      notebook: (notebook ?? []).map((n) => ({
        localId: n.local_id ?? n.id,
        question: n.question,
        subject: n.subject,
        keyMistake: n.key_mistake ?? "",
        finalAnswer: (n.answer as { finalAnswer?: string } | null)?.finalAnswer ?? "",
        revised: n.revised,
        createdAt: new Date(n.created_at).getTime(),
      })),
      results: (results ?? []).map((r) => ({
        subject: r.subject,
        score: r.score,
        total: r.total,
        createdAt: new Date(r.created_at).getTime(),
      })),
    };
  });

export const recordCbtResult = createServerFn({ method: "POST" })
  .inputValidator((data: { subject: string; score: number; total: number }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await context.supabase.from("cbt_results").insert({
      user_id: context.userId,
      subject: data.subject || "General",
      score: Math.max(0, Math.round(data.score)),
      total: Math.max(0, Math.round(data.total)),
    });
    return { ok: true };
  });
