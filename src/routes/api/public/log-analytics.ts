import { createFileRoute } from "@tanstack/react-router";

const SHEETS_SPREADSHEET_ID = "1TiRqc0658CHn47tY8VbzVMl7moMfZUUGwfekmpKpkeI";
const SHEETS_RANGE = "Questions!A1";

interface LogBody {
  timestamp?: string;
  userId?: string;
  name?: string;
  classLevel?: string;
  question?: string;
  subject?: string;
  platform?: string;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/log-analytics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lovableKey = process.env.LOVABLE_API_KEY;
        const sheetsKey = process.env.GOOGLE_SHEETS_API_KEY;
        if (!lovableKey || !sheetsKey) {
          return json({ error: "Analytics not configured" }, 503);
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
        const subject = (body.subject || "Unknown").slice(0, 100);
        const platform = (body.platform || "web").slice(0, 50);

        if (!question) return json({ error: "Missing question" }, 400);

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
                values: [[timestamp, userId, name, classLevel, question, subject, platform]],
              }),
            },
          );
          if (!res.ok) {
            const text = await res.text();
            console.error("Sheets append failed", res.status, text);
            return json({ error: "Sheets append failed", status: res.status }, 502);
          }
          return json({ ok: true });
        } catch (err) {
          console.error("Sheets append error", err);
          return json({ error: "Sheets append error" }, 502);
        }
      },
    },
  },
});
