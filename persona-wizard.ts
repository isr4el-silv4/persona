import fs from "node:fs";
import path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { MultiSelectList, type MultiSelectItem } from "./multi-select-list";
import { Container, Text, type Component } from "@earendil-works/pi-tui";

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

export interface PersonaListItem {
  name: string;
  description: string;
  scope: "global" | "project" | "ephemeral";
}

export interface LoadedPersona extends PersonaConfig {
  scope: "global" | "project" | "ephemeral";
  filePath?: string;
}

// Re-export from utils for backward compatibility
export { loadPersona } from "./utils";

// Import parseYamlFrontmatter for listPersonas
import { parseYamlFrontmatter as _parseYaml } from "./utils";

export function listPersonas(ephemeral: Map<string, PersonaConfig>): PersonaListItem[] {
  const personas: PersonaListItem[] = [];

  // List global personas
  const globalDir = path.join(process.env.HOME || "", ".pi", "agent", "personas");
  try {
    if (fs.existsSync(globalDir)) {
      const files = fs.readdirSync(globalDir).filter((f) => f.endsWith(".yaml"));
      for (const file of files) {
        const filePath = path.join(globalDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = _parseYaml(content);
        personas.push({
          name: parsed.name || file.replace(".yaml", ""),
          description: parsed.description || "",
          scope: "global",
        });
      }
    }
  } catch {
    // Ignore errors reading global directory
  }

  // List project personas
  const projectDir = path.join(process.cwd(), ".pi", "personas");
  try {
    if (fs.existsSync(projectDir)) {
      const files = fs.readdirSync(projectDir).filter((f) => f.endsWith(".yaml"));
      for (const file of files) {
        const filePath = path.join(projectDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const parsed = _parseYaml(content);
        personas.push({
          name: parsed.name || file.replace(".yaml", ""),
          description: parsed.description || "",
          scope: "project",
        });
      }
    }
  } catch {
    // Ignore errors reading project directory
  }

  // List ephemeral personas
  for (const [name, ep] of ephemeral) {
    personas.push({
      name,
      description: ep.description || "",
      scope: "ephemeral",
    });
  }

  return personas;
}

interface SelectOption {
  value: SystemPromptMode | PersonaScope;
  label: string;
}

// Only allow letters, numbers, hyphens, and underscores
const PERSONA_NAME_REGEX = /^[a-z0-9_-]+$/;

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

async function askToolsSelect(pi: ExtensionAPI, ctx: ExtensionContext): Promise<string[]> {
  const c = ensureCtx(ctx);
  const allTools = await pi.getAllTools();
  const items: MultiSelectItem[] = allTools.map((tool: { name: string }) => ({
    value: tool.name,
    label: tool.name,
  }));

  // Default: select read, grep, find, ls
  const defaultTools = ["read", "grep", "find", "ls"];
  const selected = new Set(items.filter((i) => defaultTools.includes(i.value)).map((i) => i.value));

  return new Promise<string[]>((resolve) => {
    const multiSelect = new MultiSelectList(items, Math.min(15, items.length), {
      selectedPrefix: (s: string) => `\x1b[32m${s}\x1b[0m`,
      unselectedPrefix: (s: string) => `\x1b[90m${s}\x1b[0m`,
      selectedText: (s: string) => `\x1b[32m${s}\x1b[0m`,
      unselectedText: (s: string) => s,
    });

    // Override the default selected set
    multiSelect.selected = selected;

    const helpText = "↑↓ navigate • space toggle • ctrl+a select all • enter continue • esc cancel";

    multiSelect.onEmpty = () => {
      ctx.ui.notify("At least 1 tool must be selected.", "error");
    };

    c.ui.custom((tui: any, theme: any, _kb: any, done: (result: any) => void) => {
      const container = new Container();

      // Title
      container.addChild(new Text(theme.fg("accent", "Select tools for this persona"), 1, 0));
      container.addChild(new Text(theme.fg("dim", helpText), 1, 0));

      // Multi-select list
      container.addChild(multiSelect);

      multiSelect.onSelect = () => {
        const values = multiSelect.getSelectedValues();
        if (values.length === 0) {
          multiSelect.onEmpty?.();
          return;
        }
        done(null);
        resolve(values);
      };
      multiSelect.onCancel = () => {
        const values = multiSelect.getSelectedValues();
        done(null);
        resolve(values);
      };

      return {
        render: (width: number) => container.render(width),
        invalidate: () => container.invalidate(),
        handleInput: (data: string) => {
          multiSelect.handleInput?.(data);
          tui.requestRender();
        },
      };
    });
  });
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
    const name = await askInput(ctx, "Persona name (letters, numbers, -, _ only):", "my-persona");
    if (!name) return ctx.ui.notify("Wizard cancelled.", "info");
    const sanitizedName = name.toLowerCase().replace(/\s+/g, "-");
    if (!PERSONA_NAME_REGEX.test(sanitizedName)) {
      ctx.ui.notify("Invalid name. Only letters, numbers, hyphens (-), and underscores (_) are allowed.", "error");
      return;
    }

    // Step 2: Description
    const description = await askInput(ctx, `Description for "${name}" (e.g., "Fast codebase recon"):`);
    if (!description) return ctx.ui.notify("Wizard cancelled.", "info");

    // Step 3: Tools
    const tools = await askToolsSelect(pi, ctx);
    if (tools.length === 0) return ctx.ui.notify("Wizard cancelled.", "info");

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
