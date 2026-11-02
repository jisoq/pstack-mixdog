---
name: pstack-poteto-help
description: "Get help with pstack setup, poteto-mode, and picking the skill, playbook, or principle for a task."
when_to_use: 'User selects $pstack-poteto-help; never inferred from the task.'
---

# pstack-poteto-help

This runs pstack's `poteto-help` skill for this task and its follow-ups. A new, unrelated request runs under pstack only when the user selects a pstack skill again. `<root>` is the folder two levels above this skill's folder. Read the `## Rules` section of `<root>/harness/WORKFLOW.md` and follow it for this task, then run the `poteto-help` skill as those Rules say.
