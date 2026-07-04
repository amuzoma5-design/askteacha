import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const AI_MODELS = ["google/gemini-2.5-flash-lite", "openai/gpt-5-nano"] as const;
const AI_TIMEOUT_MS = 30_000;

const toolSchema = {
  type: "function",
  function: {
    name: "deliver_lesson",
    description: "Deliver a structured tutoring answer.",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string" },
        finalAnswer: { type: "string" },
        explanation: { type: "string" },
        examMethod: { type: "array", items: { type: "string" } },
        commonMistakes: { type: "array", items: { type: "string" } },
        practice: {
          type: "array",
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

function parseLesson(data: any) {
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  if (typeof args === "object") return args;
  try {
    return JSON.parse(args);
  } catch {
    return null;
  }
}

export default defineTool({
  name: "ask_teacha",
  title: "Ask AskTeacha",
  description:
    "Ask AskTeacha a WAEC/JAMB-style secondary school question and receive a structured step-by-step answer including final answer, explanation, exam method steps, common mistakes, and practice questions.",
  inputSchema: {
    question: z
      .string()
      .min(1)
      .max(4000)
      .describe("The student's question in plain English."),
    classLevel: z
      .string()
      .optional()
      .describe("Optional student class level, e.g. 'SS2'."),
    examType: z
      .string()
      .optional()
      .describe("Optional exam context, e.g. 'WAEC', 'JAMB', 'General'."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async ({ question, classLevel, examType }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        content: [{ type: "text", text: "AI is not configured yet." }],
        isError: true,
      };
    }

    const system = `You are AskTeacha — a calm, patient Nigerian secondary school teacher.
Student profile: class=${classLevel ?? "Unknown"}, exam=${examType ?? "General"}.
Teach in clear, simple English. Solve the question step-by-step using the WAEC/JAMB exam method.
You MUST respond by calling the tool 'deliver_lesson' with the structured fields.`;

    let lastError = "Could not get an answer right now.";

    for (const model of AI_MODELS) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
      try {
        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
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
                { role: "user", content: question },
              ],
              tools: [toolSchema],
              tool_choice: {
                type: "function",
                function: { name: "deliver_lesson" },
              },
            }),
          },
        );

        if (!upstream.ok) {
          lastError = `AI request failed (${upstream.status}).`;
          continue;
        }

        const data: any = await upstream.json();
        const parsed = parseLesson(data);
        if (parsed) {
          return {
            content: [{ type: "text", text: JSON.stringify(parsed, null, 2) }],
            structuredContent: parsed,
          };
        }
        lastError = "No structured response from AI.";
      } catch (error) {
        lastError =
          error instanceof Error && error.name === "AbortError"
            ? "AI request timed out."
            : "AI request failed.";
      } finally {
        clearTimeout(timeout);
      }
    }

    return {
      content: [{ type: "text", text: lastError }],
      isError: true,
    };
  },
});
