---
name: pstack
description: Run poteto's pstack skills and playbooks from cursor/plugins inside Mixdog.
when_to_use: 'User selects or names pstack, poteto-mode, or a pstack skill; never inferred from the task.'
---

# pstack

Runs upstream pstack {{PSTACK_VERSION}} (cursor/plugins at `{{UPSTREAM_COMMIT}}`) as written. Its skills, playbooks, and principles keep Cursor's names, and the Mixdog adapter maps them. It never applies to work the user did not route to pstack.

`<pstack>` is the absolute path of the [`upstream`](../../upstream/README.md) folder, two levels above this file (`<base-dir>/../../upstream`). Every pstack path is under it.

## Pick the skill

- The user names a pstack skill, in Cursor's slash form (`/how`, `/arena`) or in words ("run interrogate on this"). Run that skill.
- Anything else routed here, such as `$pstack <task>`, "poteto-mode", or the Poteto mode workflow. Run `poteto-mode`.
- A name that is not a pstack skill. Say so, offer the closest names, and stop.

pstack skills: {{SKILL_NAMES}}.

## Run it

1. Read [the Mixdog adapter](../../upstream/docs/harness/mixdog.md) in full, once per conversation. Result: you know the Mixdog equivalent of every Cursor name pstack uses, and its Precedence section governs this task.
2. Check that the session's agent list has `pstack-hard`, `pstack-judge`, `pstack-code`, `pstack-scout`, and `pstack-verify`. When one is missing, run `setup-pstack` first, as the adapter's Models section says. Result: every subagent role has its agent.
3. Read `<pstack>/skills/<name>/SKILL.md` in full and follow it from its first step, mapping names through the adapter. Result: the skill's own first output, such as poteto-mode's restated goal and the matched playbook's todolist.
4. When it routes to another pstack skill, read that skill's `SKILL.md` under `<pstack>/skills/` the same way. Never call `Skill` for it.

## Scope

pstack stays in force for the task it was selected for and that task's follow-ups. A new, unrelated request in the same conversation runs under pstack only when the user selects it again or the conversation runs the Poteto mode workflow.
