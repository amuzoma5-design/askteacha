import { defineMcp } from "@lovable.dev/mcp-js";
import askTeachaTool from "./tools/ask-teacha";

export default defineMcp({
  name: "askteacha-mcp",
  title: "AskTeacha MCP",
  version: "0.1.0",
  instructions:
    "Tools for AskTeacha, a WAEC/JAMB-style AI tutor for Nigerian secondary school students. Use `ask_teacha` to get a structured step-by-step answer for a student's question.",
  tools: [askTeachaTool],
});
