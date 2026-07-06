<div align="center">
  <img src="https://i.postimg.cc/L8zZgntL/persona.jpg" alt="persona banner" style="max-width:800px;">
</div>

# persona

A Pi extension that lets you create reusable personas — configurations that restrict which tools the agent can use and inject custom system prompts. Think of them as specialized modes for your Pi agent.

## 📦 Installation

```bash
pi install npm:@isr4el-silv4/persona
```

## 🎭 What Are Personas?

Personas let you constrain and customize the agent's behavior. Each persona defines:

- **A subset of tools** — restrict the agent to only the tools it needs
- **A system prompt** — custom instructions that shape how the agent behaves
- **A scope** — global (all projects), project-local, or ephemeral (one session only)

### 💡 Example Personas

- **Scout** — only `read`, `grep`, `find`, `ls` for fast codebase exploration
- **Reviewer** — only `read` and `grep` for reading and reviewing code
- **Architect** — full tool access with a system prompt focused on design decisions
- **Bug Hunter** — restricted tools with instructions to focus on debugging

### ⚙️ Script Tools Exception

Tools registered via [pi-script-tools](https://pi.dev/packages/@isr4el-silv4/pi-script-tools?name=isr4el-silv4) (shell scripts with the `_sh` suffix, such as `status_sh`, `deploy_sh`, etc.) are **always available** regardless of the persona's tool restrictions. This exception ensures that project scripts remain accessible in every persona without needing to be listed explicitly in each persona's `tools:` field.

### 🌐 Browser Tools Exception

Tools registered via [pi-web-ui](https://pi.dev/packages/@isr4el-silv4/pi-web-ui?name=isr4el-silv4) (browser tools with the `browser_` prefix, such as `browser_list_tabs`, `browser_get_page_html`, etc.) are **always available** regardless of the persona's tool restrictions. This exception ensures that browser automation capabilities remain accessible in every persona without needing to be listed explicitly in each persona's `tools:` field.

## 🚀 Usage

### ✨ Create a Persona

```bash
/persona create
```

Starts an interactive wizard that walks you through:

1. **Name** — e.g., `scout` (lowercase, hyphens for spaces)
2. **Description** — short summary shown in the UI
3. **Tools** — pick which tools the persona can use (checkbox list)
4. **System prompt mode** — `replace` (overwrite Pi's default) or `append` (add to it)
5. **Inherit project context** — include project-level instructions
6. **Interactive** — allow the agent to ask you questions
7. **System prompt** — the actual instructions for the agent
8. **Scope** — global, project, or ephemeral

### ▶️ Activate a Persona

```bash
/persona scout
```

The agent will now use only the tools and instructions defined by that persona. A badge appears in the UI showing the active persona.

### 📋 List Available Personas

```bash
/persona list
```

Shows all personas with their scope (🌍 global, 📁 project, ⚡ ephemeral).

### ✏️ Edit a Persona

```bash
/persona edit scout
```

Re-opens the wizard pre-filled with the persona's current values. Change anything and save.

### 🗑️ Delete a Persona

```bash
/persona delete scout
```

Removes the persona from disk.

### 🔄 Clear Active Persona

```bash
/persona none
```

Returns the agent to its default tool set and system prompt.

## 🌐 Scopes

| Scope | Where It's Stored | When To Use |
|-------|-------------------|-------------|
| **Global** | `~/.pi/agent/personas/` | Personas you use across all projects |
| **Project** | `.pi/personas/` | Personas specific to the current project |
| **Ephemeral** | In-memory only | Quick one-off personas that disappear after the session |

## 📝 System Prompt Modes

- **`replace`** — Your prompt completely replaces Pi's default system prompt. Use this for focused personas that shouldn't know about general-purpose behavior.
- **`append`** — Your prompt is added to the end of Pi's default. Use this to add constraints or instructions on top of the default behavior.

## 💎 Tips

- Use **ephemeral** scope to experiment with a persona before saving it permanently
- Name personas with short, descriptive names — you'll type them often
- Use `append` mode when you want the agent to keep its general capabilities while adding new constraints
- Use `replace` mode when you want a tightly focused agent with no extra behavior
