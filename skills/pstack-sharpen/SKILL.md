---
name: pstack-sharpen
description: "Make a task deeper, not bigger, then rewrite its prompt."
when_to_use: 'User selects $pstack-sharpen; never inferred from the task.'
---

# pstack-sharpen

This runs pstack's `sharpen` skill for this task and its follow-ups. A new, unrelated request runs under pstack only when the user selects a pstack skill again. `<root>` is the folder two levels above this skill's folder. Read `<root>/harness/WORKFLOW.md` in full and follow it for this task, then run the `sharpen` skill as its `## Rules` section says.
