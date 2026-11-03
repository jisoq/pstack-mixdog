# Install pstack in Mixdog

The user asked you to install this plugin, or `harness/WORKFLOW.md` sent you here because the plugin's setup changed. Mixdog plugins ship only skills, so this file sets up the rest and keeps it in line with the plugin: the programs pstack's scripts need, the Poteto mode workflow, and the five pstack agents. Running it again is safe, because each step changes only what is missing or different. Never ask the user about the workflow or the agents.

When a saved Poteto mode workflow sent you here during a task and you have not read `<root>/harness/WORKFLOW.md` in this conversation, read it in full before step 1. This run is the sync its setup stamp rule asks for.

`<root>` is the absolute path of the folder that holds this file's `harness/` folder. It is the `root` that `setup` `status plugins` reports for the plugin whose source is `https://github.com/jisoq/pstack-mixdog`.

1. Programs. Run every check in Dependencies below. For each missing program, tell the user in one sentence what it is and which pstack steps need it, from its Needed by column. Then ask with `ask_user`, multi-select, which of the missing programs to install. Ask nothing when every program is present. Install only the chosen ones, one at a time, with the row's command, and rerun its check. Result: each program is present or declined.
2. Workflow. Take `<root>/harness/SAVED-WORKFLOW.md` with `{{PLUGIN_ROOT}}` written as `<root>` and `{{SETUP_STAMP}}` as the current setup stamp that `<root>/harness/WORKFLOW.md` names. When `setup` `read_definition` finds no `poteto-mode` workflow, create it with `setup` `create_definition`: kind `workflow`, the id, name, and description from that file's frontmatter, and the body below its frontmatter. Never make it the active workflow. When the workflow exists and its name, description, or body differs from the file, save the file's version with `setup` `save_definition`. Result: the workflow exists and matches the file.
3. Agents. Read each agent in `<root>/harness/agents.md` with `setup` `read_definition`. The body is the file's, with `{{PLUGIN_ROOT}}` written as `<root>`. Create a missing one with `setup` `create_definition`, using `kind: "agent"`, its id as the name, and the file's description and body, then turn it off with `setup` `set_agent_route` and `route: {"disabled": true}`, without a model. When an existing one's description or body differs from the file, save the file's description and body with `setup` `save_definition`. Never change an existing agent's route. Result: the five pstack agents exist and match the file.
4. Reply. Say in one line what steps 2 and 3 changed, and name the declined programs, whose pstack steps are skipped until the user asks you to follow this file again. When step 3 created agents, add that each needs a model picked and turned on in Mixdog's agent settings, and that the Suggested route column of `<root>/harness/agents.md` is one working setup. When the user asked for this install, then say how to start: pick Poteto mode in the composer's workflow selector for a conversation, or select a `$pstack-<name>` skill in any conversation. When you came here during a task, say nothing when nothing changed, then follow `<root>/harness/WORKFLOW.md` for the task, after reading it in full if you have not.

## Dependencies

| Dependency | Needed by | Check | Install on Windows |
| --- | --- | --- | --- |
| git | Every playbook that touches a repository | `git --version` | `winget install --id Git.Git -e` |
| GitHub CLI | PR steps, Babysit, Shipping, Autopilot, recall, why | `gh --version`, then `gh auth status` | `winget install --id GitHub.cli -e`. The user signs in with `gh auth login` through the `terminal` tool. |
| Node 22.18 or later | statechart, `check-plan.mjs` | `node --version` | `winget install --id OpenJS.NodeJS.LTS -e` |
| Bun | `watch-pr` | `bun --version`, or `& "$env:USERPROFILE\.bun\bin\bun.exe" --version` | Download `https://bun.sh/install.ps1` to a file, read it, then run `powershell -NoProfile -ExecutionPolicy Bypass -File <file>`. |
| bash | `worktree-audit.sh`, `log.sh` | Git for Windows' bash beside `git`: `& (Join-Path (Split-Path (Split-Path (Get-Command git).Source)) 'bin\bash.exe') --version`. Never check plain `bash`, which on Windows usually resolves to the WSL launcher and fails without a Linux distribution. | Ships with Git for Windows. |
| jq | Worktree cleanup (`worktree-audit.sh`) | `jq --version` | `winget install --id jqlang.jq -e` |
| mise | statechart, whose first run installs TLC and Java with it. On Windows it keeps mise's download cache in `%LOCALAPPDATA%\mise\cache` unless `MISE_CACHE_DIR` is set, because mise's default under `TEMP` passes the 260-character path limit. | `mise --version` | `winget install --id jdx.mise -e` |

A dependency the user declines stays missing, and pstack skips the steps that need it. A `winget` install can show a Windows permission prompt. A new PATH entry reaches Mixdog's `shell` only after Mixdog restarts, so use the full path until then.
