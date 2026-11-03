---
name: pstack-maintain-verification-skill
description: "Check a project's verification skill and feature map against the live app, and fix what drifted."
when_to_use: 'User selects $pstack-maintain-verification-skill; never inferred from the task.'
---

# pstack-maintain-verification-skill

This runs pstack's `maintain-verification-skill` skill for this task and its follow-ups. A new, unrelated request runs under pstack only when the user selects a pstack skill again. `<root>` is the folder two levels above this skill's folder. Read `<root>/harness/WORKFLOW.md` in full and follow it for this task, then run the `maintain-verification-skill` skill as its `## Rules` section says.
