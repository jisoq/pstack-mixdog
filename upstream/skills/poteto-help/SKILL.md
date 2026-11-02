---
name: poteto-help
description: Guides users through pstack setup, /poteto-mode, and picking the skill, playbook, or principle for a task. Type $pstack-poteto-help with a question.
disable-model-invocation: true
---

# Poteto help

Answer the user's question about pstack, hand them a prompt they can send, and link the file the answer came from. For a help question, don't start the work. The user asked how, and a pstack run spends real tokens, so let them send the prompt.

A message that asks for work, such as "use pstack to fix this bug", is not a help question. Read [`poteto-mode`](../poteto-mode/SKILL.md) and do the work under it.

This file maps questions to the skills and guide pages that hold the answers. Those files own the details. Read the file you route to before you quote it, and trust it when it disagrees with this map. The links are relative, so give the user the file's absolute path, resolved against the folder of the Markdown file that holds the link.

## Find out what they need

Infer the need from the message and the conversation. A named situation, such as "which skill reviews a PR?", goes straight to its section. If the need is still unclear, ask one question with `ask_user`, using the first four of these options, and offer the last in plain text under it. Then answer only the section they pick:

- Get set up
- Start a task in Poteto mode
- Pick a skill for a situation
- Fix a run that went wrong
- Make pstack my own

Check the state that changes the answer, and mention it only when it does:

- A pstack agent (`pstack-code`, `pstack-hard`, `pstack-judge`, `pstack-scout`, `pstack-verify`) that `setup` `status` with domain `agents` shows missing, turned off, or without a model can't take the roles mapped to it.
- No `verify-*` skill or other app harness in the project means agents have no scripted way to drive the app. Mention `$pstack-create-verification-skill` when the question is about proving a change works.
- No formal verification skill in the project means no property is checked past what tests reach. Mention `$pstack-create-formal-verification-skill` when the question is about a race, an invariant, or another case tests rarely hit. When one exists and the code it covers changed after the commit it records as last in sync, mention `$pstack-maintain-formal-verification-skill` if the question touches that code.

When an agent isn't ready and it matters, ask whether the user wants to set it up now. It matters when the user is new, the question is about setup or cost, or the answer depends on which models run. Ask at most once per chat. If the need is also unclear, ask both questions together. Offer two choices:

- Now: when an agent is missing, give them a prompt that asks Mixdog to follow `<root>/harness/INSTALL.md` again. Open Mixdog's agent settings with `setup` `open` and target `agents` so they can pick each model and turn the agent on, and answer their question too.
- Later: answer their question, and add one line saying that agent takes no roles until they pick its model and turn it on in Mixdog's agent settings.

## Get set up

1. Install by asking Mixdog in chat to add the plugin `jisoq/pstack-mixdog`, then to read and follow [`harness/INSTALL.md`](../../../harness/INSTALL.md) in the installed plugin folder. It installs the programs pstack's scripts need, the Poteto mode workflow, and the five pstack agents.
2. Pick a model for each of the five pstack agents and turn it on in Mixdog's agent settings. The agents start turned off, and every pstack role runs on one of them. A model change applies to the agents spawned after it.
3. Pick Poteto mode in the composer's workflow selector, and start a real task with a goal and a check that can pass or fail.
4. When an agent or the workflow goes missing or out of line with the plugin, or a program pstack needs is missing, ask Mixdog to follow [`harness/INSTALL.md`](../../../harness/INSTALL.md) again.

Installing changes nothing until the user picks Poteto mode or selects a `$pstack-<name>` skill. The plugin's [README](../../../README.md) has the details. Offer to word their first prompt with them, per [`references/prompting.md`](references/prompting.md).

If cost is the worry, say where the tokens go and how to spend fewer. pstack spends extra tokens on subagents and review panels. Pick cheaper models for the pstack agents in Mixdog's agent settings. Each panel has two seats, one on `pstack-code` and one on `pstack-verify`. Save Poteto mode for work that needs rigor.

## Start a task in Poteto mode

`/poteto-mode` matches the task to a playbook, copies the playbook's steps into the todo list, and runs the other skills as the steps need them. A step it skips stays in the list as `skip: <reason>`. A good prompt states the goal and how to tell it's done. It doesn't list skills, because a hand-written sequence tends to drop or reorder steps the playbook would keep. Read [`references/prompting.md`](references/prompting.md) before you help word one.
Poteto mode is a Mixdog workflow. The user picks it in the composer's workflow selector, and every task in that conversation runs under `/poteto-mode`. A pstack skill they name there, such as `/how`, runs in place of it for that task. Outside Poteto mode, only the `$pstack-<name>` skills run, each for the task it was selected for and that task's follow-ups.

