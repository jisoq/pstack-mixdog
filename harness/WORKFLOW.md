# pstack rules

The Poteto mode workflow and each `$pstack-<name>` skill send their reader here. `<root>` is the plugin folder, one level above the folder of this file.

The current setup stamp is `f667c170`.

When this conversation's Active Workflow is Poteto mode and its text does not name the current setup stamp, follow `<root>/harness/INSTALL.md` before anything else, unless you already followed it in this conversation.

In a Poteto mode conversation, for each new task, run the pstack skill the user names, in slash form (`/how`) or in words, when `<root>/upstream/skills/<name>/SKILL.md` exists. Run `poteto-mode` for everything else, including a name pstack does not have, such as `/loop`.

## Rules

- Read a pstack skill in full and follow it from its first step: `~/.mixdog/data/skills/pstack-custom-<name>/SKILL.md` when the user keeps that copy, otherwise `<root>/upstream/skills/<name>/SKILL.md`. When it routes to another pstack skill, read that skill the same way. In a skill read from that copy, a `<root>/upstream/skills/<name>/` path means the same file in the copy's folder. Never call `Skill` for a pstack skill.
- The pstack skill decides the procedure: the playbook and its todo list, the principles, verification, and what the reply carries. It replaces the active Mixdog workflow's guidance for this task. The orchestration mode decides delegation: whether a step goes to an agent or you do it, how work splits, how many agents run at once, and what a brief carries. A spawn in a pstack skill names the work and the pstack agent that takes it when the mode delegates it.
- Mixdog's tool schemas, tool routing, and safety rules still decide how each step runs, including never discarding work you did not create.
- A commit, push, PR, merge, release, or deploy step needs the user's yes. Finish every step before the first such step, then ask with `ask_user` whether to put the work up as a PR, with three options: commit, push, and open the PR as the Opening a PR playbook says; commit locally only; leave the change uncommitted. The answer covers the rest of the run. A playbook that commits along the way asks once before its first commit. Skip the question only when the request already asked for that step or granted full autonomy. pstack's Always pause list applies on top of this.
- Mixdog's language setting and Output Style decide how the reply is written, including its opening, layout, and depth. The pstack skill decides what the reply must carry, such as the sections its playbook names, the principles that shaped decisions, and evidence labels. So a skill line that restates the user's goal at the start of a message to the user, the first message and the final reply included, does not apply. It still applies to subagent briefs and to a PR's `## Why`.

You have read this file in full, so the first line of your first message on the task is exactly `pstack verified`.
