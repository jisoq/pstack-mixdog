---
name: p-sharpen
description: "Make a task deeper, not bigger, then rewrite its prompt."
when_to_use: 'User selects $p-sharpen; never inferred from the task.'
---

# p-sharpen

This runs pstack's `sharpen` skill on its own, for the request the user selected it for. `<root>` is the folder two levels above this skill's folder. Read the skill in full and follow it from its first step: `~/.mixdog/data/skills/pstack-custom-sharpen/SKILL.md` when the user keeps that copy, otherwise `<root>/upstream/skills/sharpen/SKILL.md`. When it sends you to another pstack skill, read that one the same way, under its own name. A principle skill named `<name>` is in the `principle-<name>` folder. Never call `Skill` for a pstack skill. The active workflow and its rules still decide everything the skill does not, and later requests run as they would without this skill. Mixdog's language setting and Output Style decide how the reply is written.
