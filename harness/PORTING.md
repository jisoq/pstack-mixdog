# Porting pstack to Mixdog

`upstream/` holds pstack from cursor/plugins, rewritten so that it runs natively in Mixdog. There is no adapter. Every file an agent follows already says what to do in Mixdog. `scripts/sync.mjs` brings upstream changes in with a three-way merge, and `scripts/build.mjs` fails on any Cursor-only term that survives. This file is the contract for that rewrite: use it when porting a file for the first time and when resolving a merge conflict.

## Rules for every edit

- Change only what Mixdog needs. Keep upstream's wording, line breaks, and order everywhere else, because each changed line is a line that can conflict on the next merge. Never rewrap, reorder, or restyle. Deleting a sentence or a line is fine.
- Follow the files' own writing rules: short declarative sentences, no long dash, no mid-sentence colon.
- `docs/guide/`, `README.md`, `LICENSE`, and `plugin.json` under `upstream/` stay as upstream wrote them. They are human documentation of Cursor's setup, and no agent follows them, so no skill links to them.
- Scripts stay as upstream wrote them unless this file says otherwise. The run commands for Mixdog live in the Markdown that invokes them.
- `<root>` means the absolute path of the plugin folder, which holds `upstream/`, `harness/`, and `skills/`. A skill links to another file with a relative link, as upstream does. Where a brief needs an absolute path, write `<root>/upstream/...`.

## Mapping

