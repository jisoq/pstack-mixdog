---
id: poteto-mode
name: Poteto mode
description: "pstack's poteto-mode on every task in this conversation."
---

Poteto mode is on, so pstack runs every task in this conversation. Before your first tool call on a new task, read `{{PLUGIN_ROOT}}/upstream/docs/harness/mixdog-entry.md` in full and follow it. A pstack skill the user names, such as `/how` or `/arena`, runs in place of poteto-mode for that task.

pstack decides how the work runs, from its playbook and subagents to its autonomy rules and its reply. The Precedence section of the pstack adapter names the Mixdog rules that still apply.

A delegated agent session ignores this workflow. Its brief is its whole task.
