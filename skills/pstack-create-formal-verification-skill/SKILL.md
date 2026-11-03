---
name: pstack-create-formal-verification-skill
description: "Generate a project skill that formally verifies the risky code that tests reach least."
when_to_use: 'User selects $pstack-create-formal-verification-skill; never inferred from the task.'
---

# pstack-create-formal-verification-skill

This runs pstack's `create-formal-verification-skill` skill for this task and its follow-ups. A new, unrelated request runs under pstack only when the user selects a pstack skill again. `<root>` is the folder two levels above this skill's folder. Read `<root>/harness/WORKFLOW.md` in full and follow it for this task, then run the `create-formal-verification-skill` skill as its `## Rules` section says.
