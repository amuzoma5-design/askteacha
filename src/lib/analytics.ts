// Client-side analytics queue with localStorage-backed retry.
// Events are first attempted immediately; on failure they sit in the queue
// and are retried on next app load / next successful submission.

const QUEUE_KEY = "askteacha.analyticsQueue.v1";

export interface AnalyticsEvent {
  timestamp: string;
  userId?: string;
  name?: string;
  classLevel?: string;
  question: string;
  subject: string;
  platform: string;
}

function readQueue(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(events: AnalyticsEvent[]) {
  if (typeof window === "undefined") return;
  try {
    // Cap queue at 200 events to avoid runaway growth.
    const capped = events.slice(-200);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(capped));
  } catch {
    // ignore quota errors
  }
}

async function sendEvent(event: AnalyticsEvent): Promise<boolean> {
  try {
    const res = await fetch("/api/public/log-analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function enqueue(event: AnalyticsEvent) {
  const queue = readQueue();
  queue.push(event);
  writeQueue(queue);
}

export async function logQuestion(event: Omit<AnalyticsEvent, "timestamp" | "platform"> & {
  timestamp?: string;
  platform?: string;
}) {
  const full: AnalyticsEvent = {
    timestamp: event.timestamp || new Date().toISOString(),
    userId: event.userId,
    name: event.name,
    classLevel: event.classLevel,
    question: event.question,
    subject: event.subject,
    platform: event.platform || "web",
  };

  const ok = await sendEvent(full);
  if (!ok) {
    enqueue(full);
  }
  // Always try to drain any backlog after a send attempt.
  void processAnalyticsQueue();
}

let draining = false;

export async function processAnalyticsQueue() {
  if (draining) return;
  if (typeof window === "undefined") return;
  const queue = readQueue();
  if (queue.length === 0) return;
  draining = true;
  try {
    const remaining: AnalyticsEvent[] = [];
    for (const event of queue) {
      const ok = await sendEvent(event);
      if (!ok) {
        // Stop on first failure to avoid hammering a failing endpoint;
        // keep this event and all subsequent ones in the queue.
        remaining.push(event);
        const idx = queue.indexOf(event);
        if (idx >= 0) remaining.push(...queue.slice(idx + 1));
        break;
      }
    }
    writeQueue(remaining);
  } finally {
    draining = false;
  }
}
