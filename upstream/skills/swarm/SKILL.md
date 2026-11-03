---
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
---

# Swarm

## Start

Open a `todo` list with one item per phase, each named by its outcome, before launching anything. Use `append` when the list already has open items, and `init` otherwise.

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Workers run on `pstack-verify`. A race between models runs its arms on the two panel seats, one on `pstack-code` and one on `pstack-verify`. Name each arm's agent up front.
4. Give each worker its own writable output when it writes. When workers verify or measure commits, each brief names the exact SHAs. A measurement brief also names the method (sample count, what one sample is, order). The worker records both in its result.

## Phase B: Fan out

Run all N workers on the step 3 agent, each in its own managed worktree. Create it with the `git` tool (`git worktree add -b <branch> <path> <base>`), spawn with `cwd` set to the worktree path, and name the branch in the brief. Run a worker in the Project itself, without a worktree, only when it needs the user's working tree.

When a worker must start from a non-default branch, create its worktree from that branch.

Every brief stands alone with the goal, scope, and exact slice or race arm. Each finding is `PASS`, `ISSUES`, or `BLOCKED` with evidence. A slice with a provable defect is `ISSUES` and lists every issue it can prove, not only the first.

If a worker drops out, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results. Drop a result that does not record the SHAs and method its brief names, and rerun that worker once. After a second miss, record a gap. A gap does not count as a pass. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

## Phase D: Report

Return one consolidated in-chat report with a result table, issue one-liners, gaps or dropouts, and the race rule when used.
