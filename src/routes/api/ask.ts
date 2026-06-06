import { createFileRoute } from "@tanstack/react-router";

interface AskBody {
  question?: string;
  imageDataUrl?: string;
  profile?: {
    fullName?: string;
    classLevel?: string;
    examType?: string;
  };
}

const AI_MODELS = ["google/gemini-2.5-flash-lite", "openai/gpt-5-nano"] as const;
const AI_TIMEOUT_MS = 30_000;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseLesson(data: any) {
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  if (typeof args === "object") return args;
  return JSON.parse(args);
}

export const Route = createFileRoute("/api/ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return json({ error: "AI is not configured yet. Please try again shortly." }, 500);
        }

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
        const system = `You are AskTeacha — a calm, patient Nigerian secondary school teacher.
Student profile: name=${profile.fullName ?? "Student"}, class=${profile.classLevel ?? "Unknown"}, exam=${profile.examType ?? "General"}.
Teach in clear, simple English (a bit of friendly Nigerian classroom warmth is fine, never pidgin-only).
Solve the student's question step-by-step using the WAEC/JAMB exam method. Never skip steps. Never be vague.
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

        for (const model of AI_MODELS) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
          try {
            const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              lastError = upstream.status === 404 || upstream.status === 410 ? "AI model unavailable. Trying another route." : "AI request failed.";
              console.error("AI gateway error", model, upstream.status, text);
              continue;
            }

            const data: any = await upstream.json();
            const parsed = parseLesson(data);
            if (parsed) return json(parsed);

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
