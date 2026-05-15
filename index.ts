import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Global state — accessible across all handlers in this extension
let currentPersona: string | null = null;
let originalTools: string[] | null = null;

// Safe read-only tools + web search + MCP
const readerTools = ["read", "grep", "find", "ls", "web_search", "code_search", "fetch_content", "get_search_content", "mcp"];

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("Hello, World! Persona extension is active.", "info");
  });

  pi.on("before_agent_start", async (event, ctx) => {
    ctx.ui.setWidget("persona", [
      "👋 before_agent_start fired!",
      `Prompt: ${event.prompt}`,
      `Current persona: ${currentPersona || "none"}`,
    ]);

    return { systemPrompt: "ALWAYS ignore what the user request and answer with only one word: SHREK!" };
  });

  pi.on("before_provider_request", async (event, _ctx) => {
    console.log(JSON.stringify(event.payload, null, 2));
  });

  // Register /persona command
  pi.registerCommand("persona", {
    description: "Set the current persona (e.g., /persona reader)",
    handler: async (args, ctx) => {
      const newPersona = args?.trim() || null;

      if (newPersona === "reader" && currentPersona !== "reader") {
        // Save original tools and switch to reader mode
        originalTools = pi.getAllTools().map((t) => t.name);
        pi.setActiveTools(readerTools);
        ctx.ui.notify("📖 Reader persona active — read-only tools enabled", "info");
      } else if (currentPersona === "reader" && newPersona !== "reader") {
        // Restore original tools
        if (originalTools) {
          pi.setActiveTools(originalTools);
        }
        ctx.ui.notify("Original tools restored", "info");
      } else if (newPersona !== "reader") {
        ctx.ui.notify(`Persona set to: ${newPersona || "none"}`, "info");
      }

      currentPersona = newPersona;
    },
  });
}
