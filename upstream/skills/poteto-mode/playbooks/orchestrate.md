### Orchestrate

**You run the program. Decide which agent does each piece of work.** For a standing project handed to one coordinator chat: multi-day, many stacked PRs, dozens to hundreds of subagents, few human turns. One task driven to a predicate is Autonomous run. One ambitious run that needs a bespoke workflow is figure-it-out. Work that one agent could finish inside the session's budget is not a program.

Run it with your own tools. When the orchestration mode delegates, workers are `agent` spawns (`type: "spawn"`). Track the program with the `todo` and `goal` tools, and keep its state in a tracker, `notes.md`, in a new `~/.mixdog/data/pstack/orchestrate/<project-folder-name>-<HHmmss>/` folder. The Project store has no Mixdog form, so write `Skipped in Mixdog: Project store. Mixdog has none.` Watch each PR with a background command that exits on its event, such as `shell` with `background: true` running `gh pr checks <number> --watch`. Call no scripts, run no polling loops, and never relay messages or status between agents.

#### Topology

- **One owner per PR.** The owner is the only writer of its branch and carries the PR from build to merge. Only the owner pushes, rebases, or retargets it. Closing or retargeting a base PR orphans every PR above it, so the owner does that only on your call. Conflicted merges, chain rebases, and fixes go to owners.
- **A worker for each independent task.** Its kickoff carries everything it needs, including each upstream report it depends on, as a file. Pick a new folder, `<TEMP>/pstack/orchestrate-<HHmmss>`, where `<TEMP>` is the `TEMP` of `shell`. Each kickoff names its output file, `<folder>/<tag>.md`, and a kickoff that depends on a report lists those paths, never the report text. Workers can't see their siblings. Each worker runs on `pstack-code`, or `pstack-hard` for the hardest changes, in its own managed worktree. Create it with the `git` tool (`git worktree add -b <branch> <path> <base>`), spawn with `cwd` set to its path, and name the branch in the kickoff.
- **No sub-coordinators.** A spawned agent has no `agent` tool, so every worker reports to you.
- **Each PR gets a verification pass separate from its authoring,** on `pstack-verify` when delegated, never by the agent that wrote it. When the lead works alone, it runs that pass after the code is done, against the PR's acceptance criteria. The owner merges only on that pass at the current head.
- **Start with one unit.** Take it through kickoff, owner, verifier, and merge before you fan out, so a flaw in the kickoff costs one agent instead of fifty. On near-identical cheap units, the first unit is that test.

#### Supervision

- **Each unit names the evidence that proves the work is done,** such as a command and its expected output, a control-skill check, or an artifact. If you can't name the evidence, the unit isn't scoped yet.
- **Green CI is an input to a verdict, not a verdict.** Behavioral work needs more than a type check. A verdict covers one head SHA, so a new push needs a new verdict.
- **Send back work that drifts from scope or grows past what was asked.** Keep only the fixes that block the program, and park the rest as follow-ups.
- **Check a PR's live state before you report on it,** with `gh pr view` and `gh pr checks` or your forge's equivalents, not the worker's last report. Account for every worker you spawned as done, replaced, or absorbed into another worker's scope.
- **Stop or replace a worker that stalls or loops.** Judge it by its pushes and PR activity, not its status text. Retry by cause: a smaller scope after a context or memory limit, and the same kickoff after a dropped connection. After two retries, drop the unit and replan around it. When a stopped worker returns late, check its result against the PR's current state, and hand any unique findings to the unit's current worker.
- **Ask the user only for a real decision or a blocker,** such as an irreversible action, a product or preference call that no experiment settles, or a dead end that survived a replan. Rebase mechanics, retries, CI flakes, review triage, and "should I keep going" never reach the user.

**Reply:** what landed against the goal, each PR's live state and verdict with its link, what was dropped and why, and the decisions waiting on the user.
