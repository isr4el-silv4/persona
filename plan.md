# Persona Tool Blocking — Implementation Plan

## Goal

Block the execution of any tool that does **not** belong to the active persona's `tools` array, and notify the user when a block occurs.

---

## Implementation

### 1. Modify `index.ts`

Add a `pi.on("tool_call", ...)` event handler inside the default export function.

**Placement**: Right after the existing `pi.on("before_provider_request", ...)` handler, before `pi.registerCommand("persona", ...)`.

**Logic**:

```typescript
pi.on("tool_call", async (event, ctx) => {
  // Only block when a persona is active
  if (!currentPersona) return;

  // Check if the tool is NOT in the persona's allowed tools
  if (!currentPersona.tools.includes(event.toolName)) {
    ctx.ui.notify(
      `🚫 Blocked: The model attempted to use "${event.toolName}", which is not allowed by the active persona "${currentPersona.name}".`,
      "warn"
    );
    return { block: true, reason: `Tool "${event.toolName}" is not allowed by persona "${currentPersona.name}"` };
  }
});
```

### 2. Create `test/persona-tool-blocker.test.ts`

| # | Test Case |
|---|-----------|
| 1 | Tool call is **blocked** when tool is NOT in persona's `tools` array |
| 2 | Tool call is **allowed** when tool IS in persona's `tools` array |
| 3 | **No blocking** occurs when no persona is active (`currentPersona === null`) |
| 4 | Blocking works for **ephemeral** personas as well |
| 5 | User notification includes the **specific tool name** and persona name |

---

## Trade-offs

| Aspect | Consideration |
|--------|--------------|
| **Performance** | Minimal — the check is a simple `Array.includes()` on typically small arrays (< 20 tools) |
| **When handler runs** | The `tool_call` handler runs on **every tool invocation** when a persona is active. When no persona is active, it returns immediately (one null check) |
| **Notification frequency** | If the LLM repeatedly tries a blocked tool, the user will see repeated notifications. This is intentional — it makes the blocking visible |
| **No write to persona YAML** | This change only affects runtime behavior; persona YAML files remain unchanged |

---

## Definition of Done

- [x] `pi.on("tool_call", ...)` handler added to `index.ts`
- [x] Blocks tools NOT in `currentPersona.tools`
- [x] User is notified via `ctx.ui.notify()` with specific tool name and persona name
- [x] No blocking when `currentPersona` is `null`
- [x] Works for both file-based and ephemeral personas
- [x] Test file `test/persona-tool-blocker.test.ts` created with all 5 test cases
- [x] All tests pass (`npm test`)
