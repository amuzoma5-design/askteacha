import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAccessState, type AccessState } from "@/lib/access.functions";
import { pullLearningData, pushLearningData } from "@/lib/sync.functions";
import { addHistory, getHistory, newId, type HistoryItem } from "@/lib/history";
import { addToNotebook, getNotebook, type NotebookItem } from "@/lib/notebook";
import { saveProfile, type ClassLevel, type ExamType } from "@/lib/profile";
import { canUse, remaining, type Feature } from "@/lib/plans";

interface AccountValue {
  session: Session | null;
  loadingSession: boolean;
  access: AccessState | null;
  loadingAccess: boolean;
  refresh: () => Promise<void>;
  isAdmin: boolean;
  /** Central access questions — never test the plan directly in a screen. */
  can: (feature: Feature) => boolean;
  left: (feature: Feature) => number;
}

const AccountContext = createContext<AccountValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const queryClient = useQueryClient();

  const fetchAccess = useServerFn(getAccessState);
  const pull = useServerFn(pullLearningData);
  const push = useServerFn(pushLearningData);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoadingSession(false);
      queryClient.invalidateQueries({ queryKey: ["access"] });
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const { data: access, isLoading: loadingAccess } = useQuery({
    queryKey: ["access", session?.user.id],
    queryFn: () => fetchAccess(),
    enabled: Boolean(session),
    staleTime: 60_000,
    // The trial can lapse while the student is sitting on the page.
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });

  // Keep the local caches the learning screens read in step with the account.
  useEffect(() => {
    if (!session || !access) return;
    saveProfile({
      userId: access.studentCode,
      fullName: access.fullName,
      classLevel: "SS3" as ClassLevel,
      examType: "WAEC" as ExamType,
    });
  }, [session, access?.studentCode, access?.fullName]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        // 1. Push anything this browser has that the account doesn't.
        const history = getHistory();
        const notebook = getNotebook();
        if (history.length || notebook.length) {
          await push({
            data: {
              history: history.map((h) => ({
                localId: h.id,
                question: h.question,
                subject: h.subject,
                answer: h.answer,
                createdAt: h.createdAt,
              })),
              notebook: notebook.map((n) => ({
                localId: n.id,
                question: n.question,
                subject: n.subject,
                keyMistake: n.keyMistake,
                finalAnswer: n.finalAnswer,
                revised: Boolean(n.reviewedAt),
                createdAt: n.addedAt,
              })),
            },
          });
        }
        // 2. Pull anything the account has that this browser doesn't.
        const remote = await pull();
        if (cancelled) return;
        const localHistoryIds = new Set(getHistory().map((h) => h.id));
        for (const r of remote.history) {
          if (localHistoryIds.has(r.localId)) continue;
          addHistory({
            id: r.localId || newId(),
            question: r.question,
            hasImage: false,
            subject: r.subject,
            createdAt: r.createdAt,
            answer: r.answer as HistoryItem["answer"],
          });
        }
        const localNotebookIds = new Set(getNotebook().map((n) => n.id));
        for (const r of remote.notebook) {
          if (localNotebookIds.has(r.localId)) continue;
          const item: NotebookItem = {
            id: r.localId || newId(),
            question: r.question,
            subject: r.subject,
            finalAnswer: r.finalAnswer,
            keyMistake: r.keyMistake,
            addedAt: r.createdAt,
            ...(r.revised ? { reviewedAt: r.createdAt } : {}),
          };
          addToNotebook(item);
        }
      } catch {
        // Offline or a transient error — local data still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const value: AccountValue = {
    session,
    loadingSession,
    access: access ?? null,
    loadingAccess,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ["access"] });
    },
    isAdmin: access?.role === "admin",
    can: (feature) =>
      access ? canUse(access.plan, feature, access.usage[feature] ?? 0) : false,
    left: (feature) =>
      access ? remaining(access.plan, feature, access.usage[feature] ?? 0) : 0,
  };

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside AccountProvider");
  return ctx;
}
