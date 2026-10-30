# pstack in Mixdog

pstack skills use Cursor names. In Mixdog, read this file once per conversation, then map each Cursor name in a skill with the tables below. `<pstack>` means the folder that holds `skills/`, `agents/`, and `docs/`. It is the `upstream` folder of the Mixdog `pstack` plugin, and the `pstack` skill gives its absolute path. If a Cursor field has no row, drop it and say so. Never pass a field or value the Mixdog tool schema rejects.

## Precedence

- pstack runs only for the task the user routed to it. The user routes a task by selecting `$pstack`, by naming pstack or a pstack skill, or by switching the conversation to the Poteto mode workflow. Other work in Mixdog ignores pstack.
- While it runs, the pstack skill decides the procedure. That covers the playbook and its todolist, the principles, when to delegate and to whom, review, verification, and the shape of the reply. It replaces the guidance of Mixdog's active workflow and orchestration mode for that task.
- Mixdog's tool schemas, tool routing, and safety rules still decide how each step runs. That includes the rules on destructive actions and on never discarding work you did not create.
- A commit, push, PR, merge, release, or deploy step runs only when the user's request covers it. The request covers it when it names the step, when the user picked a playbook built around it (Hillclimb's commits, Babysit, Shipping, Autopilot-full, Autopilot-stack, Opening a PR), or under a full-autonomy grant ("going to bed, land the stack", "don't ask me before committing"). Otherwise finish every step before it, leave the change ready, and name the pending step in the reply. pstack's Always pause list applies on top of this.
- Mixdog's language setting picks the reply language. pstack's Writing the reply section decides everything else about the reply.

## Tools

| Cursor | Mixdog |
| --- | --- |
| `Task` | `agent` with `type: "spawn"`. The brief goes in `prompt`. Give each scope one stable `tag`. Reports arrive as task notifications, so never poll. |
| `AskQuestion` | `ask_user`, with two to four options per question. An open question goes in plain text. |
| Open a todolist | Keep the list in your reply and update it at each phase. Mixdog has no per-turn todo tool. When the work spans turns (Autonomous run, Orchestrate, Autopilot, Multi-phase plan, `/loop`), also track it with the `goal` tool after loading the goal-management skill. A goal task holds at most 500 characters, so the reply keeps the verbatim step text. |
| Run another pstack skill (`/name` or "the **name** skill") | `read` `<pstack>/skills/<name>/SKILL.md` and follow it. Never call `Skill` for it, because `pstack` is the only registered Mixdog skill. When you tell the user to type it, write `$pstack /<name>`. |
| `Read`, `Grep`, `Glob`, `Shell`, file edits | `read`, `grep`, `glob`, `shell`, `edit`. `shell` runs PowerShell, so translate POSIX snippets such as `ls -t`, `head`, and `2>/dev/null`, or use the tool that covers them, such as `glob` sorted by modification time. |
| `git` and `gh` commands | `git` commands go through the `git` tool. A `gh` command goes through the `github` tool when it has the action, otherwise through `shell`. |
| MCP tools | The session's connectors, the `mcp__<server>__*` tools. Skip a source that has no connector and name it, as pstack already says. |

## Subagent fields

| Cursor | Mixdog |
| --- | --- |
| `subagent_type: generalPurpose` | `agent: "worker"`. |
| `poteto-agent` | `agent: "worker"`, or `"heavy-worker"` for the `hardest tasks` role. Open the brief with "You are a poteto-agent delegate. Read `<pstack>/agents/poteto-agent.md` and follow it. poteto-mode is `<pstack>/skills/poteto-mode/SKILL.md` and the Mixdog adapter is `<pstack>/docs/harness/mixdog.md`." Write `<pstack>` as the absolute path. |
| `comment-sicko` | `agent: "worker"`. The brief is the body of `<pstack>/agents/comment-sicko.md`, then the scope. |
| An agent named above that the session's agent list lacks | The closest implementation agent the list offers. Say so. |
| `readonly: true` | The same agent. The brief adds "Do not edit files, stage, or commit." Check `git status` afterward. |
| `readonly: false` | The default. Connectors stay available either way. |
| `environment: "cloud"` | A managed worktree on this machine. Create it with the `git` tool (`git worktree add -b <branch>`) and spawn the agent with `cwd` set to the worktree path it returns. Name the branch or commit in the brief. These workers run locally, so at most two that build or test run at once, and the rest wait. |
| `environment: "local"` | Omit. The agent works in the current Project folder. |
| `cloud_base_branch: <b>` | Create the worktree from `<b>`. |
| `run_in_background: true` | Omit. Every `agent` spawn and send runs in the background and reports by notification. |
| `resume` | `agent` with `type: "send"` and the same `tag`. A same-tag spawn respawns an expired agent with its full brief. |
| `file_attachments` | `attachments`, with the paths. |
| `model` | See Models. |

## Models

