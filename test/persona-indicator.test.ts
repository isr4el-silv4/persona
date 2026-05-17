import { PersonaIndicator } from "../persona-indicator";
import type { LoadedPersona } from "../persona-wizard";
import { SystemPromptMode } from "../persona-wizard";
import { visibleWidth } from "@earendil-works/pi-tui";

describe("PersonaIndicator", () => {
  it("should render nothing when persona is null", () => {
    const indicator = new PersonaIndicator(null);
    const lines = indicator.render(80);
    expect(lines).toEqual([]);
  });

  it("should render global persona with globe emoji", () => {
    const persona: LoadedPersona = {
      name: "scout",
      description: "Fast codebase recon",
      tools: ["read", "grep", "find"],
      systemPromptMode: SystemPromptMode.REPLACE,
      inheritProjectContext: false,
      interactive: true,
      systemPrompt: "You are a scout.",
      scope: "global",
    };

    const indicator = new PersonaIndicator(persona);
    const lines = indicator.render(80);

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("🌍");
    expect(lines[0]).toContain("scout");
    expect(lines[1]).toContain("Fast codebase recon");
    expect(lines[2]).toContain("3 tool(s)");
    expect(lines[2]).toContain("replace mode");
  });

  it("should render project persona with folder emoji", () => {
    const persona: LoadedPersona = {
      name: "project-dev",
      description: "Project developer",
      tools: ["read", "bash"],
      systemPromptMode: SystemPromptMode.APPEND,
      inheritProjectContext: true,
      interactive: true,
      systemPrompt: "You are a developer.",
      scope: "project",
    };

    const indicator = new PersonaIndicator(persona);
    const lines = indicator.render(80);

    expect(lines[0]).toContain("📁");
    expect(lines[0]).toContain("project-dev");
    expect(lines[2]).toContain("append mode");
  });

  it("should render ephemeral persona with lightning emoji", () => {
    const persona: LoadedPersona = {
      name: "test-ephemeral",
      description: "Test ephemeral",
      tools: ["read"],
      systemPromptMode: SystemPromptMode.REPLACE,
      inheritProjectContext: false,
      interactive: false,
      systemPrompt: "Test prompt.",
      scope: "ephemeral",
    };

    const indicator = new PersonaIndicator(persona);
    const lines = indicator.render(80);

    expect(lines[0]).toContain("⚡");
    expect(lines[0]).toContain("test-ephemeral");
    expect(lines[2]).toContain("1 tool(s)");
  });

  it("should handle personas without description", () => {
    const persona: LoadedPersona = {
      name: "no-desc",
      description: "",
      tools: ["read"],
      systemPromptMode: SystemPromptMode.REPLACE,
      inheritProjectContext: false,
      interactive: false,
      systemPrompt: "Test.",
      scope: "global",
    };

    const indicator = new PersonaIndicator(persona);
    const lines = indicator.render(80);

    expect(lines[1]).toContain("(no description)");
  });

  it("should cache render results", () => {
    const persona: LoadedPersona = {
      name: "cached",
      description: "Test",
      tools: ["read"],
      systemPromptMode: SystemPromptMode.REPLACE,
      inheritProjectContext: false,
      interactive: false,
      systemPrompt: "Test.",
      scope: "global",
    };

    const indicator = new PersonaIndicator(persona);
    const lines1 = indicator.render(80);
    const lines2 = indicator.render(80);

    // Should return same array reference (cached)
    expect(lines1).toBe(lines2);
  });

  it("should invalidate cache", () => {
    const persona: LoadedPersona = {
      name: "invalidate",
      description: "Test",
      tools: ["read"],
      systemPromptMode: SystemPromptMode.REPLACE,
      inheritProjectContext: false,
      interactive: false,
      systemPrompt: "Test.",
      scope: "global",
    };

    const indicator = new PersonaIndicator(persona);
    const lines1 = indicator.render(80);
    indicator.invalidate();
    const lines2 = indicator.render(80);

    // Should return different array reference after invalidation
    expect(lines1).not.toBe(lines2);
  });

  it("should truncate long lines to width", () => {
    const persona: LoadedPersona = {
      name: "very-long-persona-name-that-should-be-truncated",
      description: "A very long description that should also be truncated when the width is small",
      tools: ["read", "grep", "find", "ls", "bash", "mcp:chrome-devtools"],
      systemPromptMode: SystemPromptMode.APPEND,
      inheritProjectContext: true,
      interactive: true,
      systemPrompt: "Test.",
      scope: "project",
    };

    const indicator = new PersonaIndicator(persona);
    const lines = indicator.render(40);

    // Each line should not exceed 40 visible characters
    for (const line of lines) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(40);
    }
  });
});
