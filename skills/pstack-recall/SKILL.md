---
name: pstack-recall
description: "Rebuild your recent working context from chat history and live state into a current-state brief."
when_to_use: 'User selects $pstack-recall; never inferred from the task.'
---

# pstack-recall

This runs pstack's `recall` skill for this task and its follow-ups. A new, unrelated request runs under pstack only when the user selects a pstack skill again. `<root>` is the folder two levels above this skill's folder. Read `<root>/harness/WORKFLOW.md` in full and follow it for this task, then run the `recall` skill as its `## Rules` section says.