Mid-chat, "new task" makes the mode match a fresh playbook. `/poteto-mode` already uses `poteto-agent` for the subagents its playbook steps spawn. To get the same style from a subagent of your own, spawn it on `pstack-code`, or on `pstack-hard` for the hardest changes.

## Pick a skill

The default answer is `/poteto-mode`, which runs most of the others when its steps need them. Name a skill directly when the user wants more or less of something than the playbook gives. A skill written as `/<name>` runs only when typed in a Poteto mode conversation. A skill written as `$pstack-<name>` works in any conversation. Read the skill before you recommend it, and give one example prompt.

| The user wants to | Skill |
|---|---|
| Do any non-trivial task with rigor | [`/poteto-mode`](../poteto-mode/SKILL.md) |
| Check that the agent understood their goal and the problem before it starts | [`$pstack-in-your-own-words`](../in-your-own-words/SKILL.md) |
| Get a prompt rewritten deeper, not bigger, before sending it: what a top professional would add, their raw material and methods, and an outside check. It returns the prompt and doesn't do the task | [`$pstack-sharpen`](../sharpen/SKILL.md) |
| Know how code works now, or where new code should live | [`/how`](../how/SKILL.md) |
| Know why code is shaped this way, or where a number came from | [`/why`](../why/SKILL.md) |
| Understand a change or subsystem, explained plainly | [`$pstack-teach`](../teach/SKILL.md) |
| Catch up on their own recent work on a topic | [`$pstack-recall`](../recall/SKILL.md) |
| Catch up on what changed in this chat since their last message, in plain words and small visuals, with every item waiting on them listed and decidable from the reply alone | [`/ketchup`](../ketchup/SKILL.md) |
| Catch up like `/ketchup`, in a short subtitled video of slides, with the waiting calls as text under it | [`$pstack-ketchup-video`](../ketchup-video/SKILL.md) |
| Know what a small diff could break outside itself | [`$pstack-blast-radius`](../blast-radius/SKILL.md) |
| Settle types and module shape before code that crosses a function boundary | [`/architect`](../architect/SKILL.md) |
| Get several attempts at one brief, merged into the best one | [`/arena`](../arena/SKILL.md) |
| Run parallel checks over slices, or race workers, each in its own worktree | [`/swarm`](../swarm/SKILL.md) |
| Have two reviewers, on `pstack-code` and `pstack-verify`, review a diff and try to break it | [`/interrogate`](../interrogate/SKILL.md) |
| Fix a bug test-first when a cheap local test exists | [`/tdd`](../tdd/SKILL.md) |
| Apply TypeScript rules to `.ts` or `.tsx` work | [`$pstack-typescript-best-practices`](../typescript-best-practices/SKILL.md) |
| Strip comments before review, using a reviewer that didn't write them | [`/no-comments`](../no-comments/SKILL.md) |
| Clean AI tells out of prose | [`$pstack-unslop`](../unslop/SKILL.md) |
| Write docs, an RFC, a README, a PR description, or a commit message to a standard | [`/technical-writing`](../technical-writing/SKILL.md) |
| Hear the last reply again in plain words | [`$pstack-bro`](../bro/SKILL.md) |
| Give agents a scripted way to drive the app and prove behavior | [`$pstack-create-verification-skill`](../create-verification-skill/SKILL.md) |
| Bring a verification skill and its feature map back in line with the app | [`$pstack-maintain-verification-skill`](../maintain-verification-skill/SKILL.md) |
| Formally verify a race, invariant, or other property that tests rarely reach | [`$pstack-create-formal-verification-skill`](../create-formal-verification-skill/SKILL.md) |
| Bring a formal verification back in line after the code it covers changed, and learn whether a failure is drift or a bug | [`$pstack-maintain-formal-verification-skill`](../maintain-formal-verification-skill/SKILL.md) |
| Show a PM or designer what the user sees as a chart checked by a TLA+ model, with the shortest path to each state that breaks a rule | [`$pstack-statechart`](../statechart/SKILL.md) |
| Vet a performance number before reporting or acting on it | [`/benchmark-checklist`](../benchmark-checklist/SKILL.md) |
| Run a large or cross-cutting change, or one to review after stepping away | [`/figure-it-out`](../figure-it-out/SKILL.md) |
| Keep a decision log during a run, and review it afterward | [`/show-me-your-work`](../show-me-your-work/SKILL.md) |
| Bring the five pstack agents and the Poteto mode workflow back in line with the plugin | Follow [`harness/INSTALL.md`](../../../harness/INSTALL.md) again |
| Turn their own working habits into a personal mode skill | [`$pstack-automate-me`](../automate-me/SKILL.md) |
| Turn what a finished task taught into skill edits | [`/reflect`](../reflect/SKILL.md) |
| Stop agents from repeating the same mistakes in this repo | [`$pstack-correct`](../correct/SKILL.md) |
| Find their way around pstack | `$pstack-poteto-help` |

