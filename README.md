# dsh-agents-roles

An **LLM agents roles ladder** for DeepSeek Harness, derived from the
[oh-my-pi](https://omp.sh/docs/roles) default roles — Default, Small, Slow,
Vision, Plan, Designer, Commit, Tiny, Task, Advisor. Each role maps to a
`provider/model` (plus an optional reasoning effort); the ladder routes every
agent call to the right role's model.

![version](https://img.shields.io/badge/version-0.1.0-blue)

- **Repository:** https://github.com/dnviti/dsh-agents-roles.git

## Features

- **Per-role routing** — the `agent/request` waterfall rewrites each agent call
  to its role's model and effort (effort applied only when the model offers
  that level).
- **Escalation** — `llm/stream` / `agent/request-error` climb to the next
  configured role on failure.
- **Auto routing** — user messages route themselves: images → the configured
  **vision** role (the harness image gate passes because the composer
  auto-selects the vision model and the model declares `input: [text, image]`);
  text is classified against a **categories** map (word match) to its role;
  unmatched messages use the base role.
- **Workflow integration** — when the workflows plugin is enabled, workflow
  agents are auto-routed by role (`@role:<id>` forces a role, `@no-role`
  bypasses).
- **Chat UX** — per-response model badge; the composer model pill is replaced
  by a **read-only roles-ladder pill** (same UI as the standard selector,
  display-only) when enabled; plain model select fallback when disabled.
- **Settings page** — clean role list + popup editors, categories popup,
  silent enable switch, always persisted to `.dsh-agents-roles.json`.
- **Tools** — `roles_status`, `roles_configure`, `roles_spawn`, `roles_assign`.

## Install

Requires a DSH profile (this repo's examples use the `desktop` profile — use
whichever profile your app boots; `~/.dsh/profiles/<name>`). This package
declares `dsh.bundle.patch`, so installing it activates it as a profile
*bundle layer* automatically: `dsh plugin` appends it to the profile's
`dsh.profile.bundles`, and the bundled `cordis.patch.yml` registers the loader
entry at boot — no manual profile editing.

```powershell
# install the package into the profile's node_modules (forwards to pnpm);
# the bundle layer and loader entry are wired up automatically
dsh plugin --profile desktop -- add https://github.com/dnviti/dsh-agents-roles.git
```

```powershell
# verify the entry composes, then restart the app
dsh --profile desktop --dump-config | Select-String agents-roles
```

After restart:

- the host half (routing, escalation, auto-routing, `roles_*` tools) is active
  at startup;
- the client half appears on **Settings → Roles** (configure the ladder there),
  the composer shows the read-only roles pill, and every assistant response
  carries a `provider/model` badge.

> **Do not** also append the `dsh-agents-roles` insert to the profile's own
> `cordis.patch.yml` — the bundle patch supplies it, and a duplicate loader
> entry id fails boot.
>
> Plugin-set changes take effect on restart (package metadata is cached per
> name).

> Earlier releases shipped the plugin as a *dynamic* per-session Cordis plugin
> (paste the two halves into the cordis tooling, no restart or profile
> change). That form is preserved in this repository's git history; the
> current release is the static bundle form only.

## Configuration

- **Roles, models, efforts, categories, default role:** **Settings → Roles**
  (or the `roles_configure` tool). Changes are **auto-persisted** to
  `.dsh-agents-roles.json` in the harness process working directory (e.g. the
  DSH Desktop app folder).
- **Vision models:** declare image input in `~/.dsh/settings.yaml` under
  `llm-pi-ai.providers.<provider>.models`:
  ```yaml
  llm-pi-ai:
    providers:
      openrouter:
        models:
          - id: MiniMax M3
            name: minimax/minimax-m3
            input: [text, image]
  ```
  Without `input: [text, image]` the harness treats the model as text-only and
  rejects image prompts.
- **Workflow routing:** enabled automatically when the workflows plugin is
  present. Workflow agents pick a role via `@role:<id>` in their label/phase,
  or bypass routing with `@no-role`.

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

## Package layout

- `cordis.patch.yml` — the bundle patch: registers the `dsh-agents-roles`
  loader entry (applied automatically while the package is a profile bundle).
- `lib/index.js` — host half: routing, escalation, auto-routing, the `roles/*`
  Remote endpoints, and the `roles_*` tools.
- `lib/client.js` — client half: registers via `window.__ModuleLoader__.load`
  and hooks the settings, composer, and chat slots.

## Development

No build step and no runtime npm dependencies: the bundle is hand-authored
plain JavaScript (React via `require("react")`, timers via the Cordis `timer`
service, styles via a managed `<style>` tag).

```powershell
node --check lib/client.js
node --check lib/index.js
```

## License

MIT — see [LICENSE](LICENSE).