| Cursor | Mixdog |
| --- | --- |
| `Task` call, Task subagent | When the orchestration mode delegates the work, an `agent` spawn (`type: "spawn"`) on the role's pstack agent (see Roles). Otherwise the lead does it. See Delegation. |
| `subagent_type: generalPurpose` with a prompt template | Spawn on the role's pstack agent. The brief gives the template's absolute path, not its text: "Read `<path>` in full. Your prompt is the text below its first `---` line, or the whole file when it has none." Then give each placeholder's value under its name. |
| `poteto-agent` | The role's pstack agent: `pstack-code` for code, `pstack-hard` for the hardest changes, `pstack-judge` for prose or judgment. The agent body sends a code change to `upstream/agents/poteto-agent.md`, so the brief does not name it. |
| `comment-sicko` | Spawn on `pstack-code`. The brief is "Read `<root>/upstream/agents/comment-sicko.md` in full and follow it.", then the scope. |
| `readonly: true` | Delete. The pstack agent body allows file changes only when the task is a change. |
| `readonly: false`, `run_in_background`, agent mode | Delete. Every spawn runs in the background, and connectors stay available. |
| `environment: "cloud"`, `cloud_base_branch: <b>` | A managed worktree on this machine. Create it with the `git` tool (`git worktree add -b <branch> <path> <b>`) and spawn with `cwd` set to the worktree path. Name the branch in the brief. |
| `resume`, steering a running agent | `agent` with `type: "send"` and the same `tag`. |
| `file_attachments` | `attachments`, with the paths. |
| `model`, a model slug, a role line, `inherit-parent`, `auto`, reasoning level, effort, `-fast`, fast mode, `/setup-pstack` budget, rejected-slug fallbacks | Delete. The pstack agent's Mixdog route owns model, effort, and speed. Keep the role, mapped through Roles. |
| `AskQuestion` | `ask_user`, with two to four options per question. An open question goes in plain text. |
| Open a todolist | The `todo` tool: `init` with the playbook's steps verbatim as items, then keep it current. Work that spans turns (Autonomous run, Orchestrate, Autopilot, Multi-phase plan) also uses the `goal` tool, loaded with `load_tool`. A goal objective holds at most 500 characters, so the `todo` list keeps the verbatim steps. |
| `/loop` | The `goal` tool. The done predicate is the objective, and its idle reminder is the heartbeat. An event wake is a background command that exits on the event, such as `shell` with `background: true` running `gh pr checks <number> --watch`, or a watcher agent whose report wakes you. |
| `Read`, `Grep`, `Glob`, `Shell`, file edits | `read`, `grep`, `glob`, `shell`, `edit`. `shell` runs PowerShell, so translate POSIX snippets such as `ls -t`, `head`, and `2>/dev/null`, or use the tool that covers them. |
| `git`, `gh` | `git` commands go through the `git` tool. A `gh` command goes through the `github` tool when it has the action, otherwise through `shell`. |
| MCP tools | The session's connectors, the `mcp__<server>__*` tools. Skip a source that has no connector and name it. |
| Run another pstack skill | Keep upstream's wording ("the **how** skill", `/how`). The Rules section of `harness/WORKFLOW.md` is pstack's single entry point. The Poteto mode workflow carries it, and each `$pstack-<name>` skill sends its reader to it. It tells the reader to open `<root>/upstream/skills/<name>/SKILL.md` by path. Never write an instruction to call `Skill` for a pstack skill. When a skill tells the user what to type to run a pstack skill, write `$pstack-<name>` for a skill listed in `harness/direct-skills.json`, which works in any conversation, and `/<name>` typed in a Poteto mode conversation for every other skill. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `<root>`. The installed version is in `<root>/plugin.json`. |
| `.cursor/skills/` in a repository | A Mixdog user skill at `~/.mixdog/data/skills/<name>/SKILL.md`, written with the `skill-creator` skill. Mixdog registers no folder inside a repository. A skill about one Project names that Project in its name and its `when_to_use`, so it triggers only there. |
| `~/.cursor/skills/` | A Mixdog user skill at `~/.mixdog/data/skills/<name>/SKILL.md`, written with the `skill-creator` skill. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md` at the Project root, which Mixdog loads into new sessions when instruction files are on. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` for a file that `upstream/` holds | A relative link to the local copy. |
| Transcripts, `~/.cursor/projects/<slug>/agent-transcripts/` | Only the lead reads conversations. A subagent has no `session` tool, so no brief tells it to read one: it gets a digest file the lead wrote. **Finding past work** (which chats, what was decided, the user's preferences): Mixdog's memory. `recall`, loaded with `load_tool`, returns dated summaries of this Project's sessions with their session ids: `period` for a window, `query` for a topic, `category` for decisions, preferences, rules, and constraints, and an entry's `id` with `includeRaw: true` for its raw messages. When `recall` is unavailable or reports that memory is off, stop that step and ask the user to turn on memory in Mixdog's settings. Never page through conversations with `session` in its place. **What a known conversation did** (its tool calls, files read, errors, or live state): `session`, whose `read` keeps the tool calls `recall` drops. Read only the items the step needs, from this conversation's id in `session` `status`, a session id `recall` gave, the `sessionId` that `agent` `close` reports, or `session` `list` with `include_agents: true`, whose `cwd`, `status`, `working`, and `lastUsedAt` show where and whether a chat is active. The current conversation is in the lead's own context first. |
| `.mjs` script | `node <path>` through `shell`. |
| The `statechart` launcher | `node --disable-warning=ExperimentalWarning <skill dir>/scripts/statechart.ts <args>` through `shell`. A cancel leaves the `.<out>.statechart-*` folder beside `--out` and the `statechart-*` folder in `TEMP`, so remove both after a cancel. |
| `watch-pr` | `bun <path>/watch-pr <args>` through `shell`. Until Mixdog restarts after a Bun install, use `$env:USERPROFILE\.bun\bin\bun.exe`. |
| `.sh` script | Git for Windows' bash, found beside `git`: `& (Join-Path (Split-Path (Split-Path (Get-Command git).Source)) 'bin\bash.exe') <path> <args>` through `shell`. Never plain `bash`, which on Windows usually resolves to the WSL launcher and fails without a Linux distribution. |
| A missing runtime | Write `Skipped in Mixdog: <step>. <runtime> is not installed. Following harness/INSTALL.md again offers to install it.` and go on. A verification step that could not run is reported as not verified, never as passed. |
| `/setup-pstack`, the setup-pstack skill | Not in the Mixdog plugin, which excludes it. The user picks each pstack agent's model in Mixdog's agent settings, and following `harness/INSTALL.md` again syncs the agents and the workflow and offers missing programs. Point there, or delete the mention. |
| Cursor Automations, routines, `update_state`, `SendToUser`, webhooks to `cursor.sh` | Delete the step, or write `Skipped in Mixdog: <step>. <reason>.` where a later step needs to know. |
| Bugbot | Bugbot comments on a GitHub PR are ordinary review threads, read with the `github` tool (`pr.comments`). Delete steps that start, wait for, or configure Bugbot when they cannot apply. |
| Cursor cloud agents | `environment: "cloud"` above. Delete steps that need the cloud agent itself, such as its dashboard. |
| A built-in PR tool | The `github` tool (`pr.create`), or the `gh` command the step gives. |
| Custom Modes, the Agents Window | The Poteto mode workflow, picked in the composer's workflow selector. |
| `/deslop`, the `deslop` skill, `cursor-team-kit` | The `code-tidy` skill. |
| `control-ui` | The `browser-use` skill for web UIs, the `computer-use` skill for desktop and Electron apps. |
| `control-cli` | `shell` for one-shot commands, `terminal` for an interactive CLI or TUI. |
| Cursor's `create-skill` | The `skill-creator` skill. |
| Cursor's built-in babysit skill, Cursor restarts, other Cursor UI | Delete the mention. |

## Roles

Each pstack role runs on one of five Mixdog agents. Never pass a model. Never check or compare model families: the user set each agent's route with that in mind, so a rule that asks for "a different model family" or "different models" means exactly the agent this table names.

| Role | Agent |
| --- | --- |
| Code delegates of Feature, Refactoring, Bug fix, Perf issue, Hillclimb | `pstack-code` |
| The hardest changes | `pstack-hard` |
| Judgment and prose, how explainer, why synthesizer, reflect judgment, divergent, and synthesizer, the Arena cross-judge, the Eval judge, the show-me-your-work trail review | `pstack-judge` |
| how explorer, why investigators, reflect tooling, bulk reading or parsing that keeps large artifacts out of the lead's context | `pstack-scout` |
| swarm workers, every verification fan-out, the Orchestrate PR verifier | `pstack-verify` |
| Arena runners, architect runners, interrogate reviewers | Two seats, one on `pstack-code` and one on `pstack-verify` |

## Delegation

The session's Mixdog orchestration mode owns delegation, and pstack's text never competes with it. Port every upstream passage as if it had never said any of these:

- When to delegate, or that the lead stays out of the work ("Delegate implementation", "stay in the lead"). Keep what the work is and which pstack agent takes it when delegated.
- How many agents run at once, or that they all spawn in one message.
- Fresh agents versus reusing one for a fix round or a follow-up.
- What a brief says beyond the task: conduct lines such as "Do not edit files, stage, or commit", reply formats, report-file rules, and check rules. The pstack agent body and Mixdog's agent rules set those.
- What to do when an agent is missing, turned off, or refused.
- A review of agent work that stands in for Mixdog's. A pstack review or verification step (a judge, a panel, a verification swarm) runs as a technique on top of it.

Fan-out techniques (arena, swarm, architect, interrogate, how, why, reflect, Orchestrate) keep their roles and what each role produces. When the mode has the lead work alone, the lead runs each role's step itself, one after another.

## Findings between subagents

When a later subagent reads an earlier one's findings (how's explorers to its explainer, why's investigators to its synthesizer, reflect's reviewers to its synthesizer, Orchestrate's workers to the next worker), the findings go through files, never inline. Before those spawns, pick a new folder, `<TEMP>/pstack/<skill>-<HHmmss>`, where `<TEMP>` is the `TEMP` of `shell`. Each producing brief names its output file, `<folder>/<tag>.md`, and the receiving brief lists those paths.

## Delegates

A delegated session has no `agent` tool, so only the lead spawns. A delegate that reaches a step calling for a spawn, whether a skill that spawns subagents (how, why, architect, arena, swarm, interrogate, reflect) or any other fan-out, does not run it. It ends its report with a handoff that names the skill or the fan-out and its input, and the lead runs it. Where upstream has one owner fan out internally, the lead does that fan-out.

## Decisions already made

These resolve conflicts the audit found. Apply them where the named text lives.

1. Opening a PR runs only after a playbook that changed files, and its first commit, push, or PR step goes through the ask in the rules. A read-only playbook (Investigation, Runtime forensics, Trace forensics, Prototype, Eval, Session pickup, Pause safely, Worktree cleanup) never opens a PR.
2. Worktree cleanup treats `scratch:N` untracked files as the user's work: show them and get a decision, as for `wip`. The audit script drops upstream's scan of Cursor transcripts, so it reads no conversations and its `safe` bucket says nothing about chat use. Treat every candidate as possibly in use until `session` `list`, Mixdog's memory (per the Transcripts row), and the user's pinned set clear it. With memory off, stop before any removal and ask the user to turn it on. Remove worktrees through the `git` tool, which maps `git worktree remove` to its managed operation. Report a refused removal instead of forcing it.
3. Hillclimb's decision log uses the show-me-your-work format. Each attempt's hypothesis, change, before, after, delta, tests, and verdict go into its `decision`, `why`, `evidence`, and `result` cells. show-me-your-work owns the columns.
4. A Bugbot or security comment that is security, privacy, or data related goes to `ask`, even when it also fits `fix`.
5. Refactoring forbids compatibility shims only when the migrate-callers principle applies: no external users depend on the old API and the project can absorb a coordinated breaking change. For a public API, ask.
6. Team chat posts and ticket updates proceed without asking. A message to a customer or to anyone outside the user's organization pauses for confirmation.
7. In a stack, a child PR keeps its parent PR as its base. Rebasing onto trunk applies to a PR whose parent has landed.
8. Orchestrate's PR verification is a pass separate from the authoring: on `pstack-verify` when delegated, never by the agent that wrote the PR, and by the lead after the code is done when it works alone. Worker handoffs go through output files.
9. A pstack skill the user customizes lives at `~/.mixdog/data/skills/pstack-custom-<name>/`, which pstack runs read in place of `<root>/upstream/skills/<name>/` (the Rules of `harness/WORKFLOW.md`). Reflect makes that copy as its Accepted-edits step says.

## Cursor-only terms

`scripts/build.mjs` fails when any of these patterns matches a Markdown file under `upstream/skills/` or `upstream/agents/`, outside `scripts/` folders. The list lives in `harness/cursor-terms.json`.

`` `Task` ``, `Task (tool|subagent|call)`, `AskQuestion`, `generalPurpose`, `subagent_type`, `readonly: (true|false)`, `readonly/Ask`, `environment: "`, `cloud_base_branch`, `run_in_background`, `` `resume` ``, `file_attachments`, `claude-<family>-<n>`, `grok-<n>`, `gpt-<n>`, `composer-<n>`, `inherit-parent`, `xhigh`, `reasoning level`, `standard speed`, `fast mode`, `model famil`, `pstack-models.mdc`, `.cursor`, `always-applied rule`, `agent-transcripts`, `cloud agent`, `Cursor Automation`, `cursor.sh/automations`, `update_state`, `SendToUser`, `built-in PR tool`, `cursor-team-kit`, `create-skill` as a whole word, `/loop`, `control-ui`, `control-cli`, `deslop`, `Cursor`, `docs/harness/`.

`.cursor` is any path segment that starts with `.cursor`, such as `.cursor/`, `~/.cursor`, `.cursor-plugin`, or `.cursorrules`, and not a property such as `edge.cursor`. It, `pstack-models.mdc`, `cursor.sh/automations`, and `cursor-team-kit` are marked `everywhere`, because ordinary code does not use them. Those four, and no others, also apply to every text file in an `upstream/` `scripts/` folder (code, JSON, and Markdown) and to the harness files the workflow and install read: `WORKFLOW.md`, `agents.md`, `INSTALL.md`, `DIRECT-SKILL.md`, `excluded-skills.json`, and `direct-skills.json`. The rest stay out of those files, where GitHub pagination's `cursor`, Bugbot's `cursor` author, the `@cursor-skill/poteto-mode-tools` package name, and Mixdog model ids are legitimate. This file and `cursor-terms.json` name Cursor on purpose and are not checked.
