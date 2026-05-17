import type { Component } from "@earendil-works/pi-tui";
import { truncateToWidth } from "@earendil-works/pi-tui";
import type { LoadedPersona } from "./persona-wizard";

export class PersonaIndicator implements Component {
  private persona: LoadedPersona | null;
  private cachedWidth?: number;
  private cachedLines?: string[];

  constructor(persona: LoadedPersona | null) {
    this.persona = persona;
  }

  render(width: number): string[] {
    if (this.cachedLines && this.cachedWidth === width) {
      return this.cachedLines;
    }

    if (!this.persona) {
      this.cachedLines = [];
      this.cachedWidth = width;
      return this.cachedLines;
    }

    const scopeLabel = this.getScopeEmoji(this.persona);
    const toolCount = this.persona.tools.length;
    const promptMode = this.persona.systemPromptMode === "append" ? "append" : "replace";

    this.cachedLines = [
      truncateToWidth(`${scopeLabel} ${this.persona.name}`, width),
      truncateToWidth(`  ${this.persona.description || "(no description)"}`, width),
      truncateToWidth(`  🛠 ${toolCount} tool(s) • ${promptMode} mode`, width),
    ];

    this.cachedWidth = width;
    return this.cachedLines;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }

  private getScopeEmoji(persona: LoadedPersona): string {
    switch (persona.scope) {
      case "global":
        return "🌍";
      case "project":
        return "📁";
      case "ephemeral":
        return "⚡";
      default:
        return "🎭";
    }
  }
}
