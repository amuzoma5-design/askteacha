import { createFileRoute } from "@tanstack/react-router";

const SHEETS_SPREADSHEET_ID = "1TiRqc0658CHn47tY8VbzVMl7moMfZUUGwfekmpKpkeI";
const SHEETS_RANGE = "Feedback!A1";

interface LogBody {
  timestamp?: string;
  userId?: string;
  name?: string;
  classLevel?: string;
  question?: string;
  feedback?: string;
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

export const Route = createFileRoute("/api/public/log-feedback")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const lovableKey = process.env.LOVABLE_API_KEY;
        const sheetsKey = process.env.GOOGLE_SHEETS_API_KEY;
        if (!lovableKey || !sheetsKey) {
          return json({ error: "Feedback not configured" }, 503);
        }

        let body: LogBody;
        try {
          body = (await request.json()) as LogBody;
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }

        const timestamp = (body.timestamp || new Date().toISOString()).slice(0, 64);
        const userId = (body.userId || "").slice(0, 200);
        const name = (body.name || "").slice(0, 200);
        const classLevel = (body.classLevel || "").slice(0, 100);
        const question = (body.question || "").slice(0, 2000);
        const feedbackRaw = (body.feedback || "").toLowerCase();
        const feedback =
          feedbackRaw === "helpful" || feedbackRaw === "not_helpful"
            ? feedbackRaw === "helpful"
              ? "Helpful"
              : "Not Helpful"
            : "";

        if (!feedback) return json({ error: "Invalid feedback" }, 400);

        const gatewayHeaders = {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": sheetsKey,
          "Content-Type": "application/json",
        };
        const values = [[timestamp, userId, name, classLevel, question, feedback]];

        async function append() {
          return fetch(
            `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${SHEETS_SPREADSHEET_ID}/values/${SHEETS_RANGE}:append?valueInputOption=RAW`,
            { method: "POST", headers: gatewayHeaders, body: JSON.stringify({ values }) },
          );
        }

        try {
          let res = await append();
          if (!res.ok) {
            const text = await res.text();
            // Auto-create the "Feedback" tab if it doesn't exist, then retry.
            if (res.status === 400 && text.includes("Unable to parse range")) {
              const createRes = await fetch(
                `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/${SHEETS_SPREADSHEET_ID}:batchUpdate`,
                {
                  method: "POST",
                  headers: gatewayHeaders,
                  body: JSON.stringify({
                    requests: [{ addSheet: { properties: { title: "Feedback" } } }],
                  }),
                },
              );
              if (!createRes.ok) {
                const ct = await createRes.text();
                console.error("Sheets add tab failed", createRes.status, ct);
                return json({ error: "Sheets add tab failed" }, 502);
              }
              res = await append();
              if (!res.ok) {
                const t2 = await res.text();
                console.error("Sheets feedback append retry failed", res.status, t2);
                return json({ error: "Sheets append failed" }, 502);
              }
            } else {
              console.error("Sheets feedback append failed", res.status, text);
              return json({ error: "Sheets append failed", status: res.status }, 502);
            }
          }
          return json({ ok: true });
        } catch (err) {
          console.error("Sheets feedback append error", err);
          return json({ error: "Sheets append error" }, 502);
        }
      },
    },
  },
});
