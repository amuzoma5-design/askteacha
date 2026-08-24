import { createFileRoute } from "@tanstack/react-router";

interface Body {
  subject?: string;
  count?: number;
}

const LOVABLE_MODELS = ["google/gemini-2.5-flash-lite", "google/gemini-2.5-flash"] as const;
const OPENAI_MODELS = ["gpt-4o-mini"] as const;
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash-latest"] as const;
const AI_TIMEOUT_MS = 45_000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

interface CbtQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function parseQuestions(data: any): CbtQuestion[] | null {
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  let obj: any;
  try {
    obj = typeof args === "object" ? args : JSON.parse(args);
  } catch {
    return null;
  }
  const qs = obj?.questions;
  if (!Array.isArray(qs)) return null;
  const cleaned: CbtQuestion[] = [];
  for (const q of qs) {
    const options = Array.isArray(q?.options) ? q.options.map((o: any) => String(o)) : [];
    const idx = Number(q?.correctIndex);
    if (!q?.question || options.length !== 4 || !Number.isInteger(idx) || idx < 0 || idx > 3) {
      continue;
    }
    cleaned.push({
      question: String(q.question),
      options,
      correctIndex: idx,
      explanation: String(q?.explanation ?? ""),
    });
  }
  return cleaned.length > 0 ? cleaned : null;
}

export const Route = createFileRoute("/api/public/cbt")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const geminiKey = process.env.GEMINI_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;
        const lovableKey = process.env.LOVABLE_API_KEY;
        const key = geminiKey || openaiKey || lovableKey;
        if (!key) return json({ error: "AI is not configured yet." }, 500);

        const provider: "gemini" | "openai" | "lovable" = geminiKey
          ? "gemini"
          : openaiKey
            ? "openai"
            : "lovable";
        const endpoint =
          provider === "gemini"
            ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
            : provider === "openai"
              ? "https://api.openai.com/v1/chat/completions"
              : "https://ai.gateway.lovable.dev/v1/chat/completions";
        const models =
          provider === "gemini"
            ? GEMINI_MODELS
            : provider === "openai"
              ? OPENAI_MODELS
              : LOVABLE_MODELS;

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const subject = (body.subject ?? "Mathematics").trim().slice(0, 60);
        const count = Math.max(5, Math.min(20, Number(body.count) || 10));

        const system = `You are an official JAMB (UTME) examiner for ${subject}.
Generate ${count} authentic JAMB CBT multiple-choice questions for Nigerian candidates.
Rules:
- Exactly 4 options per question, in JAMB style (A-D), no letter prefixes in the option text.
- Exactly one correct option; set correctIndex to its 0-based position.
- Match real JAMB topics, difficulty and phrasing. Include all values needed to solve calculations.
- Give a short, clear explanation of why the correct option is right.
You MUST respond by calling the tool 'deliver_cbt'.`;

        const tool = {
          type: "function",
          function: {
            name: "deliver_cbt",
            description: "Return JAMB CBT multiple-choice questions.",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      correctIndex: { type: "number" },
                      explanation: { type: "string" },
                    },
                    required: ["question", "options", "correctIndex", "explanation"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        };

        let lastError = "Could not generate the CBT exam right now.";

        for (const model of models) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
          try {
            const upstream = await fetch(endpoint, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
              },
              signal: controller.signal,
              body: JSON.stringify({
                model,
                messages: [
                  { role: "system", content: system },
                  {
                    role: "user",
                    content: `Set ${count} JAMB CBT questions for ${subject}.`,
                  },
                ],
                tools: [tool],
                tool_choice: { type: "function", function: { name: "deliver_cbt" } },
              }),
            });

            if (!upstream.ok) {
              const text = await upstream.text();
              if (upstream.status === 429)
                return json({ error: "Too many requests. Please wait a moment." }, 429);
              if (upstream.status === 402) return json({ error: "AI credits exhausted." }, 402);
              lastError = `AI request failed (${upstream.status}): ${text.slice(0, 200)}`;
              console.error("cbt AI error", provider, model, upstream.status, text);
              continue;
            }

            const data: any = await upstream.json();
            const parsed = parseQuestions(data);
            if (parsed) return json({ subject, questions: parsed });
            lastError = "No questions returned by AI.";
          } catch (err) {
            lastError =
              err instanceof Error && err.name === "AbortError"
                ? "AI request timed out."
                : "AI request failed.";
            console.error("cbt call failed", model, err);
          } finally {
            clearTimeout(timeout);
          }
        }

        return json({ error: lastError }, 502);
      },
    },
  },
});
