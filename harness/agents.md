# pstack agents for Mixdog

pstack runs its subagents on five Mixdog workflow agents (`kind: agent`). Each one stands for a group of pstack roles, so a model change is a route change in Mixdog and never a rename. `harness/INSTALL.md` creates a missing agent from this file, turned off and without a model, and keeps every agent's description and body equal to this file. The user picks each model and turns the agent on in Mixdog's agent settings; the Suggested route column is the author's setup. The Roles section of `harness/PORTING.md` maps every pstack role to one of them.

Every agent has the same body, so no Mixdog role text competes with the pstack brief:

```
pstack subagent.

You run one step of a pstack run. The brief is your task. Before any work, read in full every file the brief tells you to read or follow, such as a prompt template, a SKILL.md, or an agent file. Read a file the brief names only as material as far as the task needs. When the task is a code change, read `{{PLUGIN_ROOT}}/upstream/agents/poteto-agent.md` first and follow it. Change, stage, or commit files only when the task is a change. Otherwise the only file you write is an output file the brief names.
```

| Agent id | Description | Suggested route |
| --- | --- | --- |
| `pstack-hard` | pstack runs only (Poteto mode or a $pstack-* skill): the hardest delegated changes. Never for other work. | `anthropic-oauth/claude-opus-5-5`, effort `max`, fast off |
| `pstack-judge` | pstack runs only (Poteto mode or a $pstack-* skill): judgment, prose, explainers, synthesizers. Never for other work. | `openai-oauth/gpt-6-astra`, effort `xhigh`, fast on |
| `pstack-code` | pstack runs only (Poteto mode or a $pstack-* skill): code delegates and the first panel seat. Never for other work. | `anthropic-oauth/claude-opus-5-5`, effort Auto, fast off |
| `pstack-scout` | pstack runs only (Poteto mode or a $pstack-* skill): exploration and investigation. Never for other work. | `openai-oauth/gpt-6.1-terra`, effort `medium`, fast on |
| `pstack-verify` | pstack runs only (Poteto mode or a $pstack-* skill): swarm workers, verification fan-out, and the second panel seat. Never for other work. | `openai-oauth/gpt-6.1-sol`, effort Auto, fast on |
