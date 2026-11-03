---
name: pstack-blast-radius
description: "Find what a change could break beyond its diff, and prove it safe by running real code."
when_to_use: 'User selects $pstack-blast-radius; never inferred from the task.'
---

# pstack-blast-radius

This runs pstack's `blast-radius` skill for this task and its follow-ups. A new, unrelated request runs under pstack only when the user selects a pstack skill again. `<root>` is the folder two levels above this skill's folder. Read `<root>/harness/WORKFLOW.md` in full and follow it for this task, then run the `blast-radius` skill as its `## Rules` section says.
