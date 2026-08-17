# dsh-agents-roles

A DeepSeek Harness dynamic Cordis plugin: an **LLM agents roles ladder** derived from [oh-my-pi](https://omp.sh/docs/roles) default roles — Default, Small, Slow, Vision, Plan, Designer, Commit, Tiny, Task, Advisor.

Each role maps to a `provider/model` (plus an optional reasoning effort) configured by the user; the ladder routes every agent call to the right role's model.

- **Repository:** https://github.com/dnviti/dsh-agents-roles.git
- **Clone:** `git clone https://github.com/dnviti/dsh-agents-roles.git`

## Features

- **Per-role routing** — `agent/request` waterfall rewrites each agent call to its role's model and effort (effort applied only when the model offers that level).
- **Escalation** — `llm/stream` / `agent/request-error` climb to the next configured role on failure.
- **Auto routing** — user messages route themselves: images → the configured **vision** role (the harness image gate passes because the composer auto-selects the vision model and the model declares `input: [text, image]`); text is classified against a **categories** map (word match) to its role; unmatched messages use the base role.
- **Workflow integration** — when the workflows plugin is enabled, workflow agents are auto-routed by role (`@role:<id>` forces a role, `@no-role` bypasses).
- **Chat UX** — per-response model badge; the composer model pill is replaced by a **read-only roles-ladder pill** (same UI as the standard selector, display-only) when enabled; plain model select fallback when disabled.
- **Settings page** — clean role list + popup editors, categories popup, silent enable switch, always persisted to `.dsh-agents-roles.json`.
- **Tools** — `roles_status`, `roles_configure`, `roles_spawn`, `roles_assign`.

## Installation

### Prerequisites

- DSH Desktop (web GUI) running.
- `git` on the machine (only needed to clone; the in-session path below also works by copying the two files).

### Option A — Dynamic plugin (recommended, per session)

DSH loads this as a **dynamic Cordis plugin**. The two halves live in this repo:

- `host.js` — Host half: routing, escalation, auto-routing, RPC handlers, tools.
- `client.js` — Client half: settings page, composer pill, vision model switch, response badges.

Steps:

1. Clone the repo (or just copy `host.js` and `client.js`):
   ```sh
   git clone https://github.com/dnviti/dsh-agents-roles.git
   ```

2. In a DSH session, create the plugin with the Cordis plugin tooling (the `cordis_define` / `cordis_run` tools — available to any agent, or via the Plugins surface):
   - **Host code:** paste the object literal from `host.js` — everything after `module.exports =` (it is a Cordis plugin object `{ name, apply }`).
   - **Client code:** paste the object literal from `client.js` — everything after `module.exports =` (`{ name, inject: ['slots', 'timer'], apply }`).
   - Activate the package (approve the Client half when prompted).

3. Open **Settings → Roles** to configure the ladder.

### Option B — Deployment bundle (host features at startup)

Register the plugin as a profile bundle so the **host** half loads with the harness:

1. Add the dependency to your DSH profile (`~/.dsh/profiles/desktop/package.json`):
   ```json
   {
     "dependencies": {
       "dsh-agents-roles": "github:dnviti/dsh-agents-roles.git"
     },
     "dsh": {
       "profile": {
         "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-agents-roles"]
       }
     }
   }
   ```
2. Install the profile dependencies (`npm install` inside the profile directory) and restart DSH. The package's `cordis.patch.yml` registers the `agents-roles` host row at startup.

> Note: the **client** features (settings page, composer roles pill, response badges) activate when the plugin runs as a dynamic plugin in a session (Option A) — the web client module system is session-scoped. For full coverage, run Option A on top of Option B.

## Configuration

- **Roles, models, efforts, categories, default role:** **Settings → Roles** (or the `roles_configure` tool). Changes are **auto-persisted** to `.dsh-agents-roles.json` in the harness process working directory (e.g. the DSH Desktop app folder).
- **Vision models:** declare image input in `~/.dsh/settings.yaml` under `llm-pi-ai.providers.<provider>.models`:
  ```yaml
  llm-pi-ai:
    providers:
      openrouter:
        models:
          - id: MiniMax M3
            name: minimax/minimax-m3
            input: [text, image]
  ```
  Without `input: [text, image]` the harness treats the model as text-only and rejects image prompts.
- **Workflow routing:** enabled automatically when the workflows plugin is present. Workflow agents pick a role via `@role:<id>` in their label/phase, or bypass routing with `@no-role`.

## Roles (oh-my-pi defaults)

| role | label |
| --- | --- |
| default | Default |
| smol | Small |
| slow | Slow |
| vision | Vision |
| plan | Plan |
| designer | Designer |
| commit | Commit |
| tiny | Tiny |
| task | Task |
| advisor | Advisor |

## Layout

- `host.js` — Host half (exports the Cordis plugin object).
- `client.js` — Client half (exports the Cordis plugin object; injects `slots` and `timer`).
- `cordis.patch.yml` — Deployment plugin row (used by Option B).
- `package.json` — Package metadata (main = `host.js`).

## Verification

- In a session, ask the agent to run `roles_status` — expect `enabled: true`, every role with a provider/model, `auto-vision: active`.
- In the chat: the composer shows the read-only roles pill (current role · model); every assistant response carries a `provider/model` badge; attaching an image auto-routes to the vision model.
