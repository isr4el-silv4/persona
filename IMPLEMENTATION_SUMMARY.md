# Implementation Summary: pi-web-ui Tool Bypass for Persona Extension

## Problem
The Persona extension was blocking tools that don't belong to the active persona, which prevented pi-web-ui browser tools (e.g., `browser_list_tabs`, `browser_get_page_html`, etc.) from working together with Persona. While script tools ending with `_sh` were already bypassed (via pi-script-tools), there was no similar bypass for pi-web-ui tools.

**Additionally**, even if the tools weren't blocked, they wouldn't be visible to the model because `pi.setActiveTools()` filters which tools the model can use based on the persona's `tools` array.

## Solution
The fix required **two** changes:

1. **Tool blocking bypass** (`tool-blocker.ts`): Allow `browser_` tools to bypass the persona tool blocking, similar to `_sh` tools
2. **Tool availability** (`index.ts`): Automatically include `browser_` tools in the active tools list when a persona is activated, so the model knows they exist

## Changes Made

### 1. `tool-blocker.ts`
Added a new condition to bypass tool blocking for pi-web-ui browser tools:
```typescript
// Browser tools (from pi-web-ui) are always allowed
if (toolName.startsWith('browser_')) return null;
```

### 2. `index.ts` - For ephemeral personas
Updated to include browser tools when activating ephemeral personas:
```typescript
const scriptToolNames = allTools.filter((t) => t.name.endsWith('_sh')).map((t) => t.name);
const browserToolNames = allTools.filter((t) => t.name.startsWith('browser_')).map((t) => t.name);
const mergedTools = [...new Set([...persona.tools, ...scriptToolNames, ...browserToolNames])];
pi.setActiveTools(mergedTools);
```

### 3. `index.ts` - For file-based personas
Updated to include browser tools when activating file-based personas:
```typescript
const scriptToolNames = allTools.filter((t) => t.name.endsWith('_sh')).map((t) => t.name);
const browserToolNames = allTools.filter((t) => t.name.startsWith('browser_')).map((t) => t.name);
const personaTools = [...new Set([...loaded.tools, ...scriptToolNames, ...browserToolNames])].filter((t) => availableToolNames.includes(t));
```

### 4. `test/persona-tool-blocker.test.ts`
Added 8 comprehensive tests (Tests 12-19) to verify:
- `browser_` tools are always allowed regardless of persona tools list
- `browser_` tools work with personas with empty tools list
- `browser_` tools work for ephemeral personas
- Non-`browser_` tools are still blocked when not in persona tools list
- Tools containing `browser_` but not starting with it are still blocked
- `browser_` tools are allowed even when no persona is active
- All 20 common pi-web-ui browser tools are allowed
- Both `_sh` and `browser_` tools can be used together

## Test Results
- All 22 tests in `persona-tool-blocker.test.ts` pass
- All 23 tests in `persona-activation.test.ts` pass (including 10 new tests for browser tools)
- All 105 tests across the entire test suite pass (up from 95)
- No regressions introduced

## How It Works

### Without Persona Active
- All tools are available to the model (default behavior)

### With Persona Active
1. **Ephemeral personas** (`ephemeralPersonas.has(trimmed)`):
   - The model sees: `persona.tools` + all `_sh` tools + all `browser_` tools
   - Tools outside this set are blocked

2. **File-based personas** (`loadPersona(trimmed)`):
   - The model sees: `loaded.tools` + all `_sh` tools + all `browser_` tools
   - Tools outside this set are blocked

### Tool Blocking Flow
1. When the model tries to use a tool, `checkToolBlock()` is called
2. If no persona is active → tool is allowed
3. If tool name ends with `_sh` → tool is allowed
4. If tool name starts with `browser_` → tool is allowed
5. If tool is in persona's `tools` array → tool is allowed
6. Otherwise → tool is blocked

## Browser Tools Now Allowed
The following pi-web-ui browser tools are now accessible regardless of the active persona:
- browser_list_tabs
- browser_get_current_tab
- browser_get_page_html
- browser_get_page_text
- browser_get_selection
- browser_capture_screenshot
- browser_get_console_logs
- browser_clear_console_log_buffer
- browser_start_network_capture
- browser_stop_network_capture
- browser_get_network_requests
- browser_get_network_request
- browser_get_network_response_body
- browser_attach_debugger
- browser_detach_debugger
- browser_send_cdp_command
- browser_evaluate_script
- browser_get_cookies
- browser_get_local_storage
- browser_get_session_storage

## Backward Compatibility
- All existing functionality preserved
- No breaking changes
- Existing `_sh` tool bypass still works as before
- Regular tool blocking for non-whitelisted tools continues to work
- Personas created before this update will automatically get `browser_` tools

## Future-Proofing
This pattern can be extended for other special tool categories by:
1. Adding a filter in `index.ts` to collect tools of that category
2. Adding a bypass condition in `tool-blocker.ts` to allow those tools
3. Including them in the `mergedTools` array for both ephemeral and file-based personas

Example for a hypothetical `ui_` tool category:
```typescript
// In index.ts
const uiToolNames = allTools.filter((t) => t.name.startsWith('ui_')).map((t) => t.name);
const mergedTools = [...new Set([...persona.tools, ...scriptToolNames, ...browserToolNames, ...uiToolNames])];

// In tool-blocker.ts
if (toolName.startsWith('ui_')) return null;
```
