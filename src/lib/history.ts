export interface AnswerStructured {
  finalAnswer: string;
  explanation: string;
  examMethod: string[];
  commonMistakes: string[];
  practice: { question: string; answer: string }[];
  subject: string;
}

export type Feedback = "helpful" | "not_helpful";

export interface HistoryItem {
  id: string;
  question: string;
  hasImage: boolean;
  subject: string;
  createdAt: number;
  answer: AnswerStructured;
  feedback?: Feedback;
}

const KEY = "askteacha.history";
const MAX = 100;

export function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function getHistoryItem(id: string): HistoryItem | null {
  return getHistory().find((h) => h.id === id) ?? null;
}

export function addHistory(item: HistoryItem) {
  const list = [item, ...getHistory().filter((h) => h.id !== item.id)].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function updateHistory(id: string, patch: Partial<HistoryItem>) {
  const list = getHistory().map((h) => (h.id === id ? { ...h, ...patch } : h));
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}

export function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
