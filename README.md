# dsh-agents-roles

A DeepSeek Harness dynamic Cordis plugin: an **LLM agents roles ladder** derived from [oh-my-pi](https://omp.sh/docs/roles) default roles — Default, Small, Slow, Vision, Plan, Designer, Commit, Tiny, Task, Advisor.

Each role maps to a provider/model (plus an optional reasoning effort) configured by the user; the ladder routes every agent call to the right role's model.

## Features

- **Per-role routing** — gent/request waterfall rewrites each agent call to its role's model and effort (effort applied only when the model offers that level).
- **Escalation** — llm/stream / gent/request-error climb to the next configured role on failure.
- **Auto routing** — user messages route themselves: images → the configured **vision** role (harness image gate passes because the composer auto-selects the vision model and the model declares input: [text, image]); text is classified against a **categories** map (word match) to its role; unmatched messages use the base role.
- **Workflow integration** — when the workflows plugin is enabled, workflow agents are auto-routed by role (@role:<id> forces a role, @no-role bypasses).
- **Chat UX** — per-response model badge; the composer model pill is replaced by a **roles-ladder selector** when enabled (plain model select fallback when disabled).
- **Settings page** — clean role list + popup editors, categories popup, silent enable switch, always persisted to .dsh-agents-roles.json.
- **Tools** — oles_status, oles_configure, oles_spawn, oles_assign.

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

- host.js — Host half (routing, escalation, auto-routing, RPC, tools).
- client.js — Client half (settings page, composer selector, vision model switch, response badge).

## Config

Auto-persisted to .dsh-agents-roles.json (in the harness process cwd). Loaded at plugin start; every mutating action rewrites it.