If a skill directory next to this one is missing from the table, read its frontmatter and route by its description. The `principle-*` directories are covered under principles below.

Close calls:

- `/how` explains what the code does. `/why` explains the reasons. `$pstack-teach` runs one or both and explains the result plainly.
- `/arena` gives every worker the same brief and merges the best parts. `/swarm` splits work into slices or a race and returns one report.
- `/architect` implements right after it settles the design. Add "with checkpoint" to review the design before it writes code.
- `/interrogate` reviews the diff. `$pstack-blast-radius` looks for breakage outside the diff and proves the one fact that makes the change safe.
- `$pstack-recall` rebuilds context across recent chats. `/ketchup` covers only this chat since the user's last message. Resuming one specific chat or branch is the Session pickup playbook.
- `/figure-it-out` designs one rigorous run. The Orchestrate playbook runs a program that spans days and many PRs. The Autonomous run playbook drives one task to a finish condition.

Not in pstack:

- Code cleanup is Mixdog's `code-tidy` skill. Driving a web UI is its `browser-use` skill, and driving a desktop app is its `computer-use` skill.
- Running until a check passes is Mixdog's `goal` tool, and writing a skill is its `skill-creator` skill.
- pstack has no orchestrate skill. Orchestrate is a `/poteto-mode` playbook. If the skill list shows an orchestrate skill, another plugin provides it.

## Playbooks and principles

Playbooks are step lists inside `/poteto-mode`, not skills, so they have no slash command. Inside `/poteto-mode`, describing the task picks one, and these phrases name one directly:

- "babysit this pr" or "check on pr 123" runs Babysit. It drives the PR to merge-ready and stops there. It doesn't merge unless the user asks to merge, land, or ship.
- "land the stack" runs Shipping.
- "take over this branch" runs Session pickup.
- "pause safely" runs Pause safely.
- "full autopilot on this queue" runs Autopilot-full. "autopilot, don't merge" runs Autopilot-stack.
- "run the eval playbook" runs Eval.

The Playbooks section of [`poteto-mode`](../poteto-mode/SKILL.md) lists every playbook and when it applies.
pstack has no planning skill. For work that spans phases or stacked PRs, asking `/poteto-mode` for a plan runs the [Multi-phase plan playbook](../poteto-mode/playbooks/multi-phase-plan.md), which writes the plan and doesn't implement it. For a design question, the Prototype playbook or `/architect` settles it in code first.

Principles are one-rule skills that `/poteto-mode` reads and cites in its replies. The user rarely invokes one. They steer with the names instead, as in "apply prove it works. show me the real output." Principles have no `$pstack-<name>` skill, so naming one in a pstack task is how to apply it. The Principles section of [`poteto-mode`](../poteto-mode/SKILL.md) lists them.

## Fix a run that went wrong

| Symptom | Fix |
|---|---|
| The mode stopped applying after a few turns | The conversation isn't in Poteto mode. Pick Poteto mode in the composer's workflow selector. |
| A question got treated as the next step of the last task | Say "new task", or say the turn doesn't need the mode. |
| A new model choice had no effect | A pstack agent's model applies to the agents spawned after the change. Rerun the step that spawns it. |
| A spawn was refused | The pstack agent is missing or turned off. Ask Mixdog to follow `<root>/harness/INSTALL.md` again, then pick its model and turn it on in Mixdog's agent settings. |
| Runs cost more than expected | See the cost paragraph under Get set up. |
| A skill didn't load on its own | A `$pstack-<name>` skill loads when the user selects it, in any conversation, and it can run other pstack skills by path there. Typing `/<name>` works only in a Poteto mode conversation. `/poteto-mode` runs the skills its steps need, not every skill, and principles load only through the pstack skills that cite them. |
| Parallel agents overwrote each other | Give each agent its own worktree. |
| An overnight run moved but finished nothing | Its goal needs a check that can pass or fail, not a duration. |
| The reply claims success from a green build | Ask for the real command, flow, stored value, or profile. That's the prove-it-works principle. |

For a run that drifts, [`references/prompting.md`](references/prompting.md) has one-line steers. [`references/recipes.md`](references/recipes.md) has the recipes worth copying.

## Make pstack my own

- [`$pstack-automate-me`](../automate-me/SKILL.md) drafts a personal mode skill from the user's own history, to use alongside `/poteto-mode`.
- [`/reflect`](../reflect/SKILL.md) after a session turns its lessons into skill edits the user approves.
- `/poteto-mode write a skill for <workflow>` runs the authoring playbook. The eval playbook tests a skill change blind.
- Fix a misbehaving skill in its own PR, not inside the feature work where it went wrong.

## Reply

Lead with the answer. Give at most one example prompt in a code block, adapted from [`references/recipes.md`](references/recipes.md) when one fits, then the link to that file. Keep it short unless the user asked for the whole map.
