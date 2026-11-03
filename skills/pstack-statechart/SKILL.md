---
name: pstack-statechart
description: "Check a TLA+ model of a system that moves between states, and draw it as a Mermaid statechart."
when_to_use: 'User selects $pstack-statechart; never inferred from the task.'
---

# pstack-statechart

This runs pstack's `statechart` skill for this task and its follow-ups. A new, unrelated request runs under pstack only when the user selects a pstack skill again. `<root>` is the folder two levels above this skill's folder. Read `<root>/harness/WORKFLOW.md` in full and follow it for this task, then run the `statechart` skill as its `## Rules` section says.
