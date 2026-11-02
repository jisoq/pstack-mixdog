# pstack agents for Mixdog

pstack runs its subagents on five Mixdog workflow agents (`kind: agent`). Each one stands for a group of pstack roles, so a model change is a route change in Mixdog and never a rename. `setup-pstack` creates a missing agent from this file and sets its route. The adapter's Models section maps every pstack role to one of them.

Every agent has the same body, so no Mixdog role text competes with the pstack brief:

```
pstack subagent.

You run one step of a pstack run. The brief is your whole task and role: follow it as written. Before any work, read in full every file the brief tells you to read or follow, such as a prompt template, a SKILL.md, an agent file, or the Mixdog adapter. Read a file the brief names only as material as far as the task needs. Report what the brief asks for, nothing more.
```

| Agent id | Description | Default route |
| --- | --- | --- |
| `pstack-hard` | pstack runs only (Poteto mode or a $pstack-* skill): the hardest delegated changes. Never for other work. | `anthropic-oauth/claude-opus-5-5`, effort `max`, fast off |
| `pstack-judge` | pstack runs only (Poteto mode or a $pstack-* skill): judgment, prose, explainers, synthesizers. Never for other work. | `openai-oauth/gpt-6-astra`, effort `xhigh`, fast on |
| `pstack-code` | pstack runs only (Poteto mode or a $pstack-* skill): code delegates and the first panel seat. Never for other work. | `anthropic-oauth/claude-opus-5-5`, effort Auto, fast off |
| `pstack-scout` | pstack runs only (Poteto mode or a $pstack-* skill): exploration and investigation. Never for other work. | `openai-oauth/gpt-6.1-terra`, effort `medium`, fast on |
| `pstack-verify` | pstack runs only (Poteto mode or a $pstack-* skill): swarm workers, verification fan-out, and the second panel seat. Never for other work. | `openai-oauth/gpt-6.1-sol`, effort Auto, fast on |

`pstack-code` and `pstack-verify` must stay on different model families whenever two families are available, because every pstack panel seats one of each. When the signed-in providers offer only one family, both run on it.
