# Persona Extension

A Pi coding agent extension that manages custom personas — reusable configurations that restrict tools and inject system prompts.

## Quick Start

```bash
/persona create          # Create a new persona via wizard
/persona list            # List all available personas
/persona <name>          # Activate a persona
/persona none            # Clear active persona
/persona edit <name>     # Edit an existing persona
/persona delete <name>   # Delete a persona
```

## Architecture

### File Structure

```
persona/
├── index.ts                    # Main extension entry — event handlers + /persona command
├── persona-wizard.ts           # Wizard flow for create/edit (multi-step UI)
├── multi-select-list.ts        # Reusable checkbox list component for tool selection
├── persona-indicator.ts        # TUI widget showing active persona in widget area
├── utils.ts                    # Shared utilities: loadPersona, deletePersona, etc.
├── package.json                # Dependencies + test config
├── jest.config.js              # Jest configuration (mocks, moduleNameMapper)
├── tsconfig.json               # TypeScript config
└── test/                       # All tests
    ├── persona-wizard.test.ts  # Wizard + YAML generation + CRUD tests
    ├── multi-select-list.test.ts # MultiSelectList component tests
    ├── persona-indicator.test.ts # PersonaIndicator widget tests
    └── __mocks__/              # Jest mocks for Pi SDK
        ├── @earendil-works/pi-coding-agent.ts
        ├── @earendil-works/pi-tui.ts
        └── @earendil-works/types.d.ts
```

### Data Flow

```
User: /persona create
  → runPersonaWizard()          # persona-wizard.ts
    → askInput() (name, desc, prompt)
    → askToolsSelect()          # multi-select checkbox UI
    → askSelect() (mode, scope)
    → askConfirm() (inherit, interactive)
    → runWizard() saves YAML

User: /persona <name>
  → index.ts handler
    → loadPersona(name)         # utils.ts — reads YAML from disk
    → pi.setActiveTools()       # restrict tools to persona's list
    → currentPersona = loaded   # set global state
    → before_agent_start fires  # inject system prompt

User: /persona edit <name>
  → runEditPersonaWizard()      # persona-wizard.ts
    → runWizard(existingPersona) # same wizard, pre-filled values
    → saves new YAML
    → deletes old file if name/scope changed
```

### Key Files

#### `index.ts` — Main Entry Point

Exports a default function that registers the `/persona` command. Manages:

- **Global state**: `currentPersona` (LoadedPersona | null), `originalTools` (string[] | null)
- **Ephemeral personas**: `ephemeralPersonas` Map (cleared on session restart/fork/resume)
- **Events**:
  - `session_shutdown` — clears ephemeral personas
  - `before_agent_start` — sets PersonaIndicator widget + injects system prompt
  - `before_provider_request` — placeholder for debugging

**Command routing** (in order):
1. `create` → `runPersonaWizard()`
2. `list` → shows persona list in widget
3. `delete <name>` → deletes from global or project scope
4. `edit <name>` → loads persona, opens edit wizard
5. `<persona-name>` → activates persona (restricts tools, injects prompt)
6. `none` / empty → clears active persona

**Autocomplete** (`getArgumentCompletions`):
- Commands: `create`, `list`, `delete`, `edit`
- Personas: `[persona] <name>` prefix for activation
- Delete/edit: `<scope-emoji> <name>` (🌍 global, 📁 project, ⚡ ephemeral)

#### `persona-wizard.ts` — Wizard Flow

**Types**:
- `PersonaConfig` — persona data (name, description, tools, systemPromptMode, etc.)
- `LoadedPersona` — PersonaConfig + scope + filePath
- `SystemPromptMode` enum: `REPLACE`, `APPEND`
- `PersonaScope` enum: `GLOBAL`, `PROJECT`, `EPHEMERAL`

**Functions**:
- `runPersonaWizard(pi, ctx)` — entry point for `/persona create`
- `runEditPersonaWizard(pi, ctx, persona)` — entry point for `/persona edit <name>`
- `runWizard(pi, ctx, existingPersona)` — shared wizard logic
  - Step 1: Name (validated, sanitized to lowercase+hyphens)
  - Step 2: Description
  - Step 3: Tools (multi-select checkbox UI)
  - Step 4: System prompt mode (replace/append)
  - Step 5: Inherit project context (boolean)
  - Step 6: Interactive (boolean)
  - Step 7: System prompt (multiline input)
  - Step 8: Scope (global/project/ephemeral)
- `generateYaml(config)` — generates YAML frontmatter + system prompt
- `listPersonas(ephemeral)` — lists all personas from disk + memory

**Edit behavior**: When `existingPersona` is provided, the wizard pre-fills all fields with existing values. If name or scope changes, the old file is deleted before writing the new one.

#### `multi-select-list.ts` — Checkbox Component

Custom TUI component because Pi's `SelectList` is single-select only.

