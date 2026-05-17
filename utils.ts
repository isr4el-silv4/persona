import fs from "node:fs";
import path from "node:path";
import type { PersonaConfig, LoadedPersona } from "./persona-wizard";

export { PersonaConfig, LoadedPersona };

export function parseYamlFrontmatter(content: string): Partial<PersonaConfig> {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const frontmatter = match[1];
  const result: Partial<PersonaConfig> = {};
  const lines = frontmatter.split("\n");
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    // Parse tools as comma-separated list
    if (key === "tools") {
      result.tools = value.split(",").map((t: string) => t.trim());
      continue;
    }
    // Parse booleans
    if (key === "inheritProjectContext") {
      result.inheritProjectContext = value === "true";
      continue;
    }
    if (key === "interactive") {
      result.interactive = value === "true";
      continue;
    }
    if (key === "name") result.name = value;
    else if (key === "description") result.description = value;
    else if (key === "systemPromptMode") result.systemPromptMode = value as any;
  }
  // Extract system prompt (everything after the second ---)
  const systemPromptMatch = content.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);
  if (systemPromptMatch) {
    result.systemPrompt = systemPromptMatch[1].trim();
  }
  return result;
}

export function loadPersona(name: string): LoadedPersona | null {
  const safeName = name.toLowerCase().replace(/\s+/g, "-");

  // Check global personas
  const globalDir = path.join(process.env.HOME || "", ".pi", "agent", "personas");
  const globalPath = path.join(globalDir, `${safeName}.yaml`);
  if (fs.existsSync(globalPath)) {
    const content = fs.readFileSync(globalPath, "utf-8");
    const parsed = parseYamlFrontmatter(content);
    if (parsed.name) {
      return {
        ...parsed,
        scope: "global",
        filePath: globalPath,
      } as LoadedPersona;
    }
  }

  // Check project personas
  const projectDir = path.join(process.cwd(), ".pi", "personas");
  const projectPath = path.join(projectDir, `${safeName}.yaml`);
  if (fs.existsSync(projectPath)) {
    const content = fs.readFileSync(projectPath, "utf-8");
    const parsed = parseYamlFrontmatter(content);
    if (parsed.name) {
      return {
        ...parsed,
        scope: "project",
        filePath: projectPath,
      } as LoadedPersona;
    }
  }

  return null;
}
