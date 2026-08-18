// Smart Error Notebook — locally stored questions the student got wrong.

export interface NotebookItem {
  id: string; // same id as the history item
  question: string;
  subject: string;
  finalAnswer: string;
  keyMistake: string;
  addedAt: number;
  reviewedAt?: number;
}

const KEY = "askteacha.notebook";
const MAX = 200;

export function getNotebook(): NotebookItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as NotebookItem[]) : [];
  } catch {
    return [];
  }
}

function write(list: NotebookItem[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

export function isInNotebook(id: string): boolean {
  return getNotebook().some((n) => n.id === id);
}

export function addToNotebook(item: NotebookItem) {
  write([item, ...getNotebook().filter((n) => n.id !== item.id)]);
}

export function removeFromNotebook(id: string) {
  write(getNotebook().filter((n) => n.id !== id));
}

export function markReviewed(id: string) {
  write(
    getNotebook().map((n) => (n.id === id ? { ...n, reviewedAt: Date.now() } : n)),
  );
}

export function clearNotebook() {
  localStorage.removeItem(KEY);
}

export function groupBySubject(items: NotebookItem[]) {
  const map = new Map<string, NotebookItem[]>();
  for (const item of items) {
    const key = item.subject || "General";
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
}
