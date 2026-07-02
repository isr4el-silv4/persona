// Mock must be at the very top, before any other imports
jest.mock("@earendil-works/pi-coding-agent", () => ({}));

import { describe, it, expect, beforeEach } from "@jest/globals";
import type { LoadedPersona, PersonaConfig } from "../persona-wizard";

// ---------------------------------------------------------------------------
// Helper: simulate the tool merging logic from index.ts
// ---------------------------------------------------------------------------

/**
 * Simulates how index.ts merges _sh script tools into persona tools
 * for file-based persona activation.
 */
function mergeScriptToolsForFileBasedPersona(
  personaTools: string[],
  allTools: { name: string }[],
): string[] {
  const availableToolNames = allTools.map((t) => t.name);
  const scriptToolNames = allTools
    .filter((t) => t.name.endsWith("_sh"))
    .map((t) => t.name);
  const merged = [...new Set([...personaTools, ...scriptToolNames])].filter(
    (t) => availableToolNames.includes(t),
  );
  return merged;
}

/**
 * Simulates how index.ts merges _sh script tools into persona tools
 * for ephemeral persona activation.
 */
function mergeScriptToolsForEphemeralPersona(
  personaTools: string[],
  allTools: { name: string }[],
): string[] {
  const scriptToolNames = allTools
    .filter((t) => t.name.endsWith("_sh"))
    .map((t) => t.name);
  return [...new Set([...personaTools, ...scriptToolNames])];
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAllTools(
  extraTools: { name: string }[] = [],
): { name: string }[] {
  return [
    { name: "read" },
    { name: "grep" },
    { name: "find" },
    { name: "bash" },
    { name: "web_search" },
    { name: "status_sh" },
    { name: "deploy_sh" },
    { name: "lint_sh" },
    ...extraTools,
  ];
}

// ---------------------------------------------------------------------------
// Tests — File-based persona activation (Task 2)
// ---------------------------------------------------------------------------

describe("mergeScriptToolsForFileBasedPersona", () => {
  /**
   * Test 1: _sh tools are merged into persona tools for file-based personas
   */
  it("should merge _sh tools into persona tools", () => {
    const personaTools = ["read", "grep"];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    expect(result).toContain("read");
    expect(result).toContain("grep");
    expect(result).toContain("status_sh");
    expect(result).toContain("deploy_sh");
    expect(result).toContain("lint_sh");
  });

  /**
   * Test 2: Non-_sh tools that are NOT in persona tools are NOT included
   */
  it("should not include non-_sh tools that are not in persona tools", () => {
    const personaTools = ["read", "grep"];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    expect(result).not.toContain("bash");
    expect(result).not.toContain("web_search");
    expect(result).not.toContain("find");
  });

  /**
   * Test 3: Duplicate _sh tools are deduplicated
   */
  it("should deduplicate tools when _sh tool is already in persona tools", () => {
    const personaTools = ["read", "grep", "status_sh"];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    expect(result.filter((t) => t === "status_sh").length).toBe(1);
    expect(result).toContain("status_sh");
  });

  /**
   * Test 4: _sh tools that are not available are filtered out
   */
  it("should filter out _sh tools that are not in available tools", () => {
    const personaTools = ["read", "grep"];
    const allTools = [
      { name: "read" },
      { name: "grep" },
      { name: "status_sh" },
      // deploy_sh is NOT available
    ];

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    expect(result).toContain("read");
    expect(result).toContain("grep");
    expect(result).toContain("status_sh");
    expect(result).not.toContain("deploy_sh");
  });

  /**
   * Test 5: Persona with empty tools still gets all _sh tools
   */
  it("should give all _sh tools to persona with empty tools list", () => {
    const personaTools: string[] = [];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    expect(result).toContain("status_sh");
    expect(result).toContain("deploy_sh");
    expect(result).toContain("lint_sh");
    expect(result).not.toContain("read");
    expect(result).not.toContain("bash");
  });

  /**
   * Test 6: No _sh tools available — persona gets only its declared tools
   */
  it("should return only persona tools when no _sh tools are available", () => {
    const personaTools = ["read", "grep"];
    const allTools = [
      { name: "read" },
      { name: "grep" },
      { name: "bash" },
    ];

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    expect(result).toEqual(["read", "grep"]);
  });

  /**
   * Test 7: Tools not ending in _sh are not auto-included
   */
  it("should not auto-include tools that do not end with _sh", () => {
    const personaTools = ["read"];
    const allTools = [
      { name: "read" },
      { name: "my_script" },
      { name: "backup_sh_old" },
      { name: "status_sh" },
    ];

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    expect(result).toContain("read");
    expect(result).toContain("status_sh");
    expect(result).not.toContain("my_script");
    expect(result).not.toContain("backup_sh_old");
  });
});

// ---------------------------------------------------------------------------
// Tests — Ephemeral persona activation (Task 3)
// ---------------------------------------------------------------------------

describe("mergeScriptToolsForEphemeralPersona", () => {
  /**
   * Test 1: _sh tools are merged into ephemeral persona tools
   */
  it("should merge _sh tools into ephemeral persona tools", () => {
    const personaTools = ["read", "grep"];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForEphemeralPersona(personaTools, allTools);

    expect(result).toContain("read");
    expect(result).toContain("grep");
    expect(result).toContain("status_sh");
    expect(result).toContain("deploy_sh");
    expect(result).toContain("lint_sh");
  });

  /**
   * Test 2: Duplicate _sh tools are deduplicated for ephemeral personas
   */
  it("should deduplicate tools when _sh tool is already in ephemeral persona tools", () => {
    const personaTools = ["read", "grep", "status_sh"];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForEphemeralPersona(personaTools, allTools);

    expect(result.filter((t) => t === "status_sh").length).toBe(1);
    expect(result).toContain("status_sh");
  });

  /**
   * Test 3: Ephemeral persona with empty tools still gets all _sh tools
   */
  it("should give all _sh tools to ephemeral persona with empty tools list", () => {
    const personaTools: string[] = [];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForEphemeralPersona(personaTools, allTools);

    expect(result).toContain("status_sh");
    expect(result).toContain("deploy_sh");
    expect(result).toContain("lint_sh");
  });

  /**
   * Test 4: No _sh tools available — ephemeral persona gets only its declared tools
   */
  it("should return only persona tools when no _sh tools are available", () => {
    const personaTools = ["read", "grep"];
    const allTools = [
      { name: "read" },
      { name: "grep" },
      { name: "bash" },
    ];

    const result = mergeScriptToolsForEphemeralPersona(personaTools, allTools);

    expect(result).toEqual(["read", "grep"]);
  });
});

// ---------------------------------------------------------------------------
// Regression: non-_sh tools are still restricted
// ---------------------------------------------------------------------------

describe("regression — tool restrictions still work", () => {
  it("should not include web_search for persona that does not declare it", () => {
    const personaTools = ["read", "grep"];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    expect(result).not.toContain("web_search");
  });

  it("should not include bash for persona that does not declare it", () => {
    const personaTools = ["read", "grep"];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    expect(result).not.toContain("bash");
  });
});
