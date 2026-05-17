import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  runPersonaWizard,
  type PersonaConfig,
  listPersonas,
  loadPersona,
  type LoadedPersona,
} from "./persona-wizard";

// Global state — accessible across all handlers in this extension
let currentPersona: LoadedPersona | null = null;
let originalTools: string[] | null = null;

// Safe read-only tools + web search + MCP
const readerTools = [
  "read",
  "grep",
  "find",
  "ls",
  "web_search",
  "code_search",
  "fetch_content",
  "get_search_content",
  "mcp_adapter",
];

// Ephemeral personas stored in memory (cleared on session restart)
const ephemeralPersonas: Map<string, PersonaConfig> = new Map();

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("Hello, World! Persona extension is active.", "info");
  });

  pi.on("session_shutdown", async (event, _ctx) => {
    // Clear ephemeral personas on session restart
    if (event.reason === "new" || event.reason === "resume" || event.reason === "fork") {
      ephemeralPersonas.clear();
    }
  });

  pi.on("before_agent_start", async (event, ctx) => {
    ctx.ui.setWidget("persona", [
      "👋 before_agent_start fired!",
      `Prompt: ${event.prompt}`,
      `Current persona: ${currentPersona?.name || "none"}`,
    ]);

    // Inject persona system prompt if active
    if (currentPersona) {
      const personaPrompt = currentPersona.systemPrompt;
      if (currentPersona.systemPromptMode === "append") {
        return { systemPrompt: `${event.systemPrompt}\n\n---\n\n${personaPrompt}` };
      }
      return { systemPrompt: personaPrompt };
    }

    return { systemPrompt: event.systemPrompt };
  });

  pi.on("before_provider_request", async (event, _ctx) => {
    // console.log(JSON.stringify(event.payload, null, 2)); only uncomment when debugging
  });

  // Register /persona command
  pi.registerCommand("persona", {
    description: "Manage personas — /persona create, /persona list, /persona reader, /persona <name>",
    getArgumentCompletions: (prefix: string) => {
      const personas = listPersonas(ephemeralPersonas);
      const suggestions = ["create", "list", "reader", ...personas.map((p) => p.name)];
      const filtered = suggestions.filter((s) => s.startsWith(prefix));
      return filtered.map((s) => ({ value: s, label: s }));
    },
    handler: async (args, ctx) => {
      const trimmed = args?.trim() || "";

      // Handle /persona create
      if (trimmed === "create") {
        await runPersonaWizard(pi, ctx);
        return;
      }

      // Handle /persona list
      if (trimmed === "list") {
        const personas = listPersonas(ephemeralPersonas);
        if (personas.length === 0) {
          ctx.ui.notify("No personas found. Create one with /persona create", "info");
        } else {
          const lines = personas.map((p) => `  ${p.name} — ${p.description || "(no description)"}`);
          ctx.ui.setWidget("persona-list", [
            `Found ${personas.length} persona(s):`,
            ...lines,
            "",
            "Use /persona <name> to activate, /persona none to clear.",
          ]);
        }
        return;
      }

      // Handle /persona reader (built-in read-only mode)
      if (trimmed === "reader") {
        if (currentPersona?.scope === "reader") {
          // Deactivate reader
          if (originalTools) {
            pi.setActiveTools(originalTools);
          }
          currentPersona = null;
          ctx.ui.notify("Original tools restored", "info");
        } else {
          // Activate reader
          originalTools = pi.getAllTools().map((t) => t.name);
          currentPersona = { name: "reader", description: "Read-only mode", tools: readerTools, systemPromptMode: "replace", inheritProjectContext: false, interactive: false, systemPrompt: "" } as LoadedPersona;
          pi.setActiveTools(readerTools);
          ctx.ui.notify("📖 Reader persona active — read-only tools enabled", "info");
        }
        return;
      }

      // If switching away from reader, restore original tools
      if (currentPersona?.scope === "reader" && trimmed !== "reader") {
        if (originalTools) {
          pi.setActiveTools(originalTools);
        }
        currentPersona = null;
      }

      // Handle ephemeral personas
      if (ephemeralPersonas.has(trimmed)) {
        const persona = ephemeralPersonas.get(trimmed)!;
        currentPersona = {
          ...persona,
          scope: "ephemeral",
        } as LoadedPersona;
        originalTools = pi.getAllTools().map((t) => t.name);
        pi.setActiveTools(persona.tools);
        ctx.ui.notify(`✅ Activated ephemeral persona: ${persona.name}`, "success");
        return;
      }

      // Clear persona
      if (trimmed === "" || trimmed === "none") {
        if (currentPersona?.scope === "reader" || (currentPersona && originalTools)) {
          if (currentPersona?.scope === "reader") {
            pi.setActiveTools(originalTools);
          }
        }
        currentPersona = null;
        ctx.ui.notify("Persona cleared", "info");
        return;
      }

      // Try to load file-based persona
      const loaded = loadPersona(trimmed);
      if (loaded) {
        const allTools = pi.getAllTools();
        const availableToolNames = allTools.map((t) => t.name);
        const personaTools = loaded.tools.filter((t) => availableToolNames.includes(t));

        originalTools = pi.getAllTools().map((t) => t.name);
        originalSystemPrompt = event?.systemPrompt || null;

        if (personaTools.length > 0) {
          pi.setActiveTools(personaTools);
        }

        currentPersona = loaded;
        ctx.ui.notify(
          `✅ Activated persona "${loaded.name}" (${loaded.scope}) — ${loaded.tools.length} tools, system prompt ${loaded.systemPromptMode === "append" ? "appended" : "replacing"}`,
          "success",
        );
        return;
      }

      // Unknown persona
      ctx.ui.notify(`❌ Unknown persona: ${trimmed}. Run /persona list to see available personas.`, "error");
    },
  });
}
