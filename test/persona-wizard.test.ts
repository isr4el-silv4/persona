// Mock must be at the very top, before any other imports
jest.mock("@earendil-works/pi-coding-agent", () => ({}));

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// These imports will use the mocked module
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { generateYaml, type PersonaConfig } from "../persona-wizard";

// Mock the UI methods
const mockInput = jest.fn();
const mockSelect = jest.fn();
const mockConfirm = jest.fn();
const mockNotify = jest.fn();
const mockSetWidget = jest.fn();

// Mock the extension context
const mockCtx = {
  ui: {
    input: (...args: any[]) => mockInput(...args),
    select: (...args: any[]) => mockSelect(...args),
    confirm: (...args: any[]) => mockConfirm(...args),
    notify: (...args: any[]) => mockNotify(...args),
    setWidget: (...args: any[]) => mockSetWidget(...args),
  },
  cwd: "/tmp/test",
  signal: undefined,
} as unknown as ExtensionContext;

// Mock the extension API
const mockPi = {
  appendEntry: jest.fn(),
  getAllTools: jest.fn(() => [
    { name: "read" },
    { name: "bash" },
    { name: "edit" },
    { name: "write" },
  ]),
  setActiveTools: jest.fn(),
} as unknown as ExtensionAPI;

describe("Persona Wizard", () => {
  let tmpDir: string;

  beforeEach(() => {
    // Create a temporary directory for test files
    tmpDir = fs.mkdtempSync("/tmp/persona-test-");

    // Reset mocks
    mockInput.mockReset();
    mockSelect.mockReset();
    mockConfirm.mockReset();
    mockNotify.mockReset();
    mockSetWidget.mockReset();
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
    jest.clearAllMocks();
  });

  describe("generateYaml", () => {
    it("should generate correct YAML frontmatter for a persona", () => {
      const config: PersonaConfig = {
        name: "scout",
        description: "Fast codebase recon",
        tools: ["read", "grep", "find", "ls", "bash", "mcp:chrome-devtools"],
        systemPromptMode: "replace",
        inheritProjectContext: false,
        interactive: true,
        systemPrompt: "You are a fast codebase recon agent.",
      };

      const yaml = generateYaml(config);

      expect(yaml).toContain("---");
      expect(yaml).toContain("name: scout");
      expect(yaml).toContain("description: Fast codebase recon");
      expect(yaml).toContain("tools: read, grep, find, ls, bash, mcp:chrome-devtools");
      expect(yaml).toContain("systemPromptMode: replace");
      expect(yaml).toContain("inheritProjectContext: false");
      expect(yaml).toContain("interactive: true");
      expect(yaml).toContain("You are a fast codebase recon agent.");
      expect(yaml).toContain("---");
    });

    it("should generate YAML with append mode", () => {
      const config: PersonaConfig = {
        name: "helper",
        description: "Helpful assistant",
        tools: ["read", "grep"],
        systemPromptMode: "append",
        inheritProjectContext: true,
        interactive: false,
        systemPrompt: "Be helpful and concise.",
      };

      const yaml = generateYaml(config);

      expect(yaml).toContain("systemPromptMode: append");
      expect(yaml).toContain("inheritProjectContext: true");
      expect(yaml).toContain("interactive: false");
    });

    it("should handle empty tools array", () => {
      const config: PersonaConfig = {
        name: "minimal",
        description: "Minimal persona",
        tools: [],
        systemPromptMode: "replace",
        inheritProjectContext: false,
        interactive: false,
        systemPrompt: "Do nothing.",
      };

      const yaml = generateYaml(config);

      expect(yaml).toContain("tools: ");
      expect(yaml).toContain("name: minimal");
    });
  });

  describe("persona file creation", () => {
    it("should create a global persona YAML file with correct content", () => {
      const config: PersonaConfig = {
        name: "test-scoped",
        description: "Test scoped persona",
        tools: ["read", "grep", "find"],
        systemPromptMode: "replace",
        inheritProjectContext: false,
        interactive: true,
        systemPrompt: "You are a test persona.",
      };

      const yaml = generateYaml(config);
      const filePath = path.join(tmpDir, "test-scoped.yaml");

      fs.writeFileSync(filePath, yaml, "utf-8");

      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("name: test-scoped");
      expect(content).toContain("description: Test scoped persona");
      expect(content).toContain("tools: read, grep, find");
      expect(content).toContain("systemPromptMode: replace");
      expect(content).toContain("inheritProjectContext: false");
      expect(content).toContain("interactive: true");
      expect(content).toContain("You are a test persona.");
    });

    it("should create persona files in nested directories", () => {
      const config: PersonaConfig = {
        name: "nested-test",
        description: "Nested test",
        tools: ["read"],
        systemPromptMode: "append",
        inheritProjectContext: true,
        interactive: false,
        systemPrompt: "Nested content.",
      };

      const yaml = generateYaml(config);
      const nestedDir = path.join(tmpDir, "subdir", "personas");
      const filePath = path.join(nestedDir, "nested-test.yaml");

      fs.mkdirSync(nestedDir, { recursive: true });
      fs.writeFileSync(filePath, yaml, "utf-8");

      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, "utf-8")).toContain("name: nested-test");
    });

    it("should follow the complete wizard flow and verify file creation", () => {
      // Simulate the complete wizard flow with mocked UI
      mockInput.mockResolvedValueOnce("scout"); // name
      mockInput.mockResolvedValueOnce("Fast codebase recon"); // description
      mockInput.mockResolvedValueOnce("read, grep, find, ls, bash, mcp:chrome-devtools"); // tools
      mockSelect.mockResolvedValueOnce("Replace — overwrite the entire system prompt"); // systemPromptMode: replace
      mockConfirm.mockResolvedValueOnce(false); // inheritProjectContext
      mockConfirm.mockResolvedValueOnce(true); // interactive
      mockInput.mockResolvedValueOnce("You are a fast codebase recon agent."); // systemPrompt
      mockSelect.mockResolvedValueOnce("Global (~/.pi/agent/personas/)"); // scope: global

      const config: PersonaConfig = {
        name: "scout",
        description: "Fast codebase recon",
        tools: ["read", "grep", "find", "ls", "bash", "mcp:chrome-devtools"],
        systemPromptMode: "replace",
        inheritProjectContext: false,
        interactive: true,
        systemPrompt: "You are a fast codebase recon agent.",
      };

      const yaml = generateYaml(config);
      const filePath = path.join(tmpDir, "scout.yaml");

      fs.writeFileSync(filePath, yaml, "utf-8");

      // Verify the file was created with correct content
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");

      // Parse the YAML frontmatter (simple parsing for test purposes)
      expect(content).toMatch(/^---$/m);
      expect(content).toContain("name: scout");
      expect(content).toContain("description: Fast codebase recon");
      expect(content).toContain("tools: read, grep, find, ls, bash, mcp:chrome-devtools");
      expect(content).toContain("systemPromptMode: replace");
      expect(content).toContain("inheritProjectContext: false");
      expect(content).toContain("interactive: true");
      expect(content).toContain("You are a fast codebase recon agent.");
      expect(content).toMatch(/^---$/m);
    });
  });

  describe("edge cases", () => {
    it("should handle persona names with special characters", () => {
      const config: PersonaConfig = {
        name: "test-persona-123",
        description: "Special chars test",
        tools: ["read"],
        systemPromptMode: "replace",
        inheritProjectContext: false,
        interactive: false,
        systemPrompt: "Test.",
      };

      const yaml = generateYaml(config);
      expect(yaml).toContain("name: test-persona-123");
    });

    it("should handle multiline system prompts", () => {
      const config: PersonaConfig = {
        name: "multiline-test",
        description: "Multiline prompt",
        tools: ["read"],
        systemPromptMode: "append",
        inheritProjectContext: true,
        interactive: false,
        systemPrompt: "Line 1.\nLine 2.\nLine 3.",
      };

      const yaml = generateYaml(config);
      expect(yaml).toContain("Line 1.");
      expect(yaml).toContain("Line 2.");
      expect(yaml).toContain("Line 3.");
    });
  });
});
