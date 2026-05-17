import fs from "node:fs";
import path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

export interface PersonaConfig {
  name: string;
  description: string;
  tools: string[];
  systemPromptMode: "replace" | "append";
  inheritProjectContext: boolean;
  interactive: boolean;
  systemPrompt: string;
}

export interface EphemeralPersona {
  config: PersonaConfig;
}

const SCOPES = [
  { value: "global", label: "Global (~/.pi/agent/personas/)" },
  { value: "project", label: "Project (.pi/personas/)" },
  { value: "ephemeral", label: "Ephemeral (in-memory, cleared on session restart)" },
] as const;

const SYSTEM_PROMPT_MODES = [
  { value: "replace" as const, label: "Replace — overwrite the entire system prompt" },
  { value: "append" as const, label: "Append — add to the end of the system prompt" },
] as const;

async function askInput(prompt: string, ctx: ExtensionContext, defaultValue?: string): Promise<string | null> {
  const result = await ctx.ui.input(prompt, defaultValue);
  return result;
}

async function askSelect(prompt: string, options: Array<{ value: string; label: string }>, ctx: ExtensionContext): Promise<string | null> {
  const labels = options.map((o) => o.label);
  const result = await ctx.ui.select(prompt, labels);
  if (result === null || result < 0) return null;
  return options[result].value;
}

async function askConfirm(prompt: string, ctx: ExtensionContext): Promise<boolean> {
  const result = await ctx.ui.confirm("Persona Wizard", prompt);
  return result;
}

function generateYaml(config: PersonaConfig): string {
  const toolsStr = config.tools.join(", ");
  return `---
name: ${config.name}
description: ${config.description}
tools: ${toolsStr}
systemPromptMode: ${config.systemPromptMode}
inheritProjectContext: ${config.inheritProjectContext}
interactive: ${config.interactive}
---

${config.systemPrompt}`;
}

function getPersonaFilePath(scope: string, name: string): string | null {
  if (scope === "global") {
    return `~/.pi/agent/personas/${name}.yaml`;
  } else if (scope === "project") {
    return `.pi/personas/${name}.yaml`;
  }
  return null; // ephemeral
}

export async function runPersonaWizard(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
  // Step 1: Name
  const name = await askInput("Persona name:", ctx);
  if (!name) return ctx.ui.notify("Wizard cancelled.", "info");

  // Step 2: Description
  const description = await askInput(`Description for "${name}" (e.g., "Fast codebase recon"):`);
  if (!description) return ctx.ui.notify("Wizard cancelled.", "info");

  // Step 3: Tools
  const toolsInput = await askInput(
    "Tools (comma-separated, e.g., 'read, grep, find, ls, bash, mcp:chrome-devtools'):",
    ctx,
    "read, grep, find, ls"
  );
  if (!toolsInput) return ctx.ui.notify("Wizard cancelled.", "info");
  const tools = toolsInput.split(",").map((t) => t.trim()).filter(Boolean);

  // Step 4: System prompt mode
  const systemPromptMode = await askSelect(
    "System prompt mode:",
    SYSTEM_PROMPT_MODES,
    ctx
  );
  if (!systemPromptMode) return ctx.ui.notify("Wizard cancelled.", "info");

  // Step 5: Inherit project context
  const inheritProjectContext = await askConfirm(
    "Inherit project context (AGENTS.md files)?",
    ctx
  );

  // Step 6: Interactive
  const interactive = await askConfirm(
    "Is this persona interactive (can prompt the user)?",
    ctx
  );

  // Step 7: System prompt
  const systemPrompt = await askInput(
    "System prompt (press Enter when done):\n",
    ctx
  );
  if (systemPrompt === null) return ctx.ui.notify("Wizard cancelled.", "info");

  // Step 8: Scope
  const scope = await askSelect(
    "Persona scope:",
    SCOPES,
    ctx
  );
  if (!scope) return ctx.ui.notify("Wizard cancelled.", "info");

  // Build config
  const config: PersonaConfig = {
    name,
    description,
    tools,
    systemPromptMode: systemPromptMode as "replace" | "append",
    inheritProjectContext,
    interactive,
    systemPrompt,
  };

  // Handle ephemeral
  if (scope === "ephemeral") {
    // Store in memory using pi.appendEntry for persistence across reloads
    // but it will be cleared on session restart (as requested)
    const entryId = pi.appendEntry("ephemeral-persona", config);
    ctx.ui.notify(`✨ Ephemeral persona "${name}" created (in-memory only)`, "success");
    return;
  }

  // Handle file-based personas
  const filePath = getPersonaFilePath(scope, name);
  if (!filePath) return;

  const yaml = generateYaml(config);

  // Ensure directory exists
  const resolvedPath = filePath.replace("~", process.env.HOME || "");
  const dir = path.dirname(resolvedPath);
  fs.mkdirSync(dir, { recursive: true });

  // Write the file
  try {
    fs.writeFileSync(resolvedPath, yaml, "utf-8");
    ctx.ui.notify(`✨ Persona "${name}" created at ${filePath}`, "success");
  } catch (error: any) {
    ctx.ui.notify(`Failed to save persona: ${error.message}`, "error");
  }
}