- Supports keyboard navigation: ↑↓, space (toggle), Ctrl+A (select all), Enter (continue), Esc (cancel)
- `onEmpty` callback fires when no items selected
- `onSelect` / `onCancel` callbacks for completion
- `getSelectedValues()` returns selected item values

#### `persona-indicator.ts` — TUI Widget

Displays active persona in the widget area (above/below editor).

- Shows: name, description, tools count, prompt mode
- Scope emojis: 🌍 global, 📁 project, ⚡ ephemeral
- Caching + invalidation for performance
- Line truncation for long descriptions

#### `utils.ts` — Shared Utilities

- `loadPersona(name)` — loads persona from global or project YAML file
- `deletePersona(name, scope)` — deletes persona YAML file
- `parseYamlFrontmatter(content)` — parses YAML frontmatter (no external deps)
- `getScopeEmoji(scope)` — returns emoji for scope type

### Storage Locations

| Scope | Path | Persistence |
|-------|------|-------------|
| Global | `~/.pi/agent/personas/<name>.yaml` | Disk |
| Project | `.pi/personas/<name>.yaml` | Disk |
| Ephemeral | In-memory Map | Lost on restart |

### YAML Format

```yaml
---
name: scout
description: Fast codebase recon
tools: read, grep, find, ls
systemPromptMode: replace
inheritProjectContext: false
interactive: true
---

Your system prompt goes here.
```

- Filename = sanitized name (lowercase, spaces → hyphens)
- `systemPromptMode`: `replace` (overwrite) or `append` (add to end)
- `tools`: comma-separated list of tool names

## Testing

```bash
# Run all tests
npx jest

# Run specific test file
npx jest test/persona-wizard.test.ts

# Run with coverage
npx jest --coverage
```

**Test structure**:
- All tests in `test/` directory
- Mocks in `test/__mocks__/` (redirected via `moduleNameMapper` in `jest.config.js`)
- Mocked UI methods: `input`, `select`, `confirm`, `notify`, `custom`, `setWidget`
- `mockCustom` implementation simulates multi-select completion by calling `handleInput("enter")`

**Current test count**: 52 tests across 3 suites (persona-wizard, multi-select-list, persona-indicator)

## Key Patterns & Conventions

### Enum Naming
- Properties are UPPER_CASE with lowercase values: `SystemPromptMode.REPLACE` → `"replace"`

### Name Sanitization
```typescript
const sanitizedName = name.toLowerCase().replace(/\s+/g, "-");
// "My Persona" → "my-persona"
```

### UI Method Return Values
- `ui.select()` returns **label string** (not index) — use `options.find(o => o.label === result)`
- `ui.input()` returns string or null (null = cancelled)
- `ui.confirm()` returns boolean
- `ui.notify()` takes (message, level?) — level is "success", "error", "warn", "info"

### Key Identifiers
- Use string literals matching Pi's `matchesKey` API: `"space"`, `"ctrl+a"`, `"enter"`, `"escape"`
- NOT: `Key.SPACE` or `" "` or `"ctrl(a)"`

### Mock Setup Pattern
```typescript
mockInput.mockReset().mockResolvedValue("default");
mockSelect.mockReset().mockResolvedValue("Global (~/.pi/agent/personas/)");
mockConfirm.mockReset().mockResolvedValue(true);
mockCustom.mockImplementation((callback) => {
  const result = callback(mockTui, mockTheme, null, () => {});
  if (result?.handleInput) result.handleInput("enter");
});
```

### Git Workflow
- **NEVER** push directly to master — always create feature branch, open PR
- Commit messages: `<gitmoji> #<ticket> <description>` (e.g., `🐛 #bugfix Fix edit persona`)
- Extensions directory excluded from `~/.pi` config repo (`my-pi-coding-agent`)

## Common Tasks

### Add a new wizard step
1. Add prompt in `runWizard()` (after existing steps)
2. Call appropriate helper: `askInput()`, `askSelect()`, `askConfirm()`
3. Pre-fill from `existingPersona?.<field>` if editing
4. Add to `PersonaConfig` interface if needed
5. Add to `generateYaml()` output
6. Update tests

### Add a new command
1. Add routing in `index.ts` handler (before persona activation block)
2. Add autocomplete in `getArgumentCompletions()`
3. Import/export functions from other files as needed

### Add a new TUI component
1. Create file in root (e.g., `new-component.ts`)
2. Use `@earendil-works/pi-tui` types (Container, Text, Component)
3. Implement `render(width)` and `invalidate()` methods
4. Register widget via `ctx.ui.setWidget("key", renderFn)`

### Debugging
- Uncomment `console.log(JSON.stringify(event.payload, null, 2))` in `before_provider_request`
- Use `ctx.ui.notify()` for intermediate values during wizard flow
- Check `~/.pi/agent/personas/` for YAML files
- Run `npx jest --verbose` for detailed test output
