---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
disable-model-invocation: true
---

# How

Explore the codebase to answer "how does X work?" questions. Produce architectural explanations at the level of a senior engineer onboarding onto a subsystem, enough to build a working mental model, not so much that it reads like annotated source code.

Explorers run on `pstack-scout`, and every explainer runs on `pstack-judge`. Each brief opens with "Read `<root>/upstream/skills/how/references/<template>` in full. Your prompt is the text below its first `---` line, or the whole file when it has none." and then gives each placeholder's value under its name.

## 1. Assess complexity

If the scope is ambiguous, state your interpretation and explore. The user can redirect.

- **Simple** (a single module, a small utility, a narrow question such as "how does function X work"): no explorers. Spawn one explainer that explores and explains in one pass, built from `references/explainer-prompt.md`. Its brief says no explorers ran, so it skips the Explorer Findings section and explores the code itself. Go to step 4.
- **Complex** (a subsystem spanning multiple files or services, a cross-cutting feature, a full architectural overview): go to step 2.

When in doubt, take the simple path.

## 2. Explore (complex only)

Decompose the question into 2 to 4 angles, each a distinct slice of the subsystem. Spawn one explorer per angle, each with `references/explorer-prompt.md` and its angle filled in.

Before spawning, pick a new folder, `<TEMP>/pstack/how-<HHmmss>`, where `<TEMP>` is the `TEMP` of `shell`. Each explorer brief names its output file, `<folder>/<tag>.md`.

## 3. Synthesize (complex only)

Once all explorers have returned, spawn one explainer with `references/explainer-prompt.md`. Its `{EXPLORER_FINDINGS_ALL}` holds "Read each file in full:" and every explorer's output path.

## 4. Present

Present the explainer's output. Light edits for clarity or context from the conversation are fine. Do not substantially rewrite it.

## Output format

The explanation uses the sections defined in `references/explainer-prompt.md`, dropping any that do not apply: Overview, Key Concepts, How It Works, Where Things Live, Gotchas.
