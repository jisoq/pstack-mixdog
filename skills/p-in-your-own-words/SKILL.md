---
name: p-in-your-own-words
description: "Restate the user's goals and the problem they are solving, in your own words."
when_to_use: 'User selects $p-in-your-own-words; never inferred from the task.'
---

# p-in-your-own-words

This runs pstack's `in-your-own-words` skill on its own, for the request the user selected it for. `<root>` is the folder two levels above this skill's folder. Read the skill in full and follow it from its first step: `~/.mixdog/data/skills/pstack-custom-in-your-own-words/SKILL.md` when the user keeps that copy, otherwise `<root>/upstream/skills/in-your-own-words/SKILL.md`. When it sends you to another pstack skill, read that one the same way, under its own name. A principle skill named `<name>` is in the `principle-<name>` folder. Never call `Skill` for a pstack skill. The active workflow and its rules still decide everything the skill does not, and later requests run as they would without this skill. Mixdog's language setting and Output Style decide how the reply is written.
