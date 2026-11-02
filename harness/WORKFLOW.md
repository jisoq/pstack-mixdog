---
id: poteto-mode
name: Poteto mode
description: "pstack's poteto-mode on every task in this conversation."
---

Poteto mode is on, so pstack runs every task in this conversation. `<root>` is `{{PLUGIN_ROOT}}`. This workflow was saved from pstack-mixdog `{{PLUGIN_VERSION}}`. On the first task of a conversation, read `<root>/plugin.json`, and when its `version` differs, follow `<root>/harness/INSTALL.md` before anything else.

For each new task, run the pstack skill the user names, in slash form (`/how`) or in words, when `<root>/upstream/skills/<name>/SKILL.md` exists. Run `poteto-mode` for everything else, including a name pstack does not have, such as `/loop`.

A delegated agent session ignores this workflow. Its brief is its whole task.

## Rules

- Read a pstack skill in full and follow it from its first step: `~/.mixdog/data/skills/pstack-custom-<name>/SKILL.md` when the user keeps that copy, otherwise `<root>/upstream/skills/<name>/SKILL.md`. When it routes to another pstack skill, read that skill the same way. In a skill read from that copy, a `<root>/upstream/skills/<name>/` path means the same file in the copy's folder. Never call `Skill` for a pstack skill.
- The pstack skill decides the procedure: the playbook and its todo list, the principles, verification, and the shape of the reply. It replaces the active Mixdog workflow's guidance for this task. The orchestration mode decides delegation: whether a step goes to an agent or you do it, how work splits, how many agents run at once, and what a brief carries. A spawn in a pstack skill names the work and the pstack agent that takes it when the mode delegates it.
- Mixdog's tool schemas, tool routing, and safety rules still decide how each step runs, including never discarding work you did not create.
- A commit, push, PR, merge, release, or deploy step needs the user's yes. Finish every step before the first such step, then ask with `ask_user` whether to put the work up as a PR, with three options: commit, push, and open the PR as the Opening a PR playbook says; commit locally only; leave the change uncommitted. The answer covers the rest of the run. A playbook that commits along the way asks once before its first commit. Skip the question only when the request already asked for that step or granted full autonomy. pstack's Always pause list applies on top of this.
- Mixdog's language setting picks the reply language. The skill decides everything else about the reply.
