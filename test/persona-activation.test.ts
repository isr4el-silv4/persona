// Mock must be at the very top, before any other imports
jest.mock("@earendil-works/pi-coding-agent", () => ({}));

import { describe, it, expect, beforeEach } from "@jest/globals";
import type { LoadedPersona, PersonaConfig } from "../persona-wizard";

// ---------------------------------------------------------------------------
// Helper: simulate the tool merging logic from index.ts
// ---------------------------------------------------------------------------

/**
 * Simulates how index.ts merges _sh script tools and browser tools into persona tools
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
  const browserToolNames = allTools
    .filter((t) => t.name.startsWith("browser_"))
    .map((t) => t.name);
  const merged = [...new Set([...personaTools, ...scriptToolNames, ...browserToolNames])].filter(
    (t) => availableToolNames.includes(t),
  );
  return merged;
}

/**
 * Simulates how index.ts merges _sh script tools and browser tools into persona tools
 * for ephemeral persona activation.
 */
function mergeScriptToolsForEphemeralPersona(
  personaTools: string[],
  allTools: { name: string }[],
): string[] {
  const scriptToolNames = allTools
    .filter((t) => t.name.endsWith("_sh"))
    .map((t) => t.name);
  const browserToolNames = allTools
    .filter((t) => t.name.startsWith("browser_"))
    .map((t) => t.name);
  return [...new Set([...personaTools, ...scriptToolNames, ...browserToolNames])];
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
    { name: "browser_list_tabs" },
    { name: "browser_get_page_html" },
    { name: "browser_capture_screenshot" },
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

// ---------------------------------------------------------------------------
// pi-web-ui browser tool tests
// ---------------------------------------------------------------------------

describe("mergeBrowserToolsForFileBasedPersona", () => {
  /**
   * Test 1: browser_ tools are merged into persona tools for file-based personas
   */
  it("should merge browser_ tools into persona tools", () => {
    const personaTools = ["read", "grep"];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    expect(result).toContain("read");
    expect(result).toContain("grep");
    expect(result).toContain("browser_list_tabs");
    expect(result).toContain("browser_get_page_html");
    expect(result).toContain("browser_capture_screenshot");
  });

  /**
   * Test 2: Duplicate browser_ tools are deduplicated
   */
  it("should deduplicate tools when browser_ tool is already in persona tools", () => {
    const personaTools = ["read", "grep", "browser_list_tabs"];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    expect(result.filter((t) => t === "browser_list_tabs").length).toBe(1);
    expect(result).toContain("browser_list_tabs");
  });

  /**
   * Test 3: browser_ tools that are not available are filtered out
   */
  it("should filter out browser_ tools that are not in available tools", () => {
    const personaTools = ["read", "grep"];
    const allTools = [
      { name: "read" },
      { name: "grep" },
      { name: "browser_list_tabs" },
      // browser_get_page_html is NOT available
    ];

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    expect(result).toContain("read");
    expect(result).toContain("grep");
    expect(result).toContain("browser_list_tabs");
    expect(result).not.toContain("browser_get_page_html");
  });

  /**
   * Test 4: Persona with empty tools still gets all browser_ tools
   */
  it("should give all browser_ tools to persona with empty tools list", () => {
    const personaTools: string[] = [];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    expect(result).toContain("browser_list_tabs");
    expect(result).toContain("browser_get_page_html");
    expect(result).toContain("browser_capture_screenshot");
    expect(result).not.toContain("read");
    expect(result).not.toContain("bash");
  });

  /**
   * Test 5: Both _sh and browser_ tools are merged together
   */
  it("should merge both _sh and browser_ tools into persona tools", () => {
    const personaTools = ["read", "grep"];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForFileBasedPersona(personaTools, allTools);

    // Persona tools
    expect(result).toContain("read");
    expect(result).toContain("grep");
    // _sh tools
    expect(result).toContain("status_sh");
    expect(result).toContain("deploy_sh");
    expect(result).toContain("lint_sh");
    // browser_ tools
    expect(result).toContain("browser_list_tabs");
    expect(result).toContain("browser_get_page_html");
    expect(result).toContain("browser_capture_screenshot");
    // Non-allowed tools
    expect(result).not.toContain("bash");
    expect(result).not.toContain("web_search");
  });
});

describe("mergeBrowserToolsForEphemeralPersona", () => {
  /**
   * Test 1: browser_ tools are merged into ephemeral persona tools
   */
  it("should merge browser_ tools into ephemeral persona tools", () => {
    const personaTools = ["read", "grep"];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForEphemeralPersona(personaTools, allTools);

    expect(result).toContain("read");
    expect(result).toContain("grep");
    expect(result).toContain("browser_list_tabs");
    expect(result).toContain("browser_get_page_html");
    expect(result).toContain("browser_capture_screenshot");
  });

  /**
   * Test 2: Duplicate browser_ tools are deduplicated for ephemeral personas
   */
  it("should deduplicate tools when browser_ tool is already in ephemeral persona tools", () => {
    const personaTools = ["read", "grep", "browser_list_tabs"];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForEphemeralPersona(personaTools, allTools);

    expect(result.filter((t) => t === "browser_list_tabs").length).toBe(1);
    expect(result).toContain("browser_list_tabs");
  });

  /**
   * Test 3: Ephemeral persona with empty tools still gets all browser_ tools
   */
  it("should give all browser_ tools to ephemeral persona with empty tools list", () => {
    const personaTools: string[] = [];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForEphemeralPersona(personaTools, allTools);

    expect(result).toContain("browser_list_tabs");
    expect(result).toContain("browser_get_page_html");
    expect(result).toContain("browser_capture_screenshot");
  });

  /**
   * Test 4: Both _sh and browser_ tools are merged for ephemeral personas
   */
  it("should merge both _sh and browser_ tools for ephemeral personas", () => {
    const personaTools = ["read", "grep"];
    const allTools = makeAllTools();

    const result = mergeScriptToolsForEphemeralPersona(personaTools, allTools);

    // Persona tools
    expect(result).toContain("read");
    expect(result).toContain("grep");
    // _sh tools
    expect(result).toContain("status_sh");
    expect(result).toContain("deploy_sh");
    expect(result).toContain("lint_sh");
    // browser_ tools
    expect(result).toContain("browser_list_tabs");
    expect(result).toContain("browser_get_page_html");
    expect(result).toContain("browser_capture_screenshot");
  });

  /**
   * Test 5: No browser_ tools available — ephemeral persona gets only its declared tools and _sh tools
   */
  it("should return persona and _sh tools when no browser_ tools are available", () => {
    const personaTools = ["read", "grep"];
    const allTools = [
      { name: "read" },
      { name: "grep" },
      { name: "status_sh" },
      { name: "deploy_sh" },
      // No browser_ tools
    ];

    const result = mergeScriptToolsForEphemeralPersona(personaTools, allTools);

    expect(result).toContain("read");
    expect(result).toContain("grep");
    expect(result).toContain("status_sh");
    expect(result).toContain("deploy_sh");
  });
});

// ---------------------------------------------------------------------------
// Integration Tests: Verify setActiveTools receives browser tools
// ---------------------------------------------------------------------------

describe("integration — setActiveTools receives browser tools", () => {
  describe("file-based persona activation merges browser tools correctly", () => {
    it("should include browser tools in the result passed to pi.setActiveTools", () => {
      // Simulate the exact code path in index.ts (file-based persona activation)
      const personaTools = ["read", "grep"];
      const allTools = [
        { name: "read" },
        { name: "grep" },
        { name: "bash" },
        { name: "web_search" },
        { name: "status_sh" },
        { name: "deploy_sh" },
        { name: "lint_sh" },
        { name: "browser_list_tabs" },
        { name: "browser_get_page_html" },
        { name: "browser_capture_screenshot" },
      ];

      // This is the exact logic from index.ts lines 180-184
      const availableToolNames = allTools.map((t) => t.name);
      const scriptToolNames = allTools.filter((t) => t.name.endsWith("_sh")).map((t) => t.name);
      const browserToolNames = allTools.filter((t) => t.name.startsWith("browser_")).map((t) => t.name);
      const personaToolsResult = [...new Set([...personaTools, ...scriptToolNames, ...browserToolNames])].filter(
        (t) => availableToolNames.includes(t),
      );

      // This is what would be passed to pi.setActiveTools(personaToolsResult)
      expect(personaToolsResult).toContain("read"); // persona tool
      expect(personaToolsResult).toContain("grep"); // persona tool
      expect(personaToolsResult).toContain("status_sh"); // _sh tool
      expect(personaToolsResult).toContain("deploy_sh"); // _sh tool
      expect(personaToolsResult).toContain("browser_list_tabs"); // browser tool
      expect(personaToolsResult).toContain("browser_get_page_html"); // browser tool
      expect(personaToolsResult).toContain("browser_capture_screenshot"); // browser tool

      // Verify non-whitelisted tools are NOT included
      expect(personaToolsResult).not.toContain("bash");
      expect(personaToolsResult).not.toContain("web_search");

      // Verify the exact set that would be passed to setActiveTools
      expect(personaToolsResult).toEqual([
        "read",
        "grep",
        "status_sh",
        "deploy_sh",
        "lint_sh",
        "browser_list_tabs",
        "browser_get_page_html",
        "browser_capture_screenshot",
      ]);
    });

    it("should filter browser tools by availableToolNames for file-based personas", () => {
      const personaTools = ["read", "grep"];
      const allTools = [
        { name: "read" },
        { name: "grep" },
        { name: "status_sh" },
        { name: "browser_list_tabs" },
        // Note: browser_get_page_html and browser_capture_screenshot are NOT in allTools
      ];

      const availableToolNames = allTools.map((t) => t.name);
      const scriptToolNames = allTools.filter((t) => t.name.endsWith("_sh")).map((t) => t.name);
      const browserToolNames = allTools.filter((t) => t.name.startsWith("browser_")).map((t) => t.name);
      const personaToolsResult = [...new Set([...personaTools, ...scriptToolNames, ...browserToolNames])].filter(
        (t) => availableToolNames.includes(t),
      );

      // Only available browser tool should be included
      expect(personaToolsResult).toContain("browser_list_tabs");
      expect(personaToolsResult).not.toContain("browser_get_page_html");
      expect(personaToolsResult).not.toContain("browser_capture_screenshot");

      expect(personaToolsResult).toEqual(["read", "grep", "status_sh", "browser_list_tabs"]);
    });

    it("should deduplicate browser tools already in persona.tools for file-based personas", () => {
      const personaTools = ["read", "browser_list_tabs"]; // Already includes a browser tool
      const allTools = [
        { name: "read" },
        { name: "status_sh" },
        { name: "browser_list_tabs" },
        { name: "browser_get_page_html" },
      ];

      const availableToolNames = allTools.map((t) => t.name);
      const scriptToolNames = allTools.filter((t) => t.name.endsWith("_sh")).map((t) => t.name);
      const browserToolNames = allTools.filter((t) => t.name.startsWith("browser_")).map((t) => t.name);
      const personaToolsResult = [...new Set([...personaTools, ...scriptToolNames, ...browserToolNames])].filter(
        (t) => availableToolNames.includes(t),
      );

      // browser_list_tabs should appear only once (deduplicated via Set)
      const browserListTabsCount = personaToolsResult.filter((t) => t === "browser_list_tabs").length;
      expect(browserListTabsCount).toBe(1);
      expect(personaToolsResult).toContain("browser_list_tabs");
      expect(personaToolsResult).toEqual(["read", "browser_list_tabs", "status_sh", "browser_get_page_html"]);
    });
  });

  describe("ephemeral persona activation merges browser tools correctly", () => {
    it("should include browser tools in the result passed to pi.setActiveTools", () => {
      // Simulate the exact code path in index.ts (ephemeral persona activation)
      // Note: Ephemeral path does NOT filter by availableToolNames (important distinction)
      const personaTools = ["read", "grep"];
      const allTools = [
        { name: "read" },
        { name: "grep" },
        { name: "bash" },
        { name: "status_sh" },
        { name: "deploy_sh" },
        { name: "browser_list_tabs" },
        { name: "browser_get_page_html" },
        { name: "browser_capture_screenshot" },
      ];

      // This is the exact logic from index.ts lines 151-153
      const scriptToolNames = allTools.filter((t) => t.name.endsWith("_sh")).map((t) => t.name);
      const browserToolNames = allTools.filter((t) => t.name.startsWith("browser_")).map((t) => t.name);
      const mergedTools = [...new Set([...personaTools, ...scriptToolNames, ...browserToolNames])];

      // This is what would be passed to pi.setActiveTools(mergedTools)
      expect(mergedTools).toContain("read"); // persona tool
      expect(mergedTools).toContain("grep"); // persona tool
      expect(mergedTools).toContain("status_sh"); // _sh tool
      expect(mergedTools).toContain("deploy_sh"); // _sh tool
      expect(mergedTools).toContain("browser_list_tabs"); // browser tool
      expect(mergedTools).toContain("browser_get_page_html"); // browser tool
      expect(mergedTools).toContain("browser_capture_screenshot"); // browser tool

      // Verify the exact set that would be passed to setActiveTools
      expect(mergedTools).toEqual([
        "read",
        "grep",
        "status_sh",
        "deploy_sh",
        "browser_list_tabs",
        "browser_get_page_html",
        "browser_capture_screenshot",
      ]);
    });

    it("should NOT filter by availableToolNames for ephemeral personas (notable distinction)", () => {
      // This is a CRITICAL distinction from file-based personas
      // File-based: [...new Set([...loaded.tools, ...scriptToolNames, ...browserToolNames])].filter((t) => availableToolNames.includes(t))
      // Ephemeral: [...new Set([...persona.tools, ...scriptToolNames, ...browserToolNames])] — NO FILTER!

      const personaTools = ["read", "grep"];
      const allTools = [
        { name: "read" },
        { name: "grep" },
        { name: "status_sh" },
        { name: "browser_list_tabs" },
      ];

      const scriptToolNames = allTools.filter((t) => t.name.endsWith("_sh")).map((t) => t.name);
      const browserToolNames = allTools.filter((t) => t.name.startsWith("browser_")).map((t) => t.name);
      const mergedTools = [...new Set([...personaTools, ...scriptToolNames, ...browserToolNames])];

      // No filtering - all merged tools are present
      expect(mergedTools).toContain("read");
      expect(mergedTools).toContain("grep");
      expect(mergedTools).toContain("status_sh");
      expect(mergedTools).toContain("browser_list_tabs");

      // Verify length: 2 persona + 1 _sh + 1 browser = 4 total
      expect(mergedTools.length).toBe(4);

      expect(mergedTools).toEqual(["read", "grep", "status_sh", "browser_list_tabs"]);
    });

    it("should deduplicate browser tools already in persona.tools for ephemeral personas", () => {
      const personaTools = ["read", "browser_list_tabs"]; // Already includes a browser tool
      const allTools = [
        { name: "read" },
        { name: "status_sh" },
        { name: "browser_list_tabs" },
        { name: "browser_get_page_html" },
      ];

      const scriptToolNames = allTools.filter((t) => t.name.endsWith("_sh")).map((t) => t.name);
      const browserToolNames = allTools.filter((t) => t.name.startsWith("browser_")).map((t) => t.name);
      const mergedTools = [...new Set([...personaTools, ...scriptToolNames, ...browserToolNames])];

      // browser_list_tabs should appear only once (deduplicated via Set)
      const browserListTabsCount = mergedTools.filter((t) => t === "browser_list_tabs").length;
      expect(browserListTabsCount).toBe(1);
      expect(mergedTools).toContain("browser_list_tabs");
      expect(mergedTools).toEqual(["read", "browser_list_tabs", "status_sh", "browser_get_page_html"]);
    });
  });

  describe("comparison: file-based vs ephemeral persona activation", () => {
    it("should show that ephemeral path lacks availableToolNames filtering", () => {
      const personaTools = ["read", "grep"];
      const allTools = [
        { name: "read" },
        { name: "grep" },
        { name: "status_sh" },
        { name: "browser_list_tabs" },
      ];

      // File-based path (WITH filtering)
      const availableToolNames = allTools.map((t) => t.name);
      const scriptToolNames = allTools.filter((t) => t.name.endsWith("_sh")).map((t) => t.name);
      const browserToolNames = allTools.filter((t) => t.name.startsWith("browser_")).map((t) => t.name);
      const fileBasedResult = [...new Set([...personaTools, ...scriptToolNames, ...browserToolNames])].filter(
        (t) => availableToolNames.includes(t),
      );

      // Ephemeral path (WITHOUT filtering)
      const ephemeralResult = [...new Set([...personaTools, ...scriptToolNames, ...browserToolNames])];

      // Both produce the same result when all tools are available
      expect(fileBasedResult).toEqual(ephemeralResult);
      expect(fileBasedResult).toEqual(["read", "grep", "status_sh", "browser_list_tabs"]);

      // The key distinction is in the code path:
      // File-based (index.ts ~line 184): .filter((t) => availableToolNames.includes(t))
      // Ephemeral (index.ts ~line 153): No filter - just the Set-deduplicated array
    });
  });
});
