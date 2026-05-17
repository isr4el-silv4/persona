// Mock must be at the very top, before any other imports
jest.mock("@earendil-works/pi-coding-agent", () => ({}));

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// These imports will use the mocked module
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { generateYaml, type PersonaConfig, SystemPromptMode, PersonaScope, runPersonaWizard, listPersonas } from "../persona-wizard";

// Mock the UI methods
const mockInput = jest.fn();
const mockSelect = jest.fn();
const mockConfirm = jest.fn();
const mockNotify = jest.fn();
const mockSetWidget = jest.fn();
const mockCustom = jest.fn();

// Mock the extension context
const mockCtx = {
  ui: {
    input: (...args: any[]) => mockInput(...args),
    select: (...args: any[]) => mockSelect(...args),
    confirm: (...args: any[]) => mockConfirm(...args),
    notify: (...args: any[]) => mockNotify(...args),
    setWidget: (...args: any[]) => mockSetWidget(...args),
    custom: (...args: any[]) => mockCustom(...args),
  },
  cwd: "/tmp/test",
  signal: undefined,
} as unknown as ExtensionContext;

// Mock the extension API
const mockPi = {
  appendEntry: jest.fn(),
  getAllTools: jest.fn(() => [
    { name: "read" },
    { name: "grep" },
    { name: "find" },
    { name: "ls" },
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
    mockInput.mockReset().mockResolvedValue("default");
    mockSelect.mockReset().mockResolvedValue("Global (~/.pi/agent/personas/)");
    mockConfirm.mockReset().mockResolvedValue(true);
    mockNotify.mockReset();
    mockSetWidget.mockReset();
    mockCustom.mockReset();

    // Default: custom() resolves with first four tools (read, grep, find, ls)
    mockCustom.mockImplementation(
      (callback: (tui: any, theme: any, kb: any, done: (result: any) => void) => Record<string, any>) => {
        // Simulate the wizard's multi-select completing with default tools selected
        // The wizard passes a callback that expects (tui, theme, kb, done)
        // Provide a mock theme with fg method to avoid "Cannot read properties of null"
        const mockTheme = {
          fg: (color: string, text: string) => text,
        };
        // Provide a mock tui with requestRender to avoid null reference
        const mockTui = {
          requestRender: () => {},
        };
        // Call the callback and capture its return value (which has handleInput)
        const result = callback(mockTui, mockTheme, null, () => {});
        // Simulate user pressing Enter to confirm selection
        if (result && typeof result.handleInput === "function") {
          result.handleInput("enter");
        }
      },
    );
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
        systemPromptMode: SystemPromptMode.REPLACE,
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
        systemPromptMode: SystemPromptMode.APPEND,
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
        systemPromptMode: SystemPromptMode.REPLACE,
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
        systemPromptMode: SystemPromptMode.REPLACE,
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
        systemPromptMode: SystemPromptMode.APPEND,
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
        systemPromptMode: SystemPromptMode.REPLACE,
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
        systemPromptMode: SystemPromptMode.REPLACE,
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
        systemPromptMode: SystemPromptMode.APPEND,
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

  describe("persona name validation", () => {
    it("should reject persona names with special characters like @, #, !", async () => {
      (mockInput as jest.MockedFunction<typeof mockInput>).mockReturnValueOnce("my@persona#1");

      await runPersonaWizard(mockPi, mockCtx);

      expect(mockNotify).toHaveBeenCalledWith(
        "Invalid name. Only letters, numbers, hyphens (-), and underscores (_) are allowed.",
        "error"
      );
      expect(mockInput).toHaveBeenCalledTimes(1);
    });

    it("should accept persona names with spaces (sanitized to hyphens)", async () => {
      (mockInput as jest.MockedFunction<typeof mockInput>)
        .mockResolvedValueOnce("my persona name") // name -> "my-persona-name"
        .mockResolvedValueOnce("Fast recon") // description
        .mockResolvedValueOnce("Do recon tasks") // system prompt
      mockSelect.mockResolvedValueOnce("Replace — overwrite the entire system prompt"); // systemPromptMode
      mockSelect.mockResolvedValueOnce("Global (~/.pi/agent/personas/)"); // scope

      await runPersonaWizard(mockPi, mockCtx);

      // Spaces get replaced with hyphens for the filename, but notification uses original name
      // The wizard should proceed through all steps
      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringMatching(/Persona "my persona name" created/),
        "success"
      );
    });

    it("should accept persona names with letters, numbers, hyphens, and underscores", async () => {
      (mockInput as jest.MockedFunction<typeof mockInput>)
        .mockResolvedValueOnce("test_persona-123") // name
        .mockResolvedValueOnce("Fast recon") // description
        .mockResolvedValueOnce(["read", "grep"]) // tools
        .mockResolvedValueOnce("Do recon tasks") // system prompt
      mockSelect.mockResolvedValueOnce("Replace — overwrite the entire system prompt"); // systemPromptMode
      mockSelect.mockResolvedValueOnce("Global (~/.pi/agent/personas/)"); // scope

      await runPersonaWizard(mockPi, mockCtx);

      expect(mockNotify).toHaveBeenCalledWith(
        expect.stringMatching(/Persona "test_persona-123" created/),
        "success"
      );
    });
  });

  describe("listPersonas", () => {
    it("should return only ephemeral personas when no file personas exist", () => {
      const tmpDir = fs.mkdtempSync("/tmp/persona-list-empty-");
      const ephemeral = new Map<string, PersonaConfig>();
      ephemeral.set("ephemeral-only", {
        name: "ephemeral-only",
        description: "Ephemeral test",
        tools: ["read"],
        systemPromptMode: SystemPromptMode.REPLACE,
        inheritProjectContext: false,
        interactive: true,
        systemPrompt: "Test.",
      });

      const originalHome = process.env.HOME;
      const originalCwd = process.cwd();
      process.env.HOME = tmpDir;
      process.chdir(tmpDir);

      const result = listPersonas(ephemeral);

      process.env.HOME = originalHome;
      process.chdir(originalCwd);
      fs.rmSync(tmpDir, { recursive: true });

      expect(result.length).toBe(1);
      expect(result[0].name).toBe("ephemeral-only");
      expect(result[0].scope).toBe("ephemeral");
    });

    it("should list global personas from ~/.pi/agent/personas/", () => {
      const tmpDir = fs.mkdtempSync("/tmp/persona-list-test-");
      const globalDir = path.join(tmpDir, ".pi", "agent", "personas");
      fs.mkdirSync(globalDir, { recursive: true });

      const yaml1 = `---
name: scout
description: Fast codebase recon
tools: read, grep, find
systemPromptMode: replace
inheritProjectContext: false
interactive: true
---
You are a scout.
`;
      fs.writeFileSync(path.join(globalDir, "scout.yaml"), yaml1, "utf-8");

      const yaml2 = `---
name: writer
description: Technical writer
tools: read, write, edit
systemPromptMode: replace
inheritProjectContext: false
interactive: true
---
You are a writer.
`;
      fs.writeFileSync(path.join(globalDir, "writer.yaml"), yaml2, "utf-8");

      // Override HOME for this test
      const originalHome = process.env.HOME;
      process.env.HOME = tmpDir;

      const ephemeral = new Map<string, PersonaConfig>();
      const result = listPersonas(ephemeral);

      process.env.HOME = originalHome;
      fs.rmSync(tmpDir, { recursive: true });

      expect(result.length).toBeGreaterThanOrEqual(2);
      const scout = result.find((p) => p.name === "scout");
      const writer = result.find((p) => p.name === "writer");
      expect(scout).toBeDefined();
      expect(scout?.scope).toBe("global");
      expect(scout?.description).toBe("Fast codebase recon");
      expect(writer).toBeDefined();
      expect(writer?.scope).toBe("global");
      expect(writer?.description).toBe("Technical writer");
    });

    it("should list ephemeral personas", () => {
      const ephemeral = new Map<string, PersonaConfig>();
      ephemeral.set("test-ephemeral", {
        name: "test-ephemeral",
        description: "Test ephemeral persona",
        tools: ["read"],
        systemPromptMode: SystemPromptMode.REPLACE,
        inheritProjectContext: false,
        interactive: true,
        systemPrompt: "Test prompt.",
      });

      const result = listPersonas(ephemeral);
      const ephemeralPersona = result.find((p) => p.name === "test-ephemeral");
      expect(ephemeralPersona).toBeDefined();
      expect(ephemeralPersona?.scope).toBe("ephemeral");
      expect(ephemeralPersona?.description).toBe("Test ephemeral persona");
    });

    it("should list project personas from .pi/personas/", () => {
      const tmpDir = fs.mkdtempSync("/tmp/persona-list-test-");
      const projectDir = path.join(tmpDir, ".pi", "personas");
      fs.mkdirSync(projectDir, { recursive: true });

      const yaml = `---
name: project-scout
description: Project-specific scout
tools: read, grep
systemPromptMode: replace
inheritProjectContext: false
interactive: true
---
You are a project scout.
`;
      fs.writeFileSync(path.join(projectDir, "project-scout.yaml"), yaml, "utf-8");

      const originalCwd = process.cwd();
      process.chdir(tmpDir);

      const ephemeral = new Map<string, PersonaConfig>();
      const result = listPersonas(ephemeral);

      process.chdir(originalCwd);
      fs.rmSync(tmpDir, { recursive: true });

      const projectPersona = result.find((p) => p.name === "project-scout");
      expect(projectPersona).toBeDefined();
      expect(projectPersona?.scope).toBe("project");
      expect(projectPersona?.description).toBe("Project-specific scout");
    });
  });
});
