---
name: pstack-{{NAME}}
description: {{DESCRIPTION}}
when_to_use: 'User selects $pstack-{{NAME}}; never inferred from the task.'
---

# pstack-{{NAME}}

This runs pstack's `{{NAME}}` skill for this task and its follow-ups. A new, unrelated request runs under pstack only when the user selects a pstack skill again. `<root>` is the folder two levels above this skill's folder. Read `<root>/harness/WORKFLOW.md` in full and follow it for this task, then run the `{{NAME}}` skill as its `## Rules` section says.
