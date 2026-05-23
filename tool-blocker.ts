import type { LoadedPersona } from "./persona-wizard";

/**
 * Check whether a tool call should be blocked given the currently active persona.
 *
 * @param currentPersona - The active persona, or `null` if none is active.
 * @param toolName - The name of the tool the model attempted to invoke.
 * @returns `null` if the call is allowed, or a `{ block, reason }` object if it should be blocked.
 */
export function checkToolBlock(
  currentPersona: LoadedPersona | null,
  toolName: string,
): { block: true; reason: string } | null {
  if (!currentPersona) return null;

  if (!currentPersona.tools.includes(toolName)) {
    return {
      block: true,
      reason: `Tool "${toolName}" is not allowed by persona "${currentPersona.name}"`,
    };
  }

  return null;
}

/**
 * Build the notification message shown to the user when a tool is blocked.
 */
export function buildBlockNotification(
  toolName: string,
  personaName: string,
): string {
  return `🚫 Blocked: The model attempted to use "${toolName}", which is not allowed by the active persona "${personaName}".`;
}
