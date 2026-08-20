import { createFileRoute } from "@tanstack/react-router";
import { tutorSystemPrompt, type LearnerPayload } from "@/lib/tutor-prompt";

interface AskBody {
  question?: string;
  imageDataUrl?: string;
  profile?: {
    fullName?: string;
    classLevel?: string;
    examType?: string;
  };
  learner?: LearnerPayload;
}

const LOVABLE_MODELS = ["google/gemini-2.5-flash-lite", "openai/gpt-5-nano"] as const;
const OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o"] as const;
const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash",
] as const;
const AI_TIMEOUT_MS = 30_000;

const SHEETS_SPREADSHEET_ID = "1TiRqc0658CHn47tY8VbzVMl7moMfZUUGwfekmpKpkeI";
const SHEETS_RANGE = "Questions!A1";

async function logToAnalytics(row: { question: string; subject: string; userId: string }) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const sheetsKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovableKey || !sheetsKey) return;
  try {
    const res = await fetch(
      `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${SHEETS_SPREADSHEET_ID}/values/${SHEETS_RANGE}:append?valueInputOption=RAW`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": sheetsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[new Date().toISOString(), row.userId, row.question, row.subject, "web"]],
        }),
      },
    );
    if (!res.ok) console.error("Sheets append failed", res.status, await res.text());
  } catch (err) {
    console.error("Sheets append error", err);
  }
}


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

function parseLesson(data: any) {
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  if (typeof args === "object") return args;
  return JSON.parse(args);
}

export const Route = createFileRoute("/api/public/ask")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const geminiKey = process.env.GEMINI_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;
        const lovableKey = process.env.LOVABLE_API_KEY;
        const key = geminiKey || openaiKey || lovableKey;
        if (!key) {
          return json({ error: "AI is not configured yet. Please try again shortly." }, 500);
        }
        const provider: "gemini" | "openai" | "lovable" = geminiKey
          ? "gemini"
          : openaiKey
            ? "openai"
            : "lovable";
        const endpoint =
          provider === "gemini"
            ? "https://generativelanguage.openai.azure.com/v1/chat/completions" // placeholder, overridden below
            : provider === "openai"
              ? "https://api.openai.com/v1/chat/completions"
              : "https://ai.gateway.lovable.dev/v1/chat/completions";
        const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        const models =
          provider === "gemini" ? GEMINI_MODELS : provider === "openai" ? OPENAI_MODELS : LOVABLE_MODELS;

        let body: AskBody;
        try {
          body = (await request.json()) as AskBody;
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const question = (body.question ?? "").trim().slice(0, 4000);
        const imageDataUrl = body.imageDataUrl;
        if (!question && !imageDataUrl) {
          return json({ error: "Provide a question or image" }, 400);
        }

        const profile = body.profile ?? {};
        const learner: LearnerPayload = {
          fullName: profile.fullName,
          classLevel: profile.classLevel,
          examType: profile.examType,
          ...(body.learner ?? {}),
        };
        const system = `${tutorSystemPrompt(learner)}

You MUST respond by calling the tool 'deliver_lesson' with the structured fields. Do not write any text outside the tool call.`;

        const userContent: any[] = [];
        if (question) userContent.push({ type: "text", text: question });
        if (imageDataUrl) {
          userContent.push({ type: "image_url", image_url: { url: imageDataUrl } });
          if (!question) {
            userContent.unshift({
              type: "text",
              text: "Solve the question shown in this image.",
            });
          }
        }

        const tool = {
          type: "function",
          function: {
            name: "deliver_lesson",
            description: "Deliver a structured tutoring answer.",
            parameters: {
              type: "object",
              properties: {
                subject: {
                  type: "string",
                  description: "Subject tag, e.g. Mathematics, Physics, English, Biology.",
                },
                finalAnswer: {
                  type: "string",
                  description: "The clear final answer (1-3 sentences, bold-worthy).",
                },
                explanation: {
                  type: "string",
                  description: "Simple plain-language breakdown for the student.",
                },
                examMethod: {
                  type: "array",
                  items: { type: "string" },
                  description: "Ordered step-by-step exam-style solution steps.",
                },
                commonMistakes: {
                  type: "array",
                  items: { type: "string" },
                  description: "Typical mistakes students make on this kind of question.",
                },
                practice: {
                  type: "array",
                  description: "2-3 similar practice questions with answers.",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      answer: { type: "string" },
                    },
                    required: ["question", "answer"],
                    additionalProperties: false,
                  },
                },
              },
              required: [
                "subject",
                "finalAnswer",
                "explanation",
                "examMethod",
                "commonMistakes",
                "practice",
              ],
              additionalProperties: false,
            },
          },
        };

        let lastError = "Could not get an answer right now. Please try again.";

        for (const model of models) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
          try {
            const upstream = await fetch(provider === "gemini" ? geminiEndpoint : endpoint, {
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
                  { role: "user", content: userContent },
                ],
                tools: [tool],
                tool_choice: { type: "function", function: { name: "deliver_lesson" } },
              }),
            });

            if (!upstream.ok) {
              const text = await upstream.text();
              if (upstream.status === 429) return json({ error: "Too many requests. Please wait a moment." }, 429);
              if (upstream.status === 402) return json({ error: "AI credits exhausted. Please add credits in workspace settings." }, 402);
              const snippet = text.slice(0, 200);
              lastError =
                upstream.status === 404 || upstream.status === 410
                  ? `Model ${model} unavailable (${upstream.status}).`
                  : `AI request failed (${upstream.status}): ${snippet}`;
              console.error("AI gateway error", provider, model, upstream.status, text);
              continue;
            }

            const data: any = await upstream.json();
            const parsed = parseLesson(data);
            if (parsed) {
              return json(parsed);
            }




            lastError = "No structured response from AI.";
            console.error("AI gateway returned no structured lesson", model, data);
          } catch (error) {
            lastError = error instanceof Error && error.name === "AbortError" ? "AI request timed out." : "AI request failed.";
            console.error("AI gateway call failed", model, error);
          } finally {
            clearTimeout(timeout);
          }
        }

        return json({ error: lastError }, 502);
      },
    },
  },
});
