// Mock must be at the very top, before any other imports
jest.mock("@earendil-works/pi-coding-agent", () => ({}));

import { describe, it, expect, beforeEach } from "@jest/globals";

import { checkToolBlock, buildBlockNotification } from "../tool-blocker";
import type { LoadedPersona } from "../persona-wizard";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePersona(overrides: Partial<LoadedPersona> = {}): LoadedPersona {
  return {
    name: "scout",
    description: "Fast codebase recon",
    tools: ["read", "grep", "find", "ls"],
    systemPromptMode: "replace" as any,
    inheritProjectContext: false,
    interactive: true,
    systemPrompt: "You are a scout.",
    scope: "global",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests — checkToolBlock
// ---------------------------------------------------------------------------

describe("checkToolBlock", () => {
  /**
   * Test 1: Tool call is **blocked** when tool is NOT in persona's `tools` array
   */
  it("should block tool calls for tools not in the persona's tools array", () => {
    const persona = makePersona({
      name: "scout",
      tools: ["read", "grep"],
    });

    const result = checkToolBlock(persona, "bash");

    expect(result).not.toBeNull();
    expect(result!.block).toBe(true);
    expect(result!.reason).toBe(`Tool "bash" is not allowed by persona "scout"`);
  });

  /**
   * Test 2: Tool call is **allowed** when tool IS in persona's `tools` array
   */
  it("should allow tool calls for tools in the persona's tools array", () => {
    const persona = makePersona({
      name: "scout",
      tools: ["read", "grep", "find", "ls"],
    });

    const result = checkToolBlock(persona, "read");

    expect(result).toBeNull();
  });

  /**
   * Test 3: **No blocking** occurs when no persona is active (`currentPersona === null`)
   */
  it("should not block any tool calls when no persona is active", () => {
    const result = checkToolBlock(null, "bash");

    expect(result).toBeNull();
  });

  /**
   * Test 4: Blocking works for **ephemeral** personas as well
   */
  it("should block tool calls for ephemeral personas too", () => {
    const persona = makePersona({
      name: "temp-helper",
      tools: ["read", "write"],
      scope: "ephemeral",
    });

    const result = checkToolBlock(persona, "bash");

    expect(result).not.toBeNull();
    expect(result!.block).toBe(true);
    expect(result!.reason).toBe(`Tool "bash" is not allowed by persona "temp-helper"`);
  });

  /**
   * Test 5: User notification includes the **specific tool name** and persona name
   */
  it("should include specific tool name and persona name in the reason", () => {
    const persona = makePersona({
      name: "code-reviewer",
      tools: ["read", "grep"],
    });

    const result = checkToolBlock(persona, "bash");

    expect(result).not.toBeNull();
    expect(result!.reason).toContain("bash");
    expect(result!.reason).toContain("code-reviewer");
  });

  /**
   * Test 6: `_sh` tools are **always allowed** even when NOT in persona's `tools` array
   */
  it("should always allow _sh tools regardless of persona tools list", () => {
    const persona = makePersona({
      name: "scout",
      tools: ["read", "grep"],
    });

    const result = checkToolBlock(persona, "status_sh");

    expect(result).toBeNull();
  });

  /**
   * Test 7: `_sh` tools are **always allowed** even for personas with empty tools list
   */
  it("should always allow _sh tools even for personas with empty tools list", () => {
    const persona = makePersona({
      name: "minimal",
      tools: [],
    });

    const result = checkToolBlock(persona, "deploy_sh");

    expect(result).toBeNull();
  });

  /**
   * Test 8: `_sh` tools are **always allowed** for ephemeral personas
   */
  it("should always allow _sh tools for ephemeral personas", () => {
    const persona = makePersona({
      name: "temp-helper",
      tools: ["read"],
      scope: "ephemeral",
    });

    const result = checkToolBlock(persona, "lint_sh");

    expect(result).toBeNull();
  });

  /**
   * Test 9: Non-`_sh` tools are still blocked when not in persona's tools list
   * (regression test — ensuring _sh bypass doesn't affect normal blocking)
   */
  it("should still block non-_sh tools not in persona tools list", () => {
    const persona = makePersona({
      name: "scout",
      tools: ["read", "grep"],
    });

    const result = checkToolBlock(persona, "web_search");

    expect(result).not.toBeNull();
    expect(result!.block).toBe(true);
  });

  /**
   * Test 10: `_sh` suffix must be exact — tools like "my_sh_backup" should still be blocked
   */
  it("should block tools that contain _sh but do not end with it", () => {
    const persona = makePersona({
      name: "scout",
      tools: ["read", "grep"],
    });

    const result = checkToolBlock(persona, "my_sh_backup");

    expect(result).not.toBeNull();
    expect(result!.block).toBe(true);
  });

  /**
   * Test 11: `_sh` tools are allowed even when no persona is active (already allowed, no regression)
   */
  it("should allow _sh tools when no persona is active", () => {
    const result = checkToolBlock(null, "status_sh");

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests — buildBlockNotification
// ---------------------------------------------------------------------------

describe("buildBlockNotification", () => {
  it("should produce a notification with tool name and persona name", () => {
    const msg = buildBlockNotification("bash", "scout");

    expect(msg).toContain("bash");
    expect(msg).toContain("scout");
    expect(msg).toContain("Blocked");
  });

  it("should include the emoji prefix", () => {
    const msg = buildBlockNotification("edit", "writer");

    expect(msg).toMatch(/^🚫/);
  });
});

// ---------------------------------------------------------------------------
// Integration — index.ts wiring (smoke test)
// ---------------------------------------------------------------------------

describe("tool-blocker integration with index.ts", () => {
  it("should be importable from index.ts without errors", () => {
    // This is a smoke test — the real integration happens at runtime.
    // We just verify the module loads cleanly.
    const { checkToolBlock } = require("../tool-blocker");
    expect(typeof checkToolBlock).toBe("function");
  });
});
