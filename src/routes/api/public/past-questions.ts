import { createFileRoute } from "@tanstack/react-router";

interface Body {
  examType?: string;
  subject?: string;
  year?: string;
  count?: number;
}

const LOVABLE_MODELS = ["google/gemini-2.5-flash-lite", "google/gemini-2.5-flash"] as const;
const OPENAI_MODELS = ["gpt-4o-mini"] as const;
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash-latest"] as const;
const AI_TIMEOUT_MS = 30_000;

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

function parseBank(data: any): string[] | null {
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  const obj = typeof args === "object" ? args : JSON.parse(args);
  const qs = obj?.questions;
  if (!Array.isArray(qs)) return null;
  return qs.map((q: any) => String(q)).filter((q: string) => q.trim().length > 0);
}

export const Route = createFileRoute("/api/public/past-questions")({
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
          provider === "gemini" ? GEMINI_MODELS : provider === "openai" ? OPENAI_MODELS : LOVABLE_MODELS;

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const examType = (body.examType ?? "WAEC").trim().slice(0, 40);
        const subject = (body.subject ?? "Mathematics").trim().slice(0, 60);
        const year = (body.year ?? "").trim().slice(0, 10);
        const count = Math.max(3, Math.min(10, Number(body.count) || 6));

        const system = `You are an expert Nigerian ${examType} examiner for ${subject}.
Generate realistic ${examType}-style past questions${year ? ` in the style of ${year}` : ""} for Nigerian secondary school students (SS1-SS3).
Questions must match the real ${examType} standard: correct topics, difficulty, phrasing and format.
For Mathematics/Physics/Chemistry, include numbers/values so the question is fully solvable.
Do NOT include answers or solutions. Do NOT number the questions. Return one clear question per array item.
You MUST respond by calling the tool 'deliver_questions'.`;

        const tool = {
          type: "function",
          function: {
            name: "deliver_questions",
            description: "Return an array of exam questions.",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: { type: "string" },
                  description: `Exactly ${count} ${examType} ${subject} questions.`,
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        };

        let lastError = "Could not generate questions right now.";

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
                    content: `Give me ${count} ${examType} ${subject}${year ? ` (${year})` : ""} past-style questions.`,
                  },
                ],
                tools: [tool],
                tool_choice: { type: "function", function: { name: "deliver_questions" } },
              }),
            });

            if (!upstream.ok) {
              const text = await upstream.text();
              if (upstream.status === 429) return json({ error: "Too many requests. Please wait a moment." }, 429);
              if (upstream.status === 402) return json({ error: "AI credits exhausted." }, 402);
              lastError = `AI request failed (${upstream.status}): ${text.slice(0, 200)}`;
              console.error("past-questions AI error", provider, model, upstream.status, text);
              continue;
            }

            const data: any = await upstream.json();
            const parsed = parseBank(data);
            if (parsed && parsed.length > 0) {
              return json({ examType, subject, year, questions: parsed });
            }
            lastError = "No questions returned by AI.";
          } catch (err) {
            lastError =
              err instanceof Error && err.name === "AbortError"
                ? "AI request timed out."
                : "AI request failed.";
            console.error("past-questions call failed", model, err);
          } finally {
            clearTimeout(timeout);
          }
        }

        return json({ error: lastError }, 502);
      },
    },
  },
});
