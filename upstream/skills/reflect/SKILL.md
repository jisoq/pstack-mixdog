---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, write a digest of this conversation from your own context. For parts lost to compaction that the digest needs, read just those items with `session` `read` on this conversation's id from `session` `status`, which keeps the tool calls.

The digest keeps turn order, numbers the turns, and quotes the moments the reviewers will cite: the user's requests and corrections, the decisions, the skills and files you read by path, the tools you ran with their exact commands, the tickets, threads, and traces the conversation names, and the failures and retries. Pick a new folder, `<TEMP>/pstack/reflect-<HHmmss>`, where `<TEMP>` is the `TEMP` of `shell`, and write it to `<folder>/digest.md`. That file is the transcript path, and each brief says it is a digest.

## 2. Spawn three reviewers

Reviewers use the session's connectors to look up the tickets, chat threads, and observability traces the transcript references.

| Lens | Agent | Prompt template |
|---|---|---|
| Judgment | `pstack-judge` | `references/judgment-reviewer.md` |
| Tooling | `pstack-scout` | `references/tooling-reviewer.md` |
| Divergent | `pstack-judge` | `references/divergent-reviewer.md` |

Each brief opens with "Read `<root>/upstream/skills/reflect/references/<template>` in full. Your prompt is the whole file." and gives the transcript path or digest for the placeholder it marks. Each brief names its output file, `<folder>/<tag>.md`.

## 3. Synthesize

One synthesizer on `pstack-judge`. It spot-verifies citations through the session's connectors. Its brief opens with "Read `<root>/upstream/skills/reflect/references/synthesizer.md` in full. Your prompt is the whole file." Each reviewer's placeholder holds "Read each file in full:" and that reviewer's output path. It returns an Accepted / Rejected / Backlog list.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File each Backlog item to your team's devex or backlog tracker without waiting. Only the Accepted list waits for approval.

Never edit a skill under `<root>`. A pstack skill changes in the user's copy, `~/.mixdog/data/skills/pstack-custom-<skill>/`, which pstack runs read in place of the plugin's skill. Before approval, show that destination. After approval, when the copy does not exist yet, make it with the `skill-creator` skill: copy the skill folder, set its frontmatter `name` to `pstack-custom-<skill>`, drop `disable-model-invocation`, set `when_to_use` to `'Read by pstack runs in place of <skill>; never inferred from the task.'`, and write each link that leaves the folder as a `<root>/upstream/...` path. Then edit the copy. Never open a PR or push.

Follow each approved row's Routing exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to the `skill-creator` skill and run its draft / test / iterate loop.
- `tune when_to_use: <skill path>` (the skill exists but didn't trigger when it should have): hand to `skill-creator` and run its repair and evaluation steps on the skill's `when_to_use`, which is what activates a registered skill.
- `new skill via skill-creator: <kebab-name>`: hand creation to `skill-creator`. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
