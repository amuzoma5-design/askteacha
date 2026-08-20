import { createFileRoute } from "@tanstack/react-router";
import { studentDossier, type LearnerPayload } from "@/lib/tutor-prompt";

const LOVABLE_MODELS = ["google/gemini-2.5-flash-lite", "openai/gpt-5-nano"] as const;
const OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o"] as const;
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

const tool = {
  type: "function",
  function: {
    name: "deliver_guidance",
    description: "Give this specific student a personal study plan for today.",
    parameters: {
      type: "object",
      properties: {
        greeting: {
          type: "string",
          description:
            "One warm sentence addressing the student by first name, referencing something real from their file.",
        },
        focusToday: {
          type: "string",
          description: "The single topic they should focus on today, with a one-line reason.",
        },
        steps: {
          type: "array",
          items: { type: "string" },
          description: "3-4 short concrete actions for today's study session.",
        },
        suggestedQuestions: {
          type: "array",
          items: { type: "string" },
          description:
            "3 questions this student should ask AskTeacha next, targeted at their weak areas and exam.",
        },
        careerTip: {
          type: "string",
          description:
            "One sentence linking today's work to their career/course goal and target score.",
        },
      },
      required: ["greeting", "focusToday", "steps", "suggestedQuestions", "careerTip"],
      additionalProperties: false,
    },
  },
};

function parseGuidance(data: any) {
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  if (typeof args === "object") return args;
  try {
    return JSON.parse(args);
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/guide")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const geminiKey = process.env.GEMINI_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;
        const lovableKey = process.env.LOVABLE_API_KEY;
        const key = geminiKey || openaiKey || lovableKey;
        if (!key) return json({ error: "AI is not configured yet." }, 500);

        const endpoint = geminiKey
          ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
          : openaiKey
            ? "https://api.openai.com/v1/chat/completions"
            : "https://ai.gateway.lovable.dev/v1/chat/completions";
        const models = geminiKey ? GEMINI_MODELS : openaiKey ? OPENAI_MODELS : LOVABLE_MODELS;

        let learner: LearnerPayload = {};
        try {
          const body = (await request.json()) as { learner?: LearnerPayload };
          learner = body.learner ?? {};
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const system = `You are AskTeacha, the personal Nigerian secondary school tutor of this student. You already know them.

${studentDossier(learner)}

Give them a short, practical plan for today. Be specific to THIS student — their weak subjects, saved mistakes, exam timeline and career goal. No generic advice.
You MUST respond by calling the tool 'deliver_guidance'. Do not write text outside the tool call.`;

        let lastError = "Could not build your plan right now.";

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
                  { role: "user", content: "What should I focus on today?" },
                ],
                tools: [tool],
                tool_choice: { type: "function", function: { name: "deliver_guidance" } },
              }),
            });

            if (!upstream.ok) {
              const text = await upstream.text();
              if (upstream.status === 429)
                return json({ error: "Too many requests. Please wait a moment." }, 429);
              if (upstream.status === 402)
                return json({ error: "AI credits exhausted." }, 402);
              lastError = `AI request failed (${upstream.status}).`;
              console.error("guide error", model, upstream.status, text.slice(0, 300));
              continue;
            }

            const parsed = parseGuidance(await upstream.json());
            if (parsed) return json(parsed);
            lastError = "No structured guidance from AI.";
          } catch (error) {
            lastError =
              error instanceof Error && error.name === "AbortError"
                ? "Request timed out."
                : "Request failed.";
          } finally {
            clearTimeout(timeout);
          }
        }

        return json({ error: lastError }, 502);
      },
    },
  },
});