| Cursor | Mixdog |
| --- | --- |
| The `pstack-models.mdc` rule, `~/.cursor/rules/pstack-models.mdc` | `~/.mixdog/data/pstack/pstack-models.md`. Mixdog never loads it into a session, so read it at the start of every pstack run. If the file or a role's line is missing, run `setup-pstack` first. Its re-run keeps the lines that exist. |
| A role value `<provider>/<model> <effort>`, such as `anthropic-oauth/claude-opus-5-5 xhigh` | `agent` spawn with `provider`, `model`, and `effort`. The user chose these lines in `setup-pstack`, so they are the explicit model choice the `agent` tool asks for. |
| `inherit-parent` or `auto` | Omit `provider`, `model`, and `effort`. The agent runs on its own Mixdog route. For pstack's family rules it counts as the parent's family. |
| A default slug in a skill, such as `claude-<family>-<version>-<effort>[-fast]`, `grok-*`, or `gpt-*` | Never passed. The role's line in the models file replaces it. Where a skill says to fall back to its default after a rejection, skip that step and go on with the error's candidates. |
| Raising or lowering the reasoning level | Change `effort` within the levels `setup` `list_models` reports for that model. |
| `-fast` and fast mode | Drop it. `agent` has no speed switch. |
| A rejected slug | An `agent` spawn error that names the model as unknown or ambiguous. Its candidates are the list of valid slugs. |
| A model family | The model id's first word, such as `claude`, `gpt`, `grok`, or `gemini`. |

## setup-pstack

Follow its steps with these changes.

- Detect. The detected models are the rows `setup` `list_models` returns for each provider that `setup` `status providers` reports as authenticated. Write a real model as `<provider>/<model> <effort>`, with an effort from that row's efforts. The effort is the last token, so the budget step works as written.
- Defaults. Map each default slug to the detected model of the same family and version at the slug's effort, and drop `-fast`. So `claude-opus-5-5-xhigh` becomes `anthropic-oauth/claude-opus-5-5 xhigh` when that provider offers it. A slug with no such model makes its role need a choice, as step 3(c) says.
- Ask with `ask_user`. It takes two to four options per question. Offer the four budget labels as written. Show the role table and long model lists in plain text, then ask.
- Write `~/.mixdog/data/pstack/pstack-models.md` with no frontmatter, then the comment lines, the `# budget` line, and one line per role from step 5. Overwrite the whole file. Never put the role lines in `AGENTS.md`, `CLAUDE.md`, or a Mixdog setting.
- Confirm. Say that it applies from the next pstack run, in any conversation.

## Paths

| Cursor | Mixdog |
| --- | --- |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `<pstack>`. The installed version is in `<pstack>/../plugin.json`. |
| `.cursor/skills/` in a repository | Keep the path, so the skill stays in the repository for every harness. Mixdog does not register project skill folders, so read such a skill by path. `$<name>` does not select it. |
| `~/.cursor/skills/` | A Mixdog user skill at `~/.mixdog/data/skills/<name>/SKILL.md`, written with the `skill-creator` skill. It registers in every Project. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md` at the Project root, which Mixdog loads into new sessions when instruction files are on. The model rule is the exception. See Models. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<pstack>/<path>` when that file exists. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | The `session` tool. `list` finds this Project's conversations, newest first, and `include_agents: true` adds sub-agent chats. `read` pages through one conversation. `recall`, through the history-recall skill, searches past sessions when the session offers it. Your own sub-agents' output comes from `agent` `read`. Read only this Project's conversations. |

## Scripts

| Script | Mixdog |
| --- | --- |
| `.mjs` | `node <path>` through `shell`. |
| `.ts` scripts and the `watch-pr` and `statechart` launchers | They run on `bun`. Run them through `shell` when Bun is installed. |
| `.sh` | They need bash. Git for Windows ships `C:\Program Files\Git\bin\bash.exe`. |
| A missing runtime | Write `Skipped in Mixdog: <step>. <runtime> is not installed.` and go on, as for Cursor-only features. |

## Cursor-only features

Mixdog has no Cursor Automations, Bugbot, Cursor cloud agents, Custom Modes, or Cursor built-in commands. Map a step that needs one with the table below. A step marked skip gets one line in your reply, `Skipped in Mixdog: <step>. <reason>.`, and then you go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, such as a URL or a key, leave a placeholder and name it in the line.

| Cursor | Mixdog |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, so read them with the `github` tool (`pr.comments`). Skip a step that starts, waits for, or configures Bugbot when the PR has no Bugbot check or comment. |
| Cursor cloud agents | `environment: "cloud"` maps to a worktree, as in Subagent fields. Skip a step that needs the cloud agent itself, such as its dashboard status or its own machine. |
| A built-in PR tool | The `github` tool (`pr.create`), or the `gh` command the step gives. That is not a skip, so write no line. |
| Custom Modes, the Agents Window | The Poteto mode workflow, picked in the composer's workflow selector for one conversation. Elsewhere, a task starts with `$pstack`. |
| `/loop` | The `goal` tool, after loading the goal-management skill. The done predicate is the objective, and its idle reminder is the heartbeat. An event wake is a background command that exits on the event, such as `shell` with `background: true` running `gh pr checks <number> --watch`, or a watcher `agent`. |
| `/deslop` from `cursor-team-kit` | The `code-tidy` skill. |
| `control-ui` from `cursor-team-kit` | The `browser-use` skill for web UIs, and the `computer-use` skill for desktop and Electron apps. |
| `control-cli` from `cursor-team-kit` | `shell` for one-shot commands, and `terminal` for an interactive CLI or TUI. |
| Cursor's `create-skill` | The `skill-creator` skill. |
| Cursor's built-in babysit skill | Never. pstack's Babysit playbook owns PR-status requests. |
