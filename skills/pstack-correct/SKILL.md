---
name: pstack-correct
description: "Make the mistakes agents keep repeating in this repo impossible, with checks proven on past ones."
when_to_use: 'User selects $pstack-correct; never inferred from the task.'
---

# pstack-correct

This runs pstack's `correct` skill for this task and its follow-ups. A new, unrelated request runs under pstack only when the user selects a pstack skill again. `<root>` is the folder two levels above this skill's folder. Read `<root>/harness/WORKFLOW.md` in full and follow it for this task, then run the `correct` skill as its `## Rules` section says.
