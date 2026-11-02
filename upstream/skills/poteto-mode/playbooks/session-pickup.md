### Session pickup

**You own the resume point. Read the prior trail, don't redo it.**

1. Locate the prior trail. A conversation of this Project, found yourself with the `recall` tool loaded through `load_tool` (`period: "last"` lists recent sessions and `query` finds the work by topic. Never read another Project's conversations, that crosses workspace boundaries and reads private chats from unrelated projects), or a pushed branch. When the trail is a conversation and `recall` is unavailable or reports that memory is off, stop and ask the user to turn on memory in Mixdog's settings, then run this playbook again. Read the session's summary entries first, then its decision points. Where the resume point hinges on an exact message, read its raw messages with `recall`, passing the entry's `id` and `includeRaw: true`. Where it hinges on what the prior agent ran, read, or hit, read just those items with `session` `read` on the session id `recall` gave, since `recall` drops tool calls. Keep the reduced timeline in the main thread (the **principle-guard-the-context-window** skill).
2. Reconstruct operational state. The branch and worktree, what already landed (`git log`, `git diff` against the base), the open todos, the decisions made. The prior trail is authoritative input. Resist the bias to re-derive it.
3. Diff done vs pending. Compare what shipped against what was planned, name the resume point, do not re-run the prior repro or redo completed work. A "let me verify from scratch" pass means you're treating the trail as untrustworthy when it's authoritative.
4. Route the remaining work to the matching playbook and pick the verdict: continue the execution, ship a finished recommendation, ratify or override a prior conclusion, or postmortem a failed run. The pickup playbook ends here. The routed playbook owns the rest.
5. Verify the inherited claims against the original goal on the real artifact (the **principle-prove-it-works** skill). A passing prior self-report is not the proof.

**Reply:** where the prior agent stopped, what you inherited vs redid (ideally nothing redone), the resume point, and the outcome.
