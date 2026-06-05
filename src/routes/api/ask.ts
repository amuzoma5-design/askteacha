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

export const Route = createFileRoute("/api/ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: AskBody;
        try {
          body = (await request.json()) as AskBody;
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
        }

        const question = (body.question ?? "").trim().slice(0, 4000);
        const imageDataUrl = body.imageDataUrl;
        if (!question && !imageDataUrl) {
          return new Response(JSON.stringify({ error: "Provide a question or image" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
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

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
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
          let msg = "AI request failed";
          if (upstream.status === 429) msg = "Too many requests. Please wait a moment.";
          else if (upstream.status === 402)
            msg = "AI credits exhausted. Please add credits in workspace settings.";
          console.error("AI gateway error", upstream.status, text);
          return new Response(JSON.stringify({ error: msg }), {
            status: upstream.status,
            headers: { "Content-Type": "application/json" },
          });
        }

        const data: any = await upstream.json();
        const call = data?.choices?.[0]?.message?.tool_calls?.[0];
        if (!call?.function?.arguments) {
          return new Response(JSON.stringify({ error: "No structured response" }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }
        let parsed: any;
        try {
          parsed = JSON.parse(call.function.arguments);
        } catch {
          return new Response(JSON.stringify({ error: "Bad AI response" }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify(parsed), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
