import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  runPersonaWizard,
  type PersonaConfig,
  listPersonas,
  type LoadedPersona,
} from "./persona-wizard";
import { loadPersona, deletePersona, DeleteScope, getScopeEmoji } from "./utils";
import { PersonaIndicator } from "./persona-indicator";

// Global state — accessible across all handlers in this extension
let currentPersona: LoadedPersona | null = null;
let originalTools: string[] | null = null;

// Ephemeral personas stored in memory (cleared on session restart)
const ephemeralPersonas: Map<string, PersonaConfig> = new Map();

export default function (pi: ExtensionAPI) {
  pi.on("session_shutdown", async (event, _ctx) => {
    // Clear ephemeral personas on session restart
    if (event.reason === "new" || event.reason === "resume" || event.reason === "fork") {
      ephemeralPersonas.clear();
    }
  });

  pi.on("before_agent_start", async (event, ctx) => {
    ctx.ui.setWidget("persona", (_tui, theme) => {
      const indicator = new PersonaIndicator(currentPersona);
      const lines = indicator.render(80);

      if (lines.length === 0) {
        return { render: () => [], invalidate: () => {} };
      }

      return {
        render: () => lines,
        invalidate: () => {
          indicator.invalidate();
        },
      };
    });

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
    // console.log(JSON.stringify(event.payload, null, 2)); // only uncomment when debugging
  });

  // Register /persona command
  pi.registerCommand("persona", {
    description: "Manage personas — /persona create, /persona list, /persona <name>",
    getArgumentCompletions: (prefix: string) => {
      const personas = listPersonas(ephemeralPersonas);

      // If prefix starts with "delete ", show persona options for deletion with scope emojis
      if (prefix.startsWith("delete ")) {
        const search = prefix.slice(7).trim();
        const filtered = personas.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
        return filtered.map((p) => ({ value: `delete ${p.name}`, label: `${getScopeEmoji(p.scope)} ${p.name}` }));
      }

      // Otherwise show command suggestions + personas
      const suggestions = ["create", "list", "delete", ...personas.map((p) => `[persona] ${p.name}`)];
      const filtered = suggestions.filter((s) => s.startsWith(prefix));
      return filtered.map((s) => ({ value: s.replace(/^\[persona\] /, ""), label: s }));
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

      // Handle /persona delete
      if (trimmed === "delete") {
        ctx.ui.notify("Usage: /persona delete <persona-name>", "warn");
        return;
      }

      // Handle /persona delete <name>
      if (trimmed.startsWith("delete ")) {
        const personaName = trimmed.slice(7).trim();
        if (!personaName) {
          ctx.ui.notify("Usage: /persona delete <persona-name>", "warn");
          return;
        }

        // Check if currently active persona matches
        if (currentPersona && currentPersona.name === personaName) {
          currentPersona = null;
          if (originalTools) {
            pi.setActiveTools(originalTools);
          }
        }

        // Try to delete from global scope
        let result = deletePersona(personaName, DeleteScope.GLOBAL);
        if (!result.success) {
          // Try project scope
          result = deletePersona(personaName, DeleteScope.PROJECT);
        }

        ctx.ui.notify(result.message, result.success ? "success" : "error");
        return;
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
        if (originalTools) {
          pi.setActiveTools(originalTools);
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
