---
name: pstack-create-verification-skill
description: "Generate a project skill that proves app behavior by driving the app the way a user does."
when_to_use: 'User selects $pstack-create-verification-skill; never inferred from the task.'
---

# pstack-create-verification-skill

This runs pstack's `create-verification-skill` skill for this task and its follow-ups. A new, unrelated request runs under pstack only when the user selects a pstack skill again. `<root>` is the folder two levels above this skill's folder. Read the `## Rules` section of `<root>/harness/WORKFLOW.md` and follow it for this task, then run the `create-verification-skill` skill as those Rules say.
