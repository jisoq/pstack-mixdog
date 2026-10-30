# pstack agents for Mixdog

pstack runs its subagents on five Mixdog workflow agents (`kind: agent`). Each one stands for a group of pstack roles, so a model change is a route change in Mixdog and never a rename. `setup-pstack` creates a missing agent from this file and sets its route. The adapter's Models section maps every pstack role to one of them.

Every agent has the same body, so no Mixdog role text competes with the pstack brief:

```
pstack subagent.

You run one step of a pstack run. The brief is your whole task and role: follow it as written. Before any work, read in full every pstack file the brief names, such as a SKILL.md, an agent file, or the Mixdog adapter. Report what the brief asks for, nothing more.
```

| Agent id | Description | Default route |
| --- | --- | --- |
| `pstack-hard` | pstack runs only ($pstack or Poteto mode): the hardest delegated changes. Never for other work. | `anthropic-oauth/claude-opus-5-5`, effort `max`, fast off |
| `pstack-judge` | pstack runs only ($pstack or Poteto mode): judgment, prose, explainers, synthesizers, first panel seat. Never for other work. | `openai-oauth/gpt-6-astra`, effort `xhigh`, fast on |
| `pstack-code` | pstack runs only ($pstack or Poteto mode): code delegates and the second panel seat. Never for other work. | `anthropic-oauth/claude-opus-5-5`, effort Auto, fast off |
| `pstack-scout` | pstack runs only ($pstack or Poteto mode): exploration and investigation. Never for other work. | `openai-oauth/gpt-6.1-terra`, effort `medium`, fast on |
| `pstack-verify` | pstack runs only ($pstack or Poteto mode): swarm workers and verification fan-out. Never for other work. | `openai-oauth/gpt-6.1-sol`, effort Auto, fast on |

`pstack-judge` and `pstack-code` must stay on different model families, because every pstack panel seats one of each.
