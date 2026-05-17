import fs from "node:fs";
import path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

export enum SystemPromptMode {
  REPLACE = "replace",
  APPEND = "append",
}

export enum PersonaScope {
  GLOBAL = "global",
  PROJECT = "project",
  EPHEMERAL = "ephemeral",
}

export interface PersonaConfig {
  name: string;
  description: string;
  tools: string[];
  systemPromptMode: SystemPromptMode;
  inheritProjectContext: boolean;
  interactive: boolean;
  systemPrompt: string;
}

export interface EphemeralPersona {
  config: PersonaConfig;
}

interface SelectOption {
  value: SystemPromptMode | PersonaScope;
  label: string;
}

const SCOPES: readonly SelectOption[] = [
  { value: PersonaScope.GLOBAL, label: "Global (~/.pi/agent/personas/)" },
  { value: PersonaScope.PROJECT, label: "Project (.pi/personas/)" },
  { value: PersonaScope.EPHEMERAL, label: "Ephemeral (in-memory, cleared on session restart)" },
] as const;

const SYSTEM_PROMPT_MODES: readonly SelectOption[] = [
  { value: SystemPromptMode.REPLACE, label: "Replace — overwrite the entire system prompt" },
  { value: SystemPromptMode.APPEND, label: "Append — add to the end of the system prompt" },
] as const;

function ensureCtx(ctx: ExtensionContext | undefined): ExtensionContext {
  if (!ctx) {
    throw new Error("Extension context is undefined. This may occur in non-interactive modes.");
  }
  if (!ctx.ui) {
    throw new Error("UI is not available in this mode (print/JSON mode). Use interactive mode.");
  }
  return ctx;
}

async function askInput(ctx: ExtensionContext, prompt: string, defaultValue?: string): Promise<string | null> {
  const c = ensureCtx(ctx);
  const result = await c.ui.input(prompt, defaultValue);
  return result;
}

async function askSelect(
  ctx: ExtensionContext,
  prompt: string,
  options: readonly SelectOption[]
): Promise<string | null> {
  const c = ensureCtx(ctx);
  const labels = options.map((o) => o.label);
  const result = await c.ui.select(prompt, labels);
  if (result === null || result === undefined) return null;
  const found = options.find((o) => o.label === result);
  return found ? found.value : null;
}

async function askConfirm(ctx: ExtensionContext, prompt: string): Promise<boolean> {
  const c = ensureCtx(ctx);
  const result = await c.ui.confirm("Persona Wizard", prompt);
  return result;
}

export function generateYaml(config: PersonaConfig): string {
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

function getPersonaFilePath(scope: PersonaScope, name: string): string | null {
  const safeName = name.toLowerCase().replace(/\s+/g, "-");
  if (scope === PersonaScope.GLOBAL) {
    return `~/.pi/agent/personas/${safeName}.yaml`;
  } else if (scope === PersonaScope.PROJECT) {
    return `.pi/personas/${safeName}.yaml`;
  }
  return null; // ephemeral
}

export async function runPersonaWizard(pi: ExtensionAPI, ctx: ExtensionContext): Promise<void> {
  // Validate context upfront
  ensureCtx(ctx);

  try {
    // Step 1: Name
    const name = await askInput(ctx, "Persona name:");
    if (!name) return ctx.ui.notify("Wizard cancelled.", "info");

    // Step 2: Description
    const description = await askInput(ctx, `Description for "${name}" (e.g., "Fast codebase recon"):`);
    if (!description) return ctx.ui.notify("Wizard cancelled.", "info");

    // Step 3: Tools
    const toolsInput = await askInput(
      ctx,
      "Tools (comma-separated, e.g., 'read, grep, find, ls, bash, mcp:chrome-devtools'):",
      "read, grep, find, ls"
    );
    if (!toolsInput) return ctx.ui.notify("Wizard cancelled.", "info");
    const tools = toolsInput.split(",").map((t) => t.trim()).filter(Boolean);

    // Step 4: System prompt mode
    const systemPromptMode = await askSelect(ctx, "System prompt mode:", SYSTEM_PROMPT_MODES);
    if (!systemPromptMode) return ctx.ui.notify("Wizard cancelled.", "info");

    // Step 5: Inherit project context
    const inheritProjectContext = await askConfirm(ctx, "Inherit project context (AGENTS.md files)?");

    // Step 6: Interactive
    const interactive = await askConfirm(ctx, "Is this persona interactive (can prompt the user)?");

    // Step 7: System prompt
    const systemPrompt = await askInput(ctx, "System prompt (press Enter when done):\n");
    if (systemPrompt === null) return ctx.ui.notify("Wizard cancelled.", "info");

    // Step 8: Scope
    const scope = await askSelect(ctx, "Persona scope:", SCOPES);
    if (!scope) return ctx.ui.notify("Wizard cancelled.", "info");

    // Build config
    const config: PersonaConfig = {
      name,
      description,
      tools,
      systemPromptMode: systemPromptMode as SystemPromptMode,
      inheritProjectContext,
      interactive,
      systemPrompt,
    };

    // Handle ephemeral
    if (scope === PersonaScope.EPHEMERAL) {
      pi.appendEntry("ephemeral-persona", config);
      ctx.ui.notify(`✨ Ephemeral persona "${name}" created (in-memory only)`, "success");
      return;
    }

    // Handle file-based personas
    const filePath = getPersonaFilePath(scope as PersonaScope, name);
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
  } catch (error: any) {
    ctx.ui.notify(`Wizard error: ${error.message}`, "error");
  }
}
