---
name: pstack-unslop
description: "Cut AI writing tells from a draft, a PR description, or docs, keeping the meaning and tone."
when_to_use: 'User selects $pstack-unslop; never inferred from the task.'
---

# pstack-unslop

This runs pstack's `unslop` skill for this task and its follow-ups. A new, unrelated request runs under pstack only when the user selects a pstack skill again. `<root>` is the folder two levels above this skill's folder. Read the `## Rules` section of `<root>/harness/WORKFLOW.md` and follow it for this task, then run the `unslop` skill as those Rules say.
