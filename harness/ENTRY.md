# pstack entry

Runs upstream pstack {{PSTACK_VERSION}} (cursor/plugins at `{{UPSTREAM_COMMIT}}`) as written. Its skills, playbooks, and principles keep Cursor's names, and the Mixdog adapter maps them. Only the Poteto mode workflow and the `$pstack-<name>` skills send a session here, so pstack never applies to work the user did not route to it.

`<pstack>` is the absolute path of the [`upstream`](../../README.md) folder of the plugin, two levels above the folder of this file. Every pstack path is under it.

## Pick the skill

- A `$pstack-<name>` skill sent you here. Run that skill.
- The user names a pstack skill, in Cursor's slash form (`/how`, `/arena`) or in words ("run interrogate on this"). Run that skill.
- Anything else in a Poteto mode conversation. Run `poteto-mode`.
- A name that is not a pstack skill. Say so, offer the closest names, and stop.

pstack skills: {{SKILL_NAMES}}.

## Run it

1. Read [the Mixdog adapter](mixdog.md) in full, once per conversation. Result: you know the Mixdog equivalent of every Cursor name pstack uses, and its Precedence section governs this task.
2. Check that the session's agent list has `pstack-hard`, `pstack-judge`, `pstack-code`, `pstack-scout`, and `pstack-verify`. When one is missing, run `setup-pstack` first, as the adapter's Models section says. Result: every subagent role has its agent.
3. Read `<pstack>/skills/<name>/SKILL.md` in full and follow it from its first step, mapping names through the adapter. Result: the skill's own first output, such as poteto-mode's restated goal and the matched playbook's todolist.
4. When it routes to another pstack skill, read that skill's `SKILL.md` under `<pstack>/skills/` the same way. Never call `Skill` for it.

## Scope

In a Poteto mode conversation, every task runs under pstack. A `$pstack-<name>` skill keeps pstack in force for the task it was selected for and that task's follow-ups. A new, unrelated request after it runs under pstack only when the user selects a pstack skill again.
